import { z } from "zod";
import { Temporal } from "@js-temporal/polyfill";
import { CURRENCIES } from "./config";

const identifier = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[\w-]+$/);
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    try {
      return Temporal.PlainDate.from(v).toString() === v;
    } catch {
      return false;
    }
  }, "Choose a valid date.");
const clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const period = z
  .object({ start: clock, end: clock })
  .refine((v) => v.start < v.end, "Closing time must be after opening time.");
const day = z.object({
  day: z.number().int().min(0).max(6),
  periods: z.array(period).max(3),
  breaks: z.array(period).max(3),
});
export const appointmentConfigSchema = z
  .object({
    timezone: z
      .string()
      .max(100)
      .refine((v) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, "Choose a valid IANA time zone."),
    unavailableDates: z.array(dateSchema).max(366),
    services: z
      .array(
        z.object({
          id: identifier,
          name: z.string().trim().min(1).max(120),
          description: z.string().max(600),
          duration: z.number().int().min(5).max(480),
          buffer: z.number().int().min(0).max(240),
          price: z.number().int().min(0).max(10000000),
          currency: z.enum(CURRENCIES),
          providerIds: z.array(identifier).min(1).max(31),
          minNoticeHours: z.number().int().min(0).max(720).optional(),
          maxAdvanceDays: z.number().int().min(1).max(90).optional(),
          slotInterval: z
            .union([z.literal(15), z.literal(30), z.literal(60)])
            .optional(),
          active: z.boolean().optional(),
        }),
      )
      .max(30),
    providers: z
      .array(
        z.object({
          id: identifier,
          days: z.array(day).length(7),
          unavailableDates: z.array(dateSchema).max(366),
        }),
      )
      .max(31),
  })
  .superRefine((v, ctx) => {
    for (const list of [v.services, v.providers])
      if (new Set(list.map((x) => x.id)).size !== list.length)
        ctx.addIssue({
          code: "custom",
          message: "Duplicate appointment identifier.",
        });
    for (const p of v.providers) {
      if (new Set(p.days.map((d) => d.day)).size !== 7)
        ctx.addIssue({
          code: "custom",
          message: "Configure each weekday once.",
        });
      for (const d of p.days) {
        const sorted = [...d.periods].sort((a, b) =>
          a.start.localeCompare(b.start),
        );
        if (sorted.some((x, i) => i > 0 && x.start < sorted[i - 1].end))
          ctx.addIssue({
            code: "custom",
            message: "Working periods cannot overlap.",
          });
      }
    }
    for (const s of v.services)
      if (
        s.providerIds.some((id) => !v.providers.some((p) => p.id === id)) ||
        new Set(s.providerIds).size !== s.providerIds.length
      )
        ctx.addIssue({
          code: "custom",
          message: "Choose configured providers for every service.",
        });
  });
export type AppointmentConfig = z.infer<typeof appointmentConfigSchema>;
export type AppointmentService = AppointmentConfig["services"][number];
export type BookingChoice = {
  serviceId: string;
  providerId: string;
  start: string;
};
export const bookingChoiceSchema = z.object({
  serviceId: identifier,
  providerId: identifier,
  start: z.string().datetime(),
});
export type BusyInterval = { start: string; occupied_end: string };
export type Slot = {
  start: string;
  end: string;
  occupiedEnd: string;
  label: string;
};
export function defaultSchedule(
  id = "owner",
): AppointmentConfig["providers"][number] {
  return {
    id,
    unavailableDates: [],
    days: Array.from({ length: 7 }, (_, day) => ({
      day,
      periods: day > 0 && day < 6 ? [{ start: "09:00", end: "17:00" }] : [],
      breaks: [],
    })),
  };
}
export const defaultAppointments = (): AppointmentConfig => ({
  timezone: "UTC",
  services: [],
  providers: [defaultSchedule()],
  unavailableDates: [],
});
export function localDate(instant: string, timezone: string) {
  return Temporal.Instant.from(instant)
    .toZonedDateTimeISO(timezone)
    .toPlainDate()
    .toString();
}
export function formatAppointment(start: string, timezone: string) {
  return (
    new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(start)) + ` (${timezone})`
  );
}
// A repeated wall time yields two distinct instants; a DST gap yields none.
function instants(date: string, time: string, timezone: string): number[] {
  const plain = Temporal.PlainDateTime.from(`${date}T${time}`);
  return [
    ...new Set(
      (["earlier", "later"] as const).flatMap((disambiguation) => {
        const zoned = plain.toZonedDateTime(timezone, { disambiguation });
        return zoned.toPlainDateTime().equals(plain)
          ? [Number(zoned.epochMilliseconds)]
          : [];
      }),
    ),
  ].sort((a, b) => a - b);
}
export function availableSlots(
  config: AppointmentConfig,
  serviceId: string,
  providerId: string,
  date: string,
  busy: BusyInterval[],
  now = Date.now(),
  limit = Infinity,
): Slot[] {
  dateSchema.parse(date);
  const service = config.services.find((s) => s.id === serviceId);
  const provider = config.providers.find((p) => p.id === providerId);
  if (
    !service ||
    service.active === false ||
    !provider ||
    !service.providerIds.includes(providerId) ||
    config.unavailableDates.includes(date) ||
    provider.unavailableDates.includes(date)
  )
    return [];
  const weekday = Temporal.PlainDate.from(date).dayOfWeek % 7;
  const hours = provider.days.find((d) => d.day === weekday)!;
  const ranges = (periods: { start: string; end: string }[], isBreak = false) =>
    periods.flatMap((p) => {
      const boundary = (time: string, start: boolean) => {
        const matches = instants(date, time, config.timezone);
        if (matches.length)
          return start ? matches[0] : matches[matches.length - 1];
        // A boundary in a spring-forward gap must not silently remove a break.
        // Restrict opening hours and conservatively expand breaks across the gap.
        const disambiguation = start !== isBreak ? "later" : "earlier";
        return Number(
          Temporal.PlainDateTime.from(`${date}T${time}`).toZonedDateTime(
            config.timezone,
            { disambiguation },
          ).epochMilliseconds,
        );
      };
      const start = boundary(p.start, true),
        end = boundary(p.end, false);
      return end > start ? [{ start, end }] : [];
    });
  const working = ranges(hours.periods),
    breaks = ranges(hours.breaks, true);
  const occupied = busy.map((b) => ({
    start: Date.parse(b.start),
    end: Date.parse(b.occupied_end),
  }));
  const slots: Slot[] = [];
  for (let minute = 0; minute < 1440; minute += service.slotInterval ?? 15) {
    const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    if (!hours.periods.some((p) => time >= p.start && time < p.end)) continue;
    for (const start of instants(date, time, config.timezone)) {
      const end = start + service.duration * 60000,
        occupiedEnd = end + service.buffer * 60000;
      if (
        start <= now + (service.minNoticeHours ?? 0) * 3600000 ||
        !working.some((r) => start >= r.start && occupiedEnd <= r.end)
      )
        continue;
      if (
        [...breaks, ...occupied].some(
          (r) => start < r.end && occupiedEnd > r.start,
        )
      )
        continue;
      const zoned = Temporal.Instant.fromEpochMilliseconds(
        start,
      ).toZonedDateTimeISO(config.timezone);
      slots.push({
        start: new Date(start).toISOString(),
        end: new Date(end).toISOString(),
        occupiedEnd: new Date(occupiedEnd).toISOString(),
        label: `${time} (UTC${zoned.offset})`,
      });
      if (slots.length >= limit) return slots;
    }
  }
  return slots.sort((a, b) => a.start.localeCompare(b.start));
}
