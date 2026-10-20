import { z } from "zod";
import { body, db, hash, HttpError, json, limited, owner } from "./server";
import {
  Answers,
  Business,
  Draft,
  TeamMember,
  matchesCondition,
  visibleQuestions,
} from "./model";
const memberInput = z.object({
  name: z.string().trim().min(1).max(100),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((s) => s.toLowerCase()),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, "Use an international WhatsApp number."),
});
export async function invitation(req: Request, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token))
    throw new HttpError(404, "Invitation not found.");
  const m = await db()
    .prepare(
      "SELECT m.*,b.name business_name,b.owner FROM members m JOIN businesses b ON b.id=m.business_id WHERE invite_hash=? AND status='invited' AND expires_at>?",
    )
    .bind(await hash(token), new Date().toISOString())
    .first<any>();
  if (!m)
    throw new HttpError(
      404,
      "This invitation has expired or was revoked. Ask the owner for a new link.",
    );
  if (req.method === "GET")
    return json({ businessName: m.business_name, name: m.name });
  if (req.method !== "POST") throw new HttpError(405, "Method not allowed.");
  const user = await owner();
  if (user.email.toLowerCase() !== m.email)
    throw new HttpError(
      403,
      "Sign in with the email address this invitation was sent to.",
    );
  if (user.userId === m.owner)
    throw new HttpError(400, "You already own this workspace.");
  const result = await db()
    .prepare(
      "UPDATE members SET user_id=?,status='active',invite_hash=NULL WHERE id=? AND status='invited' AND invite_hash=? AND expires_at>?",
    )
    .bind(user.userId, m.id, await hash(token), new Date().toISOString())
    .run();
  if (!result.meta.changes)
    throw new HttpError(409, "Invitation already used or expired.");
  return Response.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": `formchat_workspace=${m.business_id}; Path=/; HttpOnly; SameSite=Lax${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`,
      },
    },
  );
}
export async function teamApi(req: Request, b: Business, id?: string) {
  if (b.role === "member")
    throw new HttpError(403, "Only the owner can manage the team.");
  if (req.method === "GET") {
    const rows = await db()
      .prepare(
        "SELECT id,name,email,phone,status,expires_at FROM members WHERE business_id=? AND status<>'revoked' ORDER BY created_at",
      )
      .bind(b.id)
      .all<TeamMember>();
    return json({ members: rows.results });
  }
  if (req.method === "DELETE" && id) {
    await db()
      .prepare(
        "UPDATE members SET status='revoked',user_id=NULL,invite_hash=NULL WHERE id=? AND business_id=?",
      )
      .bind(id, b.id)
      .run();
    return json({ ok: true });
  }
  if (req.method === "POST") {
    await limited(`team:${b.id}`, 30, 3600);
    const x = memberInput.parse(await body(req));
    if (x.email === b.email.toLowerCase())
      throw new HttpError(400, "The owner already has access.");
    const count = await db()
      .prepare(
        "SELECT count(*) n FROM members WHERE business_id=? AND status<>'revoked'",
      )
      .bind(b.id)
      .first<{ n: number }>();
    if ((count?.n || 0) >= 30)
      throw new HttpError(400, "A workspace supports up to 30 members.");
    const existing = await db()
      .prepare("SELECT status FROM members WHERE business_id=? AND email=?")
      .bind(b.id, x.email)
      .first<any>();
    if (existing?.status === "active")
      throw new HttpError(409, "This person is already a member.");
    const token =
      crypto.randomUUID().replaceAll("-", "") +
      crypto.randomUUID().replaceAll("-", "");
    const stamp = new Date().toISOString();
    await db()
      .prepare(
        `INSERT INTO members(id,business_id,name,email,phone,status,invite_hash,expires_at,created_at) VALUES(?,?,?,?,?,'invited',?,?,?)
      ON CONFLICT(business_id,email) DO UPDATE SET name=excluded.name,phone=excluded.phone,status='invited',user_id=NULL,invite_hash=excluded.invite_hash,expires_at=excluded.expires_at`,
      )
      .bind(
        crypto.randomUUID(),
        b.id,
        x.name,
        x.email,
        x.phone,
        await hash(token),
        new Date(Date.now() + 7 * 86400000).toISOString(),
        stamp,
      )
      .run();
    return json({ url: new URL(`/join/${token}`, req.url).href }, 201);
  }
  throw new HttpError(405, "Method not allowed.");
}
export async function checkRouting(draft: Draft, businessId: string) {
  const ids = new Set([
    ...(draft.routing?.memberIds || []),
    ...(draft.routing?.rules || []).map((r) => r.memberId),
  ]);
  for (const id of ids) {
    const found = await db()
      .prepare(
        "SELECT id FROM members WHERE id=? AND business_id=? AND status='active'",
      )
      .bind(id, businessId)
      .first();
    if (!found)
      throw new HttpError(
        400,
        "Choose an active member of this workspace for routing.",
      );
  }
}
export async function routeSubmission(
  draft: Draft,
  answers: Answers,
  businessId: string,
  formId: string,
) {
  const r = draft.routing;
  if (!r || r.mode === "owner") return null;
  const rows = await db()
    .prepare(
      "SELECT id,name,phone FROM members WHERE business_id=? AND status='active'",
    )
    .bind(businessId)
    .all<{ id: string; name: string; phone: string }>();
  if (r.mode === "rules") {
    const visible = visibleQuestions(draft, answers);
    const clean = Object.fromEntries(
      visible.map((q) => [q.id, answers[q.id] || ""]),
    );
    const rule = r.rules.find(
      (rule) =>
        visible.some((q) => q.id === rule.condition.questionId) &&
        matchesCondition(rule.condition, clean),
    );
    return rows.results.find((m) => m.id === rule?.memberId) || null;
  }
  const eligible = r.memberIds
    .map((id) => rows.results.find((m) => m.id === id))
    .filter((m): m is (typeof rows.results)[number] => !!m);
  if (!eligible.length) return null;
  if (r.mode === "member") return eligible[0];
  const counter = await db()
    .prepare(
      "INSERT INTO routing_counters(form_id,counter) VALUES(?,0) ON CONFLICT(form_id) DO UPDATE SET counter=counter+1 RETURNING counter",
    )
    .bind(formId)
    .first<{ counter: number }>();
  return eligible[(counter?.counter || 0) % eligible.length];
}
