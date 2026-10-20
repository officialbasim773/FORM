import { z } from "zod";
import {
  appointmentConfigSchema,
  availableSlots,
  bookingChoiceSchema,
  dateSchema,
  defaultAppointments,
  localDate,
  type AppointmentConfig,
  type BookingChoice,
} from "./appointments";
import { body, db, HttpError, json } from "./server";
import type { Business, Draft } from "./model";

export async function appointmentSettings(businessId: string) {
  const row = await db()
    .prepare("SELECT * FROM appointment_settings WHERE business_id=?")
    .bind(businessId)
    .first<any>();
  return {
    enabled: !!row?.enabled,
    revision: row?.revision ?? -1,
    config: row
      ? appointmentConfigSchema.parse(JSON.parse(row.config))
      : defaultAppointments(),
  };
}
export async function appointmentTeam(businessId: string) {
  const team = await db()
    .prepare(
      "SELECT id,name,phone FROM members WHERE business_id=? AND status='active'",
    )
    .bind(businessId)
    .all<{ id: string; name: string; phone: string }>();
  return [{ id: "owner", name: "Business owner", phone: "" }, ...team.results];
}
export async function publicAppointmentOptions(businessId: string) {
  const settings = await appointmentSettings(businessId);
  if (!settings.enabled)
    throw new HttpError(409, "Appointment booking is currently paused.");
  const team = await appointmentTeam(businessId);
  return {
    timezone: settings.config.timezone,
    services: settings.config.services
      .filter((s) => s.active !== false)
      .map((s) => ({
        ...s,
        providerIds: s.providerIds.filter((id) =>
          team.some((p) => p.id === id),
        ),
      })),
    providers: team.map(({ id, name }) => ({ id, name })),
    today: localDate(new Date().toISOString(), settings.config.timezone),
  };
}
function validateDate(date: string, timezone: string) {
  dateSchema.parse(date);
  const today = localDate(new Date().toISOString(), timezone);
  const delta = (Date.parse(date) - Date.parse(today)) / 86400000;
  if (delta < 0 || delta > 90)
    throw new HttpError(400, "Choose a date within the next 90 days.");
}
export async function slotsFor(
  businessId: string,
  serviceId: string,
  providerId: string,
  date: string,
  exclude?: string,
) {
  const settings = await appointmentSettings(businessId);
  if (!settings.enabled)
    throw new HttpError(409, "Appointment booking is currently paused.");
  validateDate(date, settings.config.timezone);
  const team = await appointmentTeam(businessId);
  if (!team.some((p) => p.id === providerId))
    throw new HttpError(400, "Choose an active provider.");
  if (
    !settings.config.services.some(
      (s) => s.id === serviceId && s.providerIds.includes(providerId),
    )
  )
    throw new HttpError(400, "Choose a provider for this service.");
  const service = settings.config.services.find((s) => s.id === serviceId)!;
  if (service.active === false)
    throw new HttpError(409, "This service is not currently bookable.");
  if (
    Date.parse(date) -
      Date.parse(
        localDate(new Date().toISOString(), settings.config.timezone),
      ) >
    (service.maxAdvanceDays ?? 90) * 86400000
  )
    throw new HttpError(400, "This date is beyond the service booking window.");
  const day = Date.parse(date),
    from = new Date(day - 86400000).toISOString(),
    to = new Date(day + 2 * 86400000).toISOString();
  const busy = await db()
    .prepare(
      "SELECT start,occupied_end FROM bookings WHERE business_id=? AND provider_id=? AND status NOT IN ('cancelled','declined') AND start<? AND occupied_end>? AND id<>?",
    )
    .bind(businessId, providerId, to, from, exclude || "")
    .all<{ start: string; occupied_end: string }>();
  return {
    settings,
    slots: availableSlots(
      settings.config,
      serviceId,
      providerId,
      date,
      busy.results,
    ),
    provider: team.find((p) => p.id === providerId)!,
  };
}
export async function prepareBooking(
  businessId: string,
  choice: BookingChoice,
  exclude?: string,
) {
  const settings = await appointmentSettings(businessId);
  const date = localDate(choice.start, settings.config.timezone);
  const result = await slotsFor(
    businessId,
    choice.serviceId,
    choice.providerId,
    date,
    exclude,
  );
  const slot = result.slots.find(
    (s) => s.start === new Date(choice.start).toISOString(),
  );
  if (!slot)
    throw new HttpError(
      409,
      "That time is no longer available. Please choose another slot.",
    );
  return {
    ...result,
    slot,
    service: result.settings.config.services.find(
      (s) => s.id === choice.serviceId,
    )!,
  };
}
export function appointmentError(error: unknown): never {
  if (
    error instanceof Error &&
    /APPOINTMENT_(CONFLICT|SETTINGS_CHANGED|PROVIDER_UNAVAILABLE)/.test(
      error.message,
    )
  )
    throw new HttpError(
      409,
      "Availability changed. Refresh the slots and try again.",
    );
  throw error;
}
export async function appointmentsApi(
  req: Request,
  business: Business,
  path: string[],
) {
  if (business.role === "member")
    throw new HttpError(403, "Only the owner can manage appointments.");
  if (path[0] === "customers")
    return (await import("./appointment-customers")).customerApi(
      req,
      business,
      path.slice(1),
    );
  if (path[0] === "bookings" && !path[1] && req.method === "POST")
    return (await import("./booking-server")).publicBookingApi(
      req,
      [business.id, "confirm"],
      true,
    );
  if (path[0] === "bookings" && path[1] && req.method === "GET") {
    const row = await db()
      .prepare(
        "SELECT id,customer_id,status,service_id,provider_id,start,end,timezone,revision,details,created_at,updated_at FROM bookings WHERE id=? AND business_id=?",
      )
      .bind(path[1], business.id)
      .first<any>();
    if (!row) throw new HttpError(404, "Booking not found.");
    const activity = await db()
      .prepare(
        "SELECT action,start,end,provider_id,created_at FROM appointment_activity WHERE booking_id=? AND business_id=? ORDER BY id DESC",
      )
      .bind(row.id, business.id)
      .all();
    return json({
      booking: { ...row, details: JSON.parse(row.details) },
      activity: activity.results,
    });
  }
  if (path[0] === "settings") {
    if (req.method === "GET")
      return json({
        ...(await appointmentSettings(business.id)),
        team: await appointmentTeam(business.id),
        bookingPath: `/book/${business.id}`,
      });
    if (req.method !== "PATCH") throw new HttpError(405, "Method not allowed.");
    const input = z
      .object({
        enabled: z.boolean(),
        revision: z.number().int().min(-1),
        config: appointmentConfigSchema,
      })
      .strict()
      .parse(await body(req));
    const team = await appointmentTeam(business.id);
    if (input.config.providers.some((p) => !team.some((t) => t.id === p.id)))
      throw new HttpError(
        400,
        "Schedules must belong to the owner or active team members.",
      );
    const result =
      input.revision === -1
        ? await db()
            .prepare(
              "INSERT OR IGNORE INTO appointment_settings(business_id,enabled,revision,config) VALUES(?,?,0,?)",
            )
            .bind(business.id, +input.enabled, JSON.stringify(input.config))
            .run()
        : await db()
            .prepare(
              "UPDATE appointment_settings SET enabled=?,config=?,revision=revision+1 WHERE business_id=? AND revision=?",
            )
            .bind(
              +input.enabled,
              JSON.stringify(input.config),
              business.id,
              input.revision,
            )
            .run();
    if (!result.meta.changes)
      throw new HttpError(
        409,
        "Appointment settings changed. Reload before saving.",
      );
    return json({
      ...(await appointmentSettings(business.id)),
      team,
      bookingPath: `/book/${business.id}`,
    });
  }
  if (path[0] === "slots" && req.method === "GET") {
    const q = new URL(req.url).searchParams;
    if (q.get("exclude")) {
      const existing = await db()
        .prepare("SELECT id FROM bookings WHERE id=? AND business_id=?")
        .bind(q.get("exclude"), business.id)
        .first();
      if (!existing) throw new HttpError(404, "Booking not found.");
    }
    const result = await slotsFor(
      business.id,
      q.get("service") || "",
      q.get("provider") || "",
      q.get("date") || "",
      q.get("exclude") || undefined,
    );
    return json({
      slots: result.slots,
      timezone: result.settings.config.timezone,
    });
  }
  if (path[0] === "bookings" && req.method === "GET") {
    const q = new URL(req.url).searchParams;
    if (q.get("status") === "pending") {
      const rows = await db()
        .prepare(
          "SELECT id,customer_id,service_id,provider_id,start,end,timezone,status,revision,details,created_at FROM bookings WHERE business_id=? AND status='pending' ORDER BY created_at LIMIT 501",
        )
        .bind(business.id)
        .all<any>();
      if (rows.results.length > 500)
        throw new HttpError(
          400,
          "More than 500 pending requests. Review older requests using the bookings date filter.",
        );
      return json({
        bookings: rows.results.map((r) => ({
          ...r,
          details: JSON.parse(r.details),
        })),
      });
    }
    const from = dateSchema.parse(q.get("from")),
      to = dateSchema.parse(q.get("to"));
    if (to < from || Date.parse(to) - Date.parse(from) > 93 * 86400000)
      throw new HttpError(400, "Choose a range of up to 93 days.");
    const zone = (await appointmentSettings(business.id)).config.timezone;
    const result = await db()
      .prepare(
        "SELECT id,customer_id,business_id,form_id,submission_id,service_id,provider_id,start,end,occupied_end,timezone,status,revision,details,created_at,updated_at FROM bookings WHERE business_id=? AND start>=? AND start<? ORDER BY start LIMIT 501",
      )
      .bind(
        business.id,
        new Date(Date.parse(from) - 86400000).toISOString(),
        new Date(Date.parse(to) + 2 * 86400000).toISOString(),
      )
      .all<any>();
    if (result.results.length > 500)
      throw new HttpError(400, "Choose a smaller date range.");
    return json({
      bookings: result.results
        .filter((r) => {
          const d = localDate(r.start, zone);
          return d >= from && d <= to;
        })
        .map((r) => ({ ...r, details: JSON.parse(r.details) })),
      timezone: zone,
    });
  }
  if (path[0] === "bookings" && path[1] && req.method === "PATCH") {
    const booking = await db()
      .prepare("SELECT * FROM bookings WHERE id=? AND business_id=?")
      .bind(path[1], business.id)
      .first<any>();
    if (!booking) throw new HttpError(404, "Booking not found.");
    const x = z
      .object({
        revision: z.number().int().min(0),
        status: z
          .enum(["confirmed", "declined", "cancelled", "completed", "no_show"])
          .optional(),
        appointment: bookingChoiceSchema.optional(),
      })
      .strict()
      .refine(
        (x) => !!x.status !== !!x.appointment,
        "Choose one booking action.",
      )
      .parse(await body(req));
    if (!["pending", "confirmed"].includes(booking.status))
      throw new HttpError(409, "This appointment is closed.");
    const allowed =
      booking.status === "pending"
        ? ["confirmed", "declined", "cancelled"]
        : ["cancelled", "completed", "no_show"];
    if (x.status && !allowed.includes(x.status))
      throw new HttpError(409, "This status transition is not allowed.");
    let result;
    try {
      if (x.appointment) {
        if (x.appointment.serviceId !== booking.service_id)
          throw new HttpError(400, "Reschedule the original service.");
        const next = await prepareBooking(
          business.id,
          x.appointment,
          booking.id,
        );
        result = await db()
          .prepare(
            "UPDATE bookings SET provider_id=?,start=?,end=?,occupied_end=?,timezone=?,schedule_revision=?,details=?,revision=revision+1,updated_at=? WHERE id=? AND business_id=? AND revision=? AND status IN ('pending','confirmed')",
          )
          .bind(
            x.appointment.providerId,
            next.slot.start,
            next.slot.end,
            next.slot.occupiedEnd,
            next.settings.config.timezone,
            next.settings.revision,
            JSON.stringify({
              ...JSON.parse(booking.details),
              providerName: next.provider.name,
            }),
            new Date().toISOString(),
            booking.id,
            business.id,
            x.revision,
          )
          .run();
      } else {
        result = await db()
          .prepare(
            "UPDATE bookings SET status=?,revision=revision+1,updated_at=? WHERE id=? AND business_id=? AND revision=? AND status IN ('pending','confirmed')",
          )
          .bind(
            x.status!,
            new Date().toISOString(),
            booking.id,
            business.id,
            x.revision,
          )
          .run();
      }
    } catch (e) {
      appointmentError(e);
    }
    if (!result.meta.changes)
      throw new HttpError(409, "This booking changed. Reload and try again.");
    return json({ ok: true });
  }
  throw new HttpError(404, "Not found.");
}
