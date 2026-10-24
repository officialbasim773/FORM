import type { AppointmentCustomer, StoredBooking } from "./records";
import { z } from "zod";
import { body, db, HttpError, json } from "./server";
import type { Business } from "./model";

const customer = z.object({
  name: z.string().trim().min(1).max(120),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((x) => x.toLowerCase()),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  notes: z.string().max(5000).default(""),
  archived: z.boolean().default(false),
});
export async function customerApi(req: Request, b: Business, path: string[]) {
  if (b.role === "member")
    throw new HttpError(403, "Only the owner can manage customers.");
  if (!path[0] && req.method === "GET") {
    const q = new URL(req.url).searchParams,
      search = (q.get("search") || "").slice(0, 120),
      archived = q.get("archived") === "true" ? 1 : 0;
    const result = await db()
      .prepare(
        "SELECT c.*, (SELECT count(*) FROM bookings b WHERE b.customer_id=c.id AND b.business_id=c.business_id) booking_count FROM appointment_customers c WHERE c.business_id=? AND c.archived=? AND (instr(lower(c.name),lower(?))>0 OR instr(lower(c.email),lower(?))>0 OR instr(c.phone,?)>0) ORDER BY c.name LIMIT 501",
      )
      .bind(b.id, archived, search, search, search)
      .all();
    return json({
      customers: result.results.slice(0, 500),
      truncated: result.results.length > 500,
    });
  }
  if (!path[0] && req.method === "POST") {
    const x = customer.strict().parse(await body(req)),
      id = crypto.randomUUID(),
      now = new Date().toISOString();
    try {
      await db()
        .prepare(
          "INSERT INTO appointment_customers(id,business_id,name,email,phone,notes,archived,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          id,
          b.id,
          x.name,
          x.email,
          x.phone,
          x.notes,
          x.archived ? 1 : 0,
          now,
          now,
        )
        .run();
    } catch (e) {
      if (String(e).includes("UNIQUE"))
        throw new HttpError(409, "This customer already exists.");
      throw e;
    }
    return json({ id }, 201);
  }
  const row = await db()
    .prepare("SELECT * FROM appointment_customers WHERE id=? AND business_id=?")
    .bind(path[0] || "", b.id)
    .first<AppointmentCustomer>();
  if (!row) throw new HttpError(404, "Customer not found.");
  if (req.method === "GET") {
    const bookings = await db()
      .prepare(
        "SELECT id,status,start,end,timezone,details,revision FROM bookings WHERE business_id=? AND customer_id=? ORDER BY start DESC LIMIT 500",
      )
      .bind(b.id, row.id)
      .all<StoredBooking>();
    return json({
      customer: row,
      bookings: bookings.results.map((x) => ({
        ...x,
        details: JSON.parse(x.details),
      })),
    });
  }
  if (req.method === "PATCH") {
    const x = customer
      .extend({ revision: z.number().int().min(0) })
      .strict()
      .parse(await body(req));
    let r;
    try {
      r = await db()
        .prepare(
          "UPDATE appointment_customers SET name=?,email=?,phone=?,notes=?,archived=?,revision=revision+1,updated_at=? WHERE id=? AND business_id=? AND revision=?",
        )
        .bind(
          x.name,
          x.email,
          x.phone,
          x.notes,
          x.archived ? 1 : 0,
          new Date().toISOString(),
          row.id,
          b.id,
          x.revision,
        )
        .run();
    } catch (e) {
      if (String(e).includes("UNIQUE"))
        throw new HttpError(409, "Another customer has these contact details.");
      throw e;
    }
    if (!r.meta.changes)
      throw new HttpError(409, "This customer changed. Reload before saving.");
    return json({ ok: true });
  }
  throw new HttpError(405, "Method not allowed.");
}
