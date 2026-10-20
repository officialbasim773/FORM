import { env } from "cloudflare:workers";
import { getAuthUser } from "@/lib/auth-user";
import { Business } from "./model";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function db() {
  if (!env.DB)
    throw new HttpError(
      503,
      "Storage is temporarily unavailable. Please try again.",
    );
  return env.DB;
}
export function bucket() {
  if (!env.BUCKET) throw new HttpError(503, "Image storage is unavailable.");
  return env.BUCKET;
}
export async function owner() {
  const u = await getAuthUser();
  if (!u) throw new HttpError(401, "Sign in to continue.");
  return u;
}
export async function workspaces() {
  const u = await owner();
  const rows = await db()
    .prepare(
      `SELECT b.*, EXISTS(SELECT 1 FROM appointment_settings a WHERE a.business_id=b.id) appointments_configured, 'owner' role, NULL memberId FROM businesses b WHERE b.owner=?
    UNION ALL SELECT b.*, EXISTS(SELECT 1 FROM appointment_settings a WHERE a.business_id=b.id) appointments_configured, 'member' role, m.id memberId FROM businesses b JOIN members m ON m.business_id=b.id
    WHERE m.user_id=? AND m.status='active' AND b.owner<>?`,
    )
    .bind(u.userId, u.userId, u.userId)
    .all<Business>();
  return rows.results;
}
export async function business(req?: Request) {
  const rows = await workspaces();
  const selected = req?.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)formchat_workspace=([\w-]+)/)?.[1];
  const b = selected ? rows.find((x) => x.id === selected) : rows[0];
  if (!b)
    throw new HttpError(
      selected ? 403 : 404,
      selected
        ? "This workspace is no longer available. Switch workspace or sign in again."
        : "Set up your business first.",
    );
  return b;
}
export async function hash(s: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)),
    ),
  ]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export async function limited(key: string, max = 30, seconds = 60) {
  const now = Math.floor(Date.now() / 1000);
  const r = await db()
    .prepare(
      "INSERT INTO rates(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END, expires=CASE WHEN expires<? THEN ? ELSE expires END RETURNING count",
    )
    .bind(key, now + seconds, now, now, now + seconds)
    .first<{ count: number }>();
  if ((r?.count || 0) > max)
    throw new HttpError(
      429,
      "Too many attempts. Please wait a minute and try again.",
    );
  if (Math.random() < 0.02)
    await db()
      .prepare("DELETE FROM rates WHERE expires<?")
      .bind(now - 86400)
      .run();
}
export async function readLimited(req: Request, max: number) {
  if (Number(req.headers.get("content-length")) > max)
    throw new HttpError(413, "This request is too large.");
  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new HttpError(413, "This request is too large.");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
export async function body(req: Request) {
  const s = new TextDecoder().decode(await readLimited(req, 150000));
  try {
    return JSON.parse(s);
  } catch {
    throw new HttpError(400, "Invalid request.");
  }
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function csrf(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin)
    throw new HttpError(403, "Please submit from this website.");
  if (req.headers.get("sec-fetch-site") === "cross-site")
    throw new HttpError(403, "Cross-site request rejected.");
}
