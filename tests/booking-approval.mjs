import { localAuth } from "./local-auth.mjs";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const base = process.env.TEST_URL || "http://localhost:5174";
const owner = await localAuth(base);
let member, business;
async function request(path, method = "GET", data, cookie = owner.cookie) {
  const response = await fetch(`${base}/api/${path}`, {
    method,
    headers: { cookie, "content-type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json();
  return { status: response.status, data: result };
}
async function ok(path, method, data, cookie) {
  const response = await request(path, method, data, cookie);
  assert.ok(response.status < 300, `${path}: ${JSON.stringify(response)}`);
  return response.data;
}
try {
  business = await ok("business", "POST", {
    name: "Audit isolated workspace",
    phone: "+971500000008",
    logo: "",
    accent: "#176650",
    button: "#176650",
  });
  member = await localAuth(base);
  const me = await ok("me", "GET", undefined, member.cookie);
  const invite = await ok("team", "POST", {
    name: "Audit provider",
    email: me.user.email,
    phone: "+971500000009",
  });
  await ok(
    `invitations/${invite.url.split("/").at(-1)}`,
    "POST",
    {},
    member.cookie,
  );
  const provider = (await ok("team")).members.find(
    (m) => m.email === me.user.email,
  );
  const schedule = (id) => ({
    id,
    unavailableDates: [],
    days: Array.from({ length: 7 }, (_, day) => ({
      day,
      periods: [{ start: "09:00", end: "17:00" }],
      breaks: [],
    })),
  });
  await ok("appointments/settings", "PATCH", {
    enabled: true,
    revision: -1,
    config: {
      timezone: "UTC",
      unavailableDates: [],
      services: [
        {
          id: "audit-service",
          name: "Audit service",
          description: "",
          duration: 30,
          buffer: 0,
          price: 1000,
          currency: "AED",
          providerIds: [provider.id],
        },
      ],
      providers: [schedule("owner"), schedule(provider.id)],
    },
  });
  const day = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const slots = await ok(
    `booking/${business.id}/slots?service=audit-service&provider=${provider.id}&date=${day}`,
  );
  assert.ok(slots.slots.length);
  const receipt = await ok(`booking/${business.id}/confirm`, "POST", {
    appointment: {
      serviceId: "audit-service",
      providerId: provider.id,
      start: slots.slots[0].start,
    },
    customer: {
      name: "Audit customer",
      email: "audit@example.test",
      phone: "+971500000007",
      notes: "",
    },
    idempotency: randomUUID(),
    token: randomUUID(),
    startedAt: Date.now() - 10000,
    website: "",
  });
  assert.equal(receipt.status, "pending");
  await ok(`team/${provider.id}`, "DELETE");
  const acceptance = await request(
    `appointments/bookings/${receipt.id}`,
    "PATCH",
    { status: "confirmed", revision: 0 },
  );
  const detail = await ok(`appointments/bookings/${receipt.id}`);
  assert.equal(acceptance.status, 409);
  assert.equal(detail.booking.status, "pending");
  console.log(
    JSON.stringify({
      scenario: "Approve pending booking after provider revocation",
      providerStatus: "revoked",
      acceptanceHttpStatus: acceptance.status,
      savedBookingStatus: detail.booking.status,
      regressionPassed:
        acceptance.status === 409 && detail.booking.status === "pending",
    }),
  );
} finally {
  if (business) await ok("business", "DELETE");
  if (member) member.cleanup();
  owner.cleanup();
}
