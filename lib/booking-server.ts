import { z } from "zod";
import { body, db, hash, HttpError, json, limited } from "./server";
import {
  bookingChoiceSchema,
  dateSchema,
  availableSlots,
  formatAppointment,
  localDate,
} from "./appointments";
import {
  appointmentSettings,
  appointmentTeam,
  publicAppointmentOptions,
  prepareBooking,
  slotsFor,
  appointmentError,
} from "./appointments-server";
import { money } from "./model";

const customerSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254),
    phone: z
      .string()
      .trim()
      .regex(
        /^\+[1-9]\d{7,14}$/,
        "Enter a phone number with country code, such as +971501234567.",
      ),
    notes: z.string().trim().max(2000).default(""),
  })
  .strict();
const confirmationSchema = z
  .object({
    appointment: bookingChoiceSchema,
    customer: customerSchema,
    idempotency: z.string().uuid(),
    token: z.string().uuid(),
    website: z.string().max(200).default(""),
    startedAt: z.number().finite(),
  })
  .strict();

export async function publicBookingApi(
  req: Request,
  path: string[],
  ownerCreate = false,
) {
  const business = await db()
    .prepare(
      "SELECT id,name,phone,logo,accent,button FROM businesses WHERE id=?",
    )
    .bind(path[0] || "")
    .first<any>();
  if (!business) throw new HttpError(404, "This booking page is unavailable.");
  if (req.method === "POST" && path[1] === "status") {
    const x = z
      .object({ id: z.string().uuid(), token: z.string().uuid() })
      .strict()
      .parse(await body(req));
    const row = await db()
      .prepare(
        "SELECT id,status,start,end,timezone,details,confirmation FROM bookings WHERE id=? AND business_id=? AND token_hash=?",
      )
      .bind(x.id, business.id, await hash(x.token))
      .first<any>();
    if (!row) throw new HttpError(404, "Booking not found.");
    const details = JSON.parse(row.details);
    return json({
      ...JSON.parse(row.confirmation),
      status: row.status,
      start: row.start,
      end: row.end,
      timezone: row.timezone,
      providerName: details.providerName,
    });
  }
  if (req.method === "GET" && !path[1])
    return json({
      ...(await publicAppointmentOptions(business.id)),
      business: {
        name: business.name,
        logo: business.logo,
        accent: business.accent,
        button: business.button,
      },
    });
  const q = new URL(req.url).searchParams;
  if (req.method === "GET" && path[1] === "slots") {
    const result = await slotsFor(
      business.id,
      q.get("service") || "",
      q.get("provider") || "",
      q.get("date") || "",
    );
    return json({
      slots: result.slots,
      timezone: result.settings.config.timezone,
    });
  }
  if (req.method === "GET" && path[1] === "dates") {
    const settings = await appointmentSettings(business.id);
    if (!settings.enabled)
      throw new HttpError(409, "Appointment booking is currently paused.");
    const from = dateSchema.parse(q.get("from")),
      to = dateSchema.parse(q.get("to"));
    if (to < from || Date.parse(to) - Date.parse(from) > 31 * 86400000)
      throw new HttpError(400, "Choose up to one month of availability.");
    const service = q.get("service") || "",
      provider = q.get("provider") || "";
    if (
      !settings.config.services.some(
        (s) => s.id === service && s.providerIds.includes(provider),
      ) ||
      !(await appointmentTeam(business.id)).some((p) => p.id === provider)
    )
      throw new HttpError(400, "Choose an available service and team member.");
    const busy = await db()
      .prepare(
        "SELECT start,occupied_end FROM bookings WHERE business_id=? AND provider_id=? AND status NOT IN ('cancelled','declined') AND start<? AND occupied_end>?",
      )
      .bind(
        business.id,
        provider,
        new Date(Date.parse(to) + 2 * 86400000).toISOString(),
        new Date(Date.parse(from) - 86400000).toISOString(),
      )
      .all<{ start: string; occupied_end: string }>();
    const today = localDate(new Date().toISOString(), settings.config.timezone),
      dates: string[] = [];
    for (
      let time = Date.parse(from);
      time <= Date.parse(to);
      time += 86400000
    ) {
      const date = new Date(time).toISOString().slice(0, 10);
      if (
        date < today ||
        time - Date.parse(today) >
          (settings.config.services.find((s) => s.id === service)
            ?.maxAdvanceDays ?? 90) *
            86400000
      )
        continue;
      if (
        availableSlots(
          settings.config,
          service,
          provider,
          date,
          busy.results,
          Date.now(),
          1,
        ).length
      )
        dates.push(date);
    }
    return json({ dates, timezone: settings.config.timezone });
  }
  if (req.method === "POST" && path[1] === "confirm") {
    const x = confirmationSchema.parse(await body(req));
    if (!ownerCreate && (x.website || Date.now() - x.startedAt < 1200))
      throw new HttpError(400, "Please review your booking and try again.");
    const payloadHash = await hash(
        JSON.stringify({ appointment: x.appointment, customer: x.customer }),
      ),
      tokenHash = await hash(x.token);
    const previous = async () => {
      const row = await db()
        .prepare(
          "SELECT payload_hash,token_hash,confirmation FROM bookings WHERE business_id=? AND idempotency=?",
        )
        .bind(business.id, x.idempotency)
        .first<any>();
      if (!row) return null;
      if (row.payload_hash !== payloadHash || row.token_hash !== tokenHash)
        throw new HttpError(
          409,
          "This booking reference has already been used. Retry the original request.",
        );
      return JSON.parse(row.confirmation);
    };
    const existing = await previous();
    if (existing) return json(existing);
    if (!ownerCreate)
      await limited(
        `booking:${business.id}:${(await hash(req.headers.get("cf-connecting-ip") || "local")).slice(0, 32)}`,
        20,
        3600,
      );
    try {
      const next = await prepareBooking(business.id, x.appointment),
        id = crypto.randomUUID(),
        stamp = new Date().toISOString();
      const confirmation = {
        id,
        status: ownerCreate ? "confirmed" : "pending",
        source: ownerCreate ? "owner" : "online",
        start: next.slot.start,
        end: next.slot.end,
        timezone: next.settings.config.timezone,
        serviceName: next.service.name,
        providerName: next.provider.name,
        price: next.service.price,
        currency: next.service.currency,
        customer: x.customer,
        businessName: business.name,
        phone: business.phone,
        createdAt: stamp,
      };
      const message = [
        `Hello ${business.name},`,
        ownerCreate
          ? `Appointment confirmed by the business.`
          : `Appointment request saved. Awaiting business approval.`,
        `Booking reference: ${id}`,
        `Service: ${next.service.name}`,
        `With: ${next.provider.name}`,
        `When: ${formatAppointment(next.slot.start, next.settings.config.timezone)}`,
        `Starting price: ${money(next.service.price, next.service.currency)}`,
        `Name: ${x.customer.name}`,
        `Email: ${x.customer.email}`,
        `Phone: ${x.customer.phone}`,
        ...(x.customer.notes ? [`Notes: ${x.customer.notes}`] : []),
        "No payment has been collected.",
      ].join("\n");
      const saved = { ...confirmation, message };
      await db()
        .prepare(
          "INSERT INTO bookings(id,business_id,service_id,provider_id,start,end,occupied_end,timezone,status,schedule_revision,details,created_at,updated_at,idempotency,payload_hash,token_hash,confirmation) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          id,
          business.id,
          next.service.id,
          next.provider.id,
          next.slot.start,
          next.slot.end,
          next.slot.occupiedEnd,
          next.settings.config.timezone,
          ownerCreate ? "confirmed" : "pending",
          next.settings.revision,
          JSON.stringify({
            ...confirmation,
            customer: x.customer.name,
            email: x.customer.email,
            customerPhone: x.customer.phone,
            notes: x.customer.notes,
          }),
          stamp,
          stamp,
          x.idempotency,
          payloadHash,
          tokenHash,
          JSON.stringify(saved),
        )
        .run();
      return json(saved, 201);
    } catch (e) {
      // A concurrent retry may have committed between the initial lookup and the
      // overlap trigger. Return that original confirmation, never a second row.
      const saved = await previous();
      if (saved) return json(saved);
      appointmentError(e);
    }
  }
  throw new HttpError(404, "Not found.");
}
