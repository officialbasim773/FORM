import { appointmentsApi } from "@/lib/appointments-server";
import { publicBookingApi } from "@/lib/booking-server";
import {
  invitation,
  teamApi,
  checkRouting,
  routeSubmission,
} from "@/lib/team-server";
import { z } from "zod";
import {
  db,
  bucket,
  owner,
  business,
  workspaces,
  hash,
  limited,
  body,
  readLimited,
  json,
  csrf,
  HttpError,
} from "@/lib/server";
import {
  businessSchema,
  draftSchema,
  calculateItems,
  validateAnswers,
  formatMessage,
  Business,
  Receipt,
  FormRecord,
  Draft,
} from "@/lib/model";
import { PLANS } from "@/lib/config";
import { template } from "@/lib/templates";
export const dynamic = "force-dynamic";
const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();
const decodeForm = (f: any) => ({
  ...f,
  draft: JSON.parse(f.draft),
  published: f.published ? JSON.parse(f.published) : null,
});
async function ownedForm(id: string, b: Business) {
  const f = await db()
    .prepare("SELECT * FROM forms WHERE id=? AND business_id=? AND deleted=0")
    .bind(id, b.id)
    .first<any>();
  if (!f) throw new HttpError(404, "Form not found.");
  return f;
}
async function checkImages(b: Business, paths: string[]) {
  for (const path of new Set(paths.filter(Boolean))) {
    const ok = await db()
      .prepare("SELECT id FROM uploads WHERE id=? AND business_id=?")
      .bind(path.split("/").pop(), b.id)
      .first();
    if (!ok)
      throw new HttpError(400, "Please upload an image to this business.");
  }
}
async function handle(req: Request) {
  const url = new URL(req.url);
  const p = url.pathname.replace(/^\/api\//, "").split("/");
  const method = req.method;
  if (method !== "GET") csrf(req);
  if (p[0] === "images" && method === "GET") {
    const u = await db()
      .prepare("SELECT mime FROM uploads WHERE id=?")
      .bind(p[1])
      .first<{ mime: string }>();
    if (!u) throw new HttpError(404, "Image not found.");
    const o = await bucket().get(p[1]);
    if (!o) throw new HttpError(404, "Image not found.");
    return new Response(o.body, {
      headers: {
        "Content-Type": u.mime,
        "Cache-Control": "public,max-age=86400",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  }
  if (p[0] === "booking") return publicBookingApi(req, p.slice(1));
  if (p[0] === "public") return publicApi(req, p.slice(1));
  if (p[0] === "invitations") return invitation(req, p[1] || "");
  const user = await owner();
  if (p[0] === "me" && method === "GET") {
    const list = await workspaces();
    let current: Business | null = null;
    if (list.length) {
      try {
        current = await business(req);
      } catch {
        current = list[0];
      }
    }
    return json({
      user,
      business: current,
      workspaces: list.map((x) => ({ id: x.id, name: x.name, role: x.role })),
      plans: PLANS,
    });
  }
  if (p[0] === "workspace" && method === "POST") {
    const x = z.object({ id: z.string() }).parse(await body(req));
    const list = await workspaces();
    if (!list.some((b) => b.id === x.id))
      throw new HttpError(403, "Workspace access denied.");
    return Response.json(
      { ok: true },
      {
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": `formchat_workspace=${x.id}; Path=/; HttpOnly; SameSite=Lax${url.protocol === "https:" ? "; Secure" : ""}`,
        },
      },
    );
  }

  if (p[0] === "business" && method === "POST") {
    const input = businessSchema.parse(await body(req));
    const existing = await db()
      .prepare("SELECT * FROM businesses WHERE owner=?")
      .bind(user.userId)
      .first<Business>();
    if (existing) return json(existing);
    if (input.accent !== "#176650" || input.button !== "#176650")
      throw new HttpError(403, "Custom colours are included in Business.");
    if (input.logo)
      throw new HttpError(400, "Create your business before uploading a logo.");
    const b = {
      ...input,
      id: uuid(),
      owner: user.userId,
      email: user.email,
      plan: "free",
      onboarded: 0,
    };
    await db()
      .prepare(
        "INSERT INTO businesses(id,owner,email,name,phone,logo,accent,button) VALUES(?,?,?,?,?,?,?,?)",
      )
      .bind(b.id, b.owner, b.email, b.name, b.phone, b.logo, b.accent, b.button)
      .run();
    return json(b, 201);
  }
  const b = await business(req);
  if (p[0] === "team") return teamApi(req, b, p[1]);
  if (b.role === "member" && !(p[0] === "responses" && method === "GET"))
    throw new HttpError(
      403,
      "Only the owner can manage forms and business settings.",
    );
  if (p[0] === "appointments") return appointmentsApi(req, b, p.slice(1));
  const plan = PLANS[b.plan];
  if (p[0] === "business" && method === "PATCH") {
    const input = businessSchema
      .extend({
        onboarded: z
          .union([z.boolean(), z.literal(0), z.literal(1)])
          .optional(),
      })
      .parse(await body(req));
    await checkImages(b, [input.logo]);
    if (
      !plan.branding &&
      (input.accent !== b.accent || input.button !== b.button)
    )
      throw new HttpError(403, "Custom colours are included in Business.");
    await db()
      .prepare(
        "UPDATE businesses SET name=?,phone=?,logo=?,accent=?,button=?,onboarded=? WHERE id=?",
      )
      .bind(
        input.name,
        input.phone,
        input.logo,
        input.accent,
        input.button,
        input.onboarded ? 1 : b.onboarded,
        b.id,
      )
      .run();
    return json({
      ...b,
      ...input,
      onboarded: input.onboarded ? 1 : b.onboarded,
    });
  }
  if (p[0] === "business" && method === "DELETE") {
    const list = await db()
      .prepare("SELECT id FROM uploads WHERE business_id=?")
      .bind(b.id)
      .all<{ id: string }>();
    await db().batch([
      db().prepare("DELETE FROM bookings WHERE business_id=?").bind(b.id),
      db().prepare("DELETE FROM appointment_customers WHERE business_id=?").bind(b.id),
      db()
        .prepare("DELETE FROM appointment_settings WHERE business_id=?")
        .bind(b.id),
      db().prepare("DELETE FROM events WHERE business_id=?").bind(b.id),
      db().prepare("DELETE FROM usage WHERE business_id=?").bind(b.id),
      db().prepare("DELETE FROM submissions WHERE business_id=?").bind(b.id),
      db()
        .prepare(
          "DELETE FROM versions WHERE form_id IN (SELECT id FROM forms WHERE business_id=?)",
        )
        .bind(b.id),
      db()
        .prepare(
          "DELETE FROM routing_counters WHERE form_id IN (SELECT id FROM forms WHERE business_id=?)",
        )
        .bind(b.id),
      db().prepare("DELETE FROM members WHERE business_id=?").bind(b.id),
      db().prepare("DELETE FROM forms WHERE business_id=?").bind(b.id),
      db().prepare("DELETE FROM uploads WHERE business_id=?").bind(b.id),
      db().prepare("DELETE FROM businesses WHERE id=?").bind(b.id),
    ]);
    if (list.results.length)
      await bucket().delete(list.results.map((u) => u.id));
    return json({ ok: true });
  }
  if (p[0] === "upload" && method === "POST") {
    await limited(`upload:${b.id}`, 15, 3600);
    const count = await db()
      .prepare("SELECT count(*) n FROM uploads WHERE business_id=?")
      .bind(b.id)
      .first<{ n: number }>();
    if ((count?.n || 0) >= 100)
      throw new HttpError(400, "This workspace has reached its image limit.");
    if (Number(req.headers.get("content-length")) > 2100000)
      throw new HttpError(413, "Choose an image under 2 MB.");
    const bytes = await readLimited(req, 2000000);
    if (bytes.length > 2000000 || bytes.length < 24)
      throw new HttpError(400, "Choose a PNG, JPEG or WebP under 2 MB.");
    const hex = [...bytes.slice(0, 12)]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    const mime = hex.startsWith("89504e470d0a1a0a")
      ? "image/png"
      : hex.startsWith("ffd8ff")
        ? "image/jpeg"
        : hex.startsWith("52494646") && hex.slice(16) === "57454250"
          ? "image/webp"
          : null;
    if (!mime)
      throw new HttpError(400, "Only PNG, JPEG and WebP images are supported.");
    const id = uuid();
    await bucket().put(id, bytes, { httpMetadata: { contentType: mime } });
    try {
      await db()
        .prepare(
          "INSERT INTO uploads(id,business_id,mime,size) VALUES(?,?,?,?)",
        )
        .bind(id, b.id, mime, bytes.length)
        .run();
    } catch (e) {
      await bucket().delete(id);
      throw e;
    }
    return json({ url: `/api/images/${id}` });
  }
  if (p[0] === "forms") {
    if (p.length === 1 && method === "GET") {
      const rows = await db()
        .prepare(
          "SELECT f.*,(SELECT count(*) FROM submissions s WHERE s.form_id=f.id) submissions FROM forms f WHERE business_id=? AND deleted=0 ORDER BY updated_at DESC",
        )
        .bind(b.id)
        .all();
      const usage = await db()
        .prepare(
          "SELECT COALESCE((SELECT count FROM usage WHERE business_id=? AND month=?),0) n",
        )
        .bind(b.id, now().slice(0, 7))
        .first<{ n: number }>();
      return json({
        forms: rows.results.map(decodeForm),
        usage: usage?.n || 0,
      });
    }
    if (p.length === 1 && method === "POST") {
      const input = z
        .object({
          template: z.string(),
          type: z.enum(["service", "product"]),
          experience: z
            .enum(["classic", "multipage", "interactive"])
            .optional(),
        })
        .parse(await body(req));
      const count = await db()
        .prepare(
          "SELECT count(*) n FROM forms WHERE business_id=? AND deleted=0",
        )
        .bind(b.id)
        .first<{ n: number }>();
      if ((count?.n || 0) >= 100)
        throw new HttpError(400, "A workspace can contain up to 100 forms.");
      const draft = template(input.template, input.type);
      draft.experience = input.experience;
      if (input.experience === "multipage") {
        draft.pages = [
          { id: "basics", title: "Your details" },
          { id: "request", title: "Your request" },
        ];
        draft.questions = draft.questions.map((q, i) => ({
          ...q,
          pageId: i < 2 ? "basics" : "request",
        }));
      }
      draft.accent = b.accent;
      draft.button = b.button;
      const f = {
        id: uuid(),
        slug: uuid().replaceAll("-", "").slice(0, 16),
        draft,
        status: "draft",
        version: 0,
        revision: 0,
        updated_at: now(),
        submissions: 0,
        published: null,
      };
      await db()
        .prepare(
          "INSERT INTO forms(id,business_id,slug,draft,status,updated_at) VALUES(?,?,?,?,?,?)",
        )
        .bind(f.id, b.id, f.slug, JSON.stringify(draft), f.status, f.updated_at)
        .run();
      return json(f, 201);
    }
    const f = await ownedForm(p[1], b);
    if (p.length === 2 && method === "GET") return json(decodeForm(f));
    if (p.length === 2 && method === "PATCH") {
      const input = z
        .object({ draft: draftSchema, revision: z.number().int().min(0) })
        .parse(await body(req));
      await checkRouting(input.draft, b.id);
      const old = JSON.parse(f.draft);
      if (
        !plan.branding &&
        (input.draft.accent !== old.accent ||
          input.draft.button !== old.button ||
          input.draft.hideLogo !== old.hideLogo)
      )
        throw new HttpError(403, "Branding controls are included in Business.");
      await checkImages(b, [
        ...input.draft.products.map((x) => x.image),
        input.draft.interactive?.media?.src || "",
        ...input.draft.questions.flatMap((q) => [
          q.media?.src || "",
          ...Object.values(q.optionImages || {}),
        ]),
      ]);
      const result = await db()
        .prepare(
          "UPDATE forms SET draft=?,revision=revision+1,updated_at=? WHERE id=? AND business_id=? AND revision=?",
        )
        .bind(JSON.stringify(input.draft), now(), f.id, b.id, input.revision)
        .run();
      if (!result.meta.changes)
        throw new HttpError(
          409,
          "This form changed in another tab. Reload before making more edits. Your current draft remains on this screen.",
        );
      return json(decodeForm(await ownedForm(f.id, b)));
    }
    if (p.length === 2 && method === "DELETE") {
      await db()
        .prepare(
          "UPDATE forms SET deleted=1,status='draft',updated_at=? WHERE id=? AND business_id=?",
        )
        .bind(now(), f.id, b.id)
        .run();
      return json({ ok: true });
    }
    if (p[2] === "duplicate" && method === "POST") {
      const count = await db()
        .prepare(
          "SELECT count(*) n FROM forms WHERE business_id=? AND deleted=0",
        )
        .bind(b.id)
        .first<{ n: number }>();
      if ((count?.n || 0) >= 100)
        throw new HttpError(400, "A workspace can contain up to 100 forms.");
      const d = JSON.parse(f.draft);
      d.title = `${d.title.slice(0, 112)} (copy)`;
      const id = uuid();
      await db()
        .prepare(
          "INSERT INTO forms(id,business_id,slug,draft,updated_at) VALUES(?,?,?,?,?)",
        )
        .bind(
          id,
          b.id,
          uuid().replaceAll("-", "").slice(0, 16),
          JSON.stringify(d),
          now(),
        )
        .run();
      return json(decodeForm(await ownedForm(id, b)), 201);
    }
    if (p[2] === "publish" && method === "POST") {
      const draft = draftSchema.parse(JSON.parse(f.draft));
      await checkRouting(draft, b.id);
      if (draft.type === "product" && !plan.products)
        throw new HttpError(
          403,
          "Publishing product forms requires Business. Payment is not connected yet.",
        );
      if (draft.type === "product" && !draft.products.some((p) => !p.hidden))
        throw new HttpError(400, "Add at least one visible product.");
      businessSchema.parse(b);
      const input = z
        .object({ revision: z.number().int() })
        .parse(await body(req));
      const condition =
        "id=? AND business_id=? AND revision=? AND deleted=0 AND (status='published' OR (SELECT count(*) FROM forms WHERE business_id=? AND status='published' AND deleted=0)<?)";
      const args = [f.id, b.id, input.revision, b.id, plan.publishedForms];
      const stamp = now();
      const result = await db().batch([
        db()
          .prepare(
            `INSERT INTO versions(id,form_id,version,snapshot,created_at) SELECT ?,id,version+1,draft,? FROM forms WHERE ${condition}`,
          )
          .bind(uuid(), stamp, ...args),
        db()
          .prepare(
            `UPDATE forms SET published=draft,status='published',version=version+1,updated_at=? WHERE ${condition}`,
          )
          .bind(stamp, ...args),
      ]);
      if (!result[1].meta.changes)
        throw new HttpError(
          409,
          "Could not publish. Check your saved version and published form limit.",
        );
      const latest = await ownedForm(f.id, b);
      await db()
        .prepare("UPDATE businesses SET onboarded=1 WHERE id=?")
        .bind(b.id)
        .run();
      return json(decodeForm(latest));
    }
    if (p[2] === "status" && method === "POST") {
      const input = z
        .object({ status: z.enum(["paused", "draft"]) })
        .parse(await body(req));
      await db()
        .prepare(
          "UPDATE forms SET status=?,updated_at=? WHERE id=? AND business_id=?",
        )
        .bind(input.status, now(), f.id, b.id)
        .run();
      return json(decodeForm(await ownedForm(f.id, b)));
    }
  }
  if (p[0] === "responses") {
    if (p[1] && method === "PATCH") {
      const x = z
        .object({
          assignedTo: z.string().nullable().optional(),
          status: z.enum(["new", "contacted", "completed"]).optional(),
          notes: z.string().max(10000).optional(),
        })
        .strict()
        .refine((v) => Object.keys(v).length > 0, "Choose a field to update.")
        .parse(await body(req));
      if (x.assignedTo) {
        const member = await db()
          .prepare(
            "SELECT id FROM members WHERE id=? AND business_id=? AND status='active'",
          )
          .bind(x.assignedTo, b.id)
          .first();
        if (!member) throw new HttpError(400, "Choose an active team member.");
      }
      const fields: string[] = [];
      const values: (string | null)[] = [];
      if (x.assignedTo !== undefined) {
        fields.push("assigned_to=?");
        values.push(x.assignedTo);
      }
      if (x.status !== undefined) {
        fields.push("workflow_status=?");
        values.push(x.status);
      }
      if (x.notes !== undefined) {
        fields.push("internal_notes=?");
        values.push(x.notes);
      }
      const result = await db()
        .prepare(
          `UPDATE submissions SET ${fields.join(",")} WHERE id=? AND business_id=?`,
        )
        .bind(...values, p[1], b.id)
        .run();
      if (!result.meta.changes) throw new HttpError(404, "Response not found.");
      return json({ ok: true });
    }
    if (method !== "GET" && method !== "DELETE")
      throw new HttpError(405, "Method not allowed.");
    if (p[1] && method === "DELETE") {
      await db()
        .prepare("DELETE FROM submissions WHERE id=? AND business_id=?")
        .bind(p[1], b.id)
        .run();
      return json({ ok: true });
    }
    const filters = ["s.business_id=?"];
    const args: any[] = [b.id];
    if (b.role === "member") {
      filters.push("s.assigned_to=?");
      args.push(b.memberId);
    }
    const assigned = url.searchParams.get("assigned");
    if (assigned === "owner") filters.push("s.assigned_to IS NULL");
    else if (assigned) {
      filters.push("s.assigned_to=?");
      args.push(assigned);
    }
    for (const [param, sql] of [
      ["form", "s.form_id=?"],
      ["from", "s.created_at>=?"],
      ["to", "s.created_at<?"],
    ] as const) {
      let v = url.searchParams.get(param);
      if (v) {
        if (param === "to") {
          const d = new Date(v);
          if (isNaN(+d)) throw new HttpError(400, "Invalid date filter.");
          d.setUTCDate(d.getUTCDate() + 1);
          v = d.toISOString();
        }
        filters.push(sql);
        args.push(v);
      }
    }
    const search = url.searchParams.get("search");
    if (search) {
      filters.push(
        "(s.customer LIKE ? OR s.summary LIKE ? OR s.receipt LIKE ? OR s.internal_notes LIKE ?)",
      );
      args.push(...Array(4).fill(`%${search.slice(0, 200)}%`));
    }
    const workflow = url.searchParams.get("status");
    if (workflow) {
      z.enum(["new", "contacted", "completed"]).parse(workflow);
      filters.push("s.workflow_status=?");
      args.push(workflow);
    }
    const handoff = url.searchParams.get("handoff");
    if (handoff === "yes") filters.push("s.handoff_at IS NOT NULL");
    if (handoff === "no") filters.push("s.handoff_at IS NULL");
    const rows = await db()
      .prepare(
        `SELECT s.*,f.deleted form_deleted,m.name assigned_name,m.status assigned_status,bk.id booking_id,bk.start booking_start,bk.timezone booking_timezone,bk.status booking_status FROM submissions s JOIN forms f ON s.form_id=f.id LEFT JOIN members m ON m.id=s.assigned_to LEFT JOIN bookings bk ON bk.submission_id=s.id WHERE ${filters.join(" AND ")} ORDER BY s.created_at DESC LIMIT 5000`,
      )
      .bind(...args)
      .all<any>();
    if (p[1] === "export") {
      if (!plan.csv)
        throw new HttpError(403, "CSV export is included in Business.");
      const cell = (v: unknown) =>
        '"' +
        String(v ?? "")
          .replace(/^[\s]*[=+@-]/, (m) => "'" + m)
          .replaceAll('"', '""') +
        '"';
      const lines = [
        [
          "Reference",
          "Form",
          "Type",
          "Customer",
          "Submitted at",
          "Estimated total (minor units)",
          "Currency",
          "WhatsApp handoff clicked at",
          "Answers",
          "Products",
          "Status",
          "Internal notes",
        ],
        ...rows.results.map((r) => {
          const x = JSON.parse(r.receipt);
          return [
            r.id,
            x.formTitle,
            x.formType,
            r.customer,
            r.created_at,
            r.total,
            x.currency,
            r.handoff_at || "",
            JSON.stringify(x.answers),
            JSON.stringify(x.items),
            r.workflow_status,
            r.internal_notes,
          ];
        }),
      ];
      return new Response(
        "\uFEFF" + lines.map((l) => l.map(cell).join(",")).join("\r\n"),
        {
          headers: {
            "Content-Type": "text/csv;charset=utf-8",
            "Content-Disposition":
              'attachment; filename="formchat-responses.csv"',
            "Cache-Control": "no-store",
          },
        },
      );
    }
    return json({
      responses: rows.results.map(
        ({ token_hash, payload_hash, idempotency, ...r }) => ({
          ...r,
          receipt: JSON.parse(r.receipt),
          snapshot: JSON.parse(r.snapshot),
        }),
      ),
    });
  }
  if (p[0] === "analytics" && method === "GET") {
    if (!plan.analytics)
      throw new HttpError(403, "Detailed analytics are included in Business.");
    const from = now().slice(0, 10);
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 29);
    const args = [b.id, start.toISOString().slice(0, 10)];
    const filter = url.searchParams.get("form");
    const extra = filter ? " AND form_id=?" : "";
    if (filter) args.push(filter);
    const ev = await db()
      .prepare(
        `SELECT kind,count(DISTINCT form_id || ':' || visitor) n FROM events WHERE business_id=? AND created_at>=?${extra} GROUP BY kind`,
      )
      .bind(...args)
      .all<any>();
    const sub = await db()
      .prepare(
        `SELECT count(*) n,sum(CASE WHEN handoff_at IS NOT NULL THEN 1 ELSE 0 END) handoffs FROM submissions WHERE business_id=? AND created_at>=?${extra}`,
      )
      .bind(...args)
      .first<any>();
    const trend = await db()
      .prepare(
        `SELECT substr(created_at,1,10) day,count(*) n FROM submissions WHERE business_id=? AND created_at>=?${extra} GROUP BY day`,
      )
      .bind(...args)
      .all<any>();
    const eventTrend = await db()
      .prepare(
        `SELECT substr(created_at,1,10) day,kind,count(*) n FROM events WHERE business_id=? AND created_at>=?${extra} GROUP BY day,kind`,
      )
      .bind(...args)
      .all();
    const top = await db()
      .prepare(
        "SELECT f.id,f.draft,f.deleted,count(s.id) n FROM forms f LEFT JOIN submissions s ON f.id=s.form_id AND s.created_at>=? WHERE f.business_id=? GROUP BY f.id ORDER BY n DESC LIMIT 5",
      )
      .bind(args[1], b.id)
      .all<any>();
    return json({
      events: Object.fromEntries(ev.results.map((e) => [e.kind, e.n])),
      submissions: sub?.n || 0,
      handoffs: sub?.handoffs || 0,
      trend: trend.results,
      eventTrend: eventTrend.results,
      top: top.results.map((t) => ({
        id: t.id,
        title: JSON.parse(t.draft).title,
        n: t.n,
        deleted: t.deleted,
      })),
      from: args[1],
      to: from,
    });
  }
  throw new HttpError(404, "Not found.");
}
async function publicApi(req: Request, p: string[]) {
  const f = await db()
    .prepare(
      "SELECT f.*,b.name,b.phone,b.logo,b.plan,b.id tenant FROM forms f JOIN businesses b ON f.business_id=b.id WHERE f.slug=?",
    )
    .bind(p[0])
    .first<any>();
  if (
    !f ||
    ((f.deleted || f.status !== "published" || !f.published) &&
      p[1] !== "handoff")
  )
    throw new HttpError(
      404,
      "This form is not accepting requests right now. Please contact the business directly.",
    );
  const draft: Draft = JSON.parse(f.published);
  if (["appointments", "slots"].includes(p[1]))
    throw new HttpError(404, "Use the separate appointment booking page.");
  if (req.method === "GET")
    return json({
      form: { ...draft, routing: undefined, appointment: undefined },
      business: { name: f.name, logo: f.logo },
      version: f.version,
    });
  const ip = req.headers.get("cf-connecting-ip") || "local";
  const ipKey = (await hash(ip)).slice(0, 32);
  await limited(`public:${ipKey}`, 60, 60);
  const input = await body(req);
  if (p[1] === "event") {
    const e = z
      .object({ kind: z.enum(["view", "start"]), visitor: z.string().uuid() })
      .parse(input);
    await db()
      .prepare(
        "INSERT OR IGNORE INTO events(id,business_id,form_id,visitor,kind,created_at,day) VALUES(?,?,?,?,?,?,?)",
      )
      .bind(
        uuid(),
        f.tenant,
        f.id,
        e.visitor,
        e.kind,
        now(),
        now().slice(0, 10),
      )
      .run();
    return json({ ok: true });
  }
  if (p[1] === "handoff") {
    const e = z
      .object({ id: z.string().uuid(), token: z.string().uuid() })
      .parse(input);
    const r = await db()
      .prepare(
        "UPDATE submissions SET handoff_at=COALESCE(handoff_at,?) WHERE id=? AND form_id=? AND token_hash=?",
      )
      .bind(now(), e.id, f.id, await hash(e.token))
      .run();
    if (!r.meta.changes) throw new HttpError(404, "Response not found.");
    return json({ ok: true });
  }
  if (p[1] === "submit") {
    const x = z
      .object({
        appointment: z.never().optional(),
        version: z.number().int(),
        idempotency: z.string().uuid(),
        token: z.string().uuid(),
        visitor: z.string().uuid(),
        website: z.string().max(200).default(""),
        startedAt: z.number(),
        answers: z.record(
          z.string(),
          z.union([z.string().max(4000), z.array(z.string().max(100)).max(30)]),
        ),
        selections: z
          .array(
            z.object({
              productId: z.string(),
              quantity: z.number().int(),
              options: z.record(z.string(), z.string().max(500)),
              note: z.string().max(1000).optional(),
            }),
          )
          .max(40),
      })
      .parse(input);
    if (x.website || Date.now() - x.startedAt < 1200)
      throw new HttpError(400, "Please review your answers and try again.");
    const payloadHash = await hash(
      JSON.stringify({
        answers: x.answers,
        selections: x.selections,
        version: x.version,
      }),
    );
    const old = await db()
      .prepare(
        "SELECT receipt,payload_hash,token_hash FROM submissions WHERE form_id=? AND idempotency=?",
      )
      .bind(f.id, x.idempotency)
      .first<any>();
    if (old) {
      if (
        old.payload_hash !== payloadHash ||
        old.token_hash !== (await hash(x.token))
      )
        throw new HttpError(
          409,
          "This submission reference has already been used.",
        );
      return json({ ...JSON.parse(old.receipt), token: x.token });
    }
    await limited(`submit:${ipKey}:${f.id}`, 12, 3600);
    if (x.version !== f.version)
      throw new HttpError(
        409,
        "The business updated this form. Reload to review the changes. Your answers are kept on this device.",
      );
    const answers = validateAnswers(draft, x.answers);
    const items =
      draft.type === "product" ? calculateItems(draft, x.selections) : [];
    if (draft.type === "product" && !items.length)
      throw new HttpError(400, "Choose at least one product.");
    const assigned = await routeSubmission(draft, x.answers, f.tenant, f.id);
    const receiptBase = {
      id: uuid(),
      formTitle: draft.title,
      formType: draft.type,
      businessName: f.name,
      phone: assigned?.phone || f.phone,
      currency: draft.currency,
      answers,
      items,
      total: items.reduce((n, i) => n + i.total, 0),
      createdAt: now(),
    };
    const receipt = { ...receiptBase, message: formatMessage(receiptBase) };
    const customer = String(
      answers.find((a) => /name/i.test(a.label))?.value || "Customer",
    );
    const summary = items.length
      ? items.map((i) => `${i.quantity} × ${i.name}`).join(", ")
      : answers
          .filter((a) => a.value.length)
          .slice(2, 4)
          .map((a) => (Array.isArray(a.value) ? a.value.join(", ") : a.value))
          .join(" · ");
    const submissionStatement = db()
      .prepare(
        `INSERT OR IGNORE INTO submissions(id,business_id,form_id,version,snapshot,receipt,idempotency,payload_hash,token_hash,customer,summary,total,created_at,assigned_to) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE COALESCE((SELECT count FROM usage WHERE business_id=? AND month=?),0)<? AND EXISTS(SELECT 1 FROM forms WHERE id=? AND version=? AND status='published' AND deleted=0)`,
      )
      .bind(
        receipt.id,
        f.tenant,
        f.id,
        f.version,
        f.published,
        JSON.stringify(receipt),
        x.idempotency,
        payloadHash,
        await hash(x.token),
        customer.slice(0, 180),
        summary.slice(0, 500),
        receipt.total,
        receipt.createdAt,
        assigned?.id || null,
        f.tenant,
        now().slice(0, 7),
        PLANS[f.plan as keyof typeof PLANS].submissions,
        f.id,
        f.version,
      );
    const result = await submissionStatement.run();
    if (!result.meta.changes) {
      const saved = await db()
        .prepare(
          "SELECT receipt,payload_hash,token_hash FROM submissions WHERE form_id=? AND idempotency=?",
        )
        .bind(f.id, x.idempotency)
        .first<any>();
      if (
        saved &&
        saved.payload_hash === payloadHash &&
        saved.token_hash === (await hash(x.token))
      )
        return json({ ...JSON.parse(saved.receipt), token: x.token });
      throw new HttpError(
        429,
        "This business has reached its monthly response limit. Please contact them directly.",
      );
    }
    return json({ ...receipt, token: x.token }, 201);
  }
  throw new HttpError(404, "Not found.");
}
async function route(req: Request) {
  try {
    return await handle(req);
  } catch (e) {
    if (e instanceof z.ZodError)
      return json({ error: e.issues.map((x) => x.message).join(" ") }, 400);
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    if (
      e instanceof Error &&
      /required|Choose|Enter|Check|Invalid|too long|no longer|items|product|quantity/i.test(
        e.message,
      )
    )
      return json({ error: e.message }, 400);
    console.error("FormChat request failed", e);
    return json(
      {
        error:
          "Something went wrong. Your input has been kept. Please try again.",
      },
      500,
    );
  }
}
export { route as GET, route as POST, route as PATCH, route as DELETE };
