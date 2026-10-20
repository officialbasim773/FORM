// Explicit local demo credentials; never use this test against a live customer workspace.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const base = process.env.TEST_URL || "http://localhost:5174";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Local Worker only.");
const credentials = JSON.parse(
  readFileSync(".sites-runtime/demo-login.json", "utf8"),
);
const signed = await fetch(`${base}/api/auth/sign-in/email`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: base },
  body: JSON.stringify(credentials),
});
assert.equal(signed.status, 200, "Verified Better Auth demo sign-in");
const cookie = signed.headers
  .getSetCookie()
  .map((c) => c.split(";")[0])
  .join("; ");
async function req(path, method = "GET", body, authenticated = true) {
  const r = await fetch(`${base}/api/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: base,
      ...(authenticated ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json() };
}
const me = await req("me");
assert.equal(
  me.body.business.id,
  "formchat-local-demo-workspace",
  "Must use dedicated local demo workspace",
);
const settings = await req("appointments/settings");
assert.equal(settings.status, 200);
const config = {
  timezone: "Asia/Dubai",
  unavailableDates: [],
  services: [
    {
      id: "demo-consultation",
      name: "Discovery consultation",
      description: "A 30-minute introduction to discuss your project.",
      duration: 30,
      buffer: 15,
      price: 5000,
      currency: "AED",
      providerIds: ["owner"],
    },
  ],
  providers: [
    {
      id: "owner",
      unavailableDates: [],
      days: Array.from({ length: 7 }, (_, day) => ({
        day,
        periods: [{ start: "09:00", end: "17:00" }],
        breaks: [{ start: "12:00", end: "13:00" }],
      })),
    },
  ],
};
assert.equal(
  (
    await req("appointments/settings", "PATCH", {
      enabled: true,
      revision: settings.body.revision,
      config,
    })
  ).status,
  200,
);

const businessId = me.body.business.id;
const day = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
const slots = await req(
  `booking/${businessId}/slots?service=demo-consultation&provider=owner&date=${day}`,
  "GET",
  undefined,
  false,
);
assert.equal(slots.status, 200);
assert.ok(slots.body.slots.length);
const input = () => ({
  appointment: {
    serviceId: "demo-consultation",
    providerId: "owner",
    start: slots.body.slots[0].start,
  },
  customer: {
    name: "Demo appointment customer",
    email: "customer@example.test",
    phone: "+971500000002",
    notes: "Local test booking",
  },
  idempotency: randomUUID(),
  token: randomUUID(),
  startedAt: Date.now() - 5000,
  website: "",
});
const before = (await req("responses")).body.responses.length;
const a = input(),
  b = input();
const results = await Promise.all([
  req(`booking/${businessId}/confirm`, "POST", a, false),
  req(`booking/${businessId}/confirm`, "POST", b, false),
]);
assert.deepEqual(
  results.map((r) => r.status).sort(),
  [201, 409],
  JSON.stringify(results),
);
const winner = results.find((r) => r.status === 201).body;
assert.equal(winner.status, "pending");
const winnerInput = results[0].status === 201 ? a : b;
assert.equal(
  (
    await req(`appointments/bookings/${winner.id}`, "PATCH", {
      revision: 0,
      status: "confirmed",
    })
  ).status,
  200,
);
assert.equal(
  (
    await req(
      `booking/${businessId}/status`,
      "POST",
      { id: winner.id, token: winnerInput.token },
      false,
    )
  ).body.status,
  "confirmed",
);
assert.equal(
  (
    await req(
      `booking/${businessId}/status`,
      "POST",
      { id: winner.id, token: randomUUID() },
      false,
    )
  ).status,
  404,
);

const retry = await req(
  `booking/${businessId}/confirm`,
  "POST",
  results[0].status === 201 ? a : b,
  false,
);
assert.equal(retry.status, 200);
assert.equal(retry.body.id, winner.id);
assert.equal(
  (await req("responses")).body.responses.length,
  before,
  "Bookings do not create form responses",
);
assert.equal(
  (
    await req(`appointments/bookings/${winner.id}`, "PATCH", {
      revision: 1,
      status: "cancelled",
    })
  ).status,
  200,
);
const reopened = await req(
  `booking/${businessId}/slots?service=demo-consultation&provider=owner&date=${day}`,
  "GET",
  undefined,
  false,
);
assert.ok(reopened.body.slots.some((s) => s.start === a.appointment.start));
const declineInput = input();
const declined = await req(
  `booking/${businessId}/confirm`,
  "POST",
  declineInput,
  false,
);
assert.equal(declined.status, 201);
assert.equal(
  (
    await req(`appointments/bookings/${declined.body.id}`, "PATCH", {
      revision: 0,
      status: "declined",
    })
  ).status,
  200,
);
assert.equal(
  (
    await req(
      `booking/${businessId}/status`,
      "POST",
      { id: declined.body.id, token: declineInput.token },
      false,
    )
  ).body.status,
  "declined",
);
const afterDecline = await req(
  `booking/${businessId}/slots?service=demo-consultation&provider=owner&date=${day}`,
  "GET",
  undefined,
  false,
);
assert.ok(
  afterDecline.body.slots.some(
    (s) => s.start === declineInput.appointment.start,
  ),
);

assert.equal(
  (await req("appointments/settings", "GET", undefined, false)).status,
  401,
);
assert.equal(
  (await req(`booking/${businessId}`, "GET", undefined, false)).status,
  200,
);
const dates = await req(
  `booking/${businessId}/dates?service=demo-consultation&provider=owner&from=${day}&to=${day}`,
  "GET",
  undefined,
  false,
);
assert.ok(dates.body.dates.includes(day));
writeFileSync(
  ".sites-runtime/demo-links.json",
  JSON.stringify({ booking: `${base}/book/${businessId}` }),
);
console.log(
  "Live Better Auth + D1 checks passed: separate bookings, atomic conflicts, idempotency, approval, decline, protected status, cancellation, available dates, authentication and unchanged response count.",
);
