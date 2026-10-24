import { sessionFixtures } from "./session-fixtures.mjs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const base = process.env.TEST_URL || "http://localhost:5174";
const session = sessionFixtures(base);
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw new Error("Local tests only");
let checks = 0;
async function req(
  path,
  { user, method = "GET", data, status = 200, cookie } = {},
) {
  const r = await fetch(base + "/api/" + path, {
    method,
    headers: {
      ...(user
        ? {
            cookie: (await session(user)).cookie,
          }
        : {}),
      ...(data ? { "content-type": "application/json" } : {}),
      ...(cookie
        ? { cookie: (user ? (await session(user)).cookie + "; " : "") + cookie }
        : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const out = await r.json();
  assert.equal(r.status, status, `${method} ${path} ${JSON.stringify(out)}`);
  checks++;
  return out;
}
const owner = "flow-" + randomUUID(),
  a = "member-" + randomUUID(),
  b = "member-" + randomUUID(),
  outsider = "stranger-" + randomUUID();
const biz = await req("business", {
  user: owner,
  method: "POST",
  data: {
    name: "Flow test",
    phone: "+971501234567",
    logo: "",
    accent: "#176650",
    button: "#176650",
  },
  status: 201,
});
try {
  const invite = async (user, name, phone) =>
    req("team", {
      user: owner,
      method: "POST",
      data: { name, email: (await session(user)).email, phone },
      status: 201,
    });
  const ia = await invite(a, "Alex", "+971500000001"),
    ib = await invite(b, "Blair", "+971500000002");
  const tokenA = ia.url.split("/").pop(),
    tokenB = ib.url.split("/").pop();
  await req(`invitations/${tokenA}`);
  await req(`invitations/${tokenA}`, {
    user: outsider,
    method: "POST",
    data: {},
    status: 403,
  });
  await req(`invitations/${tokenA}`, { user: a, method: "POST", data: {} });
  await req(`invitations/${tokenA}`, {
    user: a,
    method: "POST",
    data: {},
    status: 404,
  });
  await req(`invitations/${tokenB}`, { user: b, method: "POST", data: {} });
  const team = (await req("team", { user: owner })).members;
  const ma = team.find((m) => m.name === "Alex"),
    mb = team.find((m) => m.name === "Blair");
  assert.equal((await req("me", { user: a })).business.role, "member");
  for (const path of ["team", "forms", "analytics"])
    await req(path, { user: a, status: 403 });
  await req("business", { user: a, method: "DELETE", status: 403 });
  await req("workspace", {
    user: outsider,
    method: "POST",
    data: { id: biz.id },
    status: 403,
  });
  await req("workspace", { user: a, method: "POST", data: { id: biz.id } });
  let f = await req("forms", {
    user: owner,
    method: "POST",
    data: { template: "blank", type: "service" },
    status: 201,
  });
  const draft = {
    ...f.draft,
    title: "Conditional flow test",
    pages: [
      { id: "one", title: "Your details" },
      { id: "two", title: "Delivery" },
    ],
    questions: [
      {
        id: "name",
        label: "Your name",
        type: "short text",
        required: true,
        options: [],
        pageId: "one",
      },
      {
        id: "method",
        label: "Method",
        type: "single choice",
        required: true,
        options: ["Pickup", "Delivery"],
        pageId: "one",
      },
      {
        id: "address",
        label: "Address",
        type: "address",
        required: true,
        options: [],
        pageId: "two",
        condition: {
          questionId: "method",
          operator: "equals",
          value: "Delivery",
        },
      },
    ],
    routing: {
      mode: "rules",
      memberIds: [],
      rules: [
        {
          memberId: ma.id,
          condition: {
            questionId: "method",
            operator: "equals",
            value: "Delivery",
          },
        },
      ],
    },
  };
  await req(`forms/${f.id}`, {
    user: owner,
    method: "PATCH",
    data: {
      revision: f.revision,
      draft: {
        ...draft,
        routing: { mode: "member", memberIds: ["foreign-member"], rules: [] },
      },
    },
    status: 400,
  });
  f = await req(`forms/${f.id}`, {
    user: owner,
    method: "PATCH",
    data: { revision: f.revision, draft },
  });
  f = await req(`forms/${f.id}/publish`, {
    user: owner,
    method: "POST",
    data: { revision: f.revision },
  });
  const publicForm = await req(`public/${f.slug}`);
  assert.equal(publicForm.form.routing, undefined);
  const payload = (answers) => ({
    version: f.version,
    idempotency: randomUUID(),
    token: randomUUID(),
    visitor: randomUUID(),
    startedAt: Date.now() - 5000,
    answers,
    selections: [],
  });
  await req(`public/${f.slug}/submit`, {
    method: "POST",
    data: payload({ name: "Missing address", method: "Delivery" }),
    status: 400,
  });
  const delivery = payload({
    name: "Delivery customer",
    method: "Delivery",
    address: "Test address",
  });
  const received = await req(`public/${f.slug}/submit`, {
    method: "POST",
    data: delivery,
    status: 201,
  });
  assert.equal(received.phone, ma.phone);
  const repeated = await req(`public/${f.slug}/submit`, {
    method: "POST",
    data: delivery,
  });
  assert.equal(received.id, repeated.id);
  const pickup = await req(`public/${f.slug}/submit`, {
    method: "POST",
    data: payload({
      name: "Pickup customer",
      method: "Pickup",
      address: "FORGED HIDDEN VALUE",
    }),
    status: 201,
  });
  assert.equal(pickup.answers.length, 2);
  assert.equal(pickup.phone, biz.phone);
  const ar = (await req("responses", { user: a })).responses;
  assert.equal(ar.length, 1);
  assert.equal(ar[0].assigned_to, ma.id);
  assert.equal((await req("responses", { user: b })).responses.length, 0);
  await req(`responses/${received.id}`, {
    user: a,
    method: "PATCH",
    data: { assignedTo: mb.id },
    status: 403,
  });
  await req(`responses/${received.id}`, {
    user: a,
    method: "DELETE",
    status: 403,
  });
  await req(`responses/${received.id}`, {
    user: owner,
    method: "PATCH",
    data: { assignedTo: mb.id },
  });
  assert.equal((await req("responses", { user: a })).responses.length, 0);
  assert.equal(
    (await req("responses", { user: b })).responses[0].receipt.phone,
    ma.phone,
  );
  f = await req(`forms/${f.id}`, {
    user: owner,
    method: "PATCH",
    data: {
      revision: f.revision,
      draft: {
        ...draft,
        routing: { mode: "round_robin", memberIds: [ma.id, mb.id], rules: [] },
      },
    },
  });
  f = await req(`forms/${f.id}/publish`, {
    user: owner,
    method: "POST",
    data: { revision: f.revision },
  });
  const rr = await Promise.all(
    [1, 2].map((n) =>
      req(`public/${f.slug}/submit`, {
        method: "POST",
        data: payload({ name: `Round robin ${n}`, method: "Pickup" }),
        status: 201,
      }),
    ),
  );
  assert.deepEqual(
    new Set(rr.map((r) => r.phone)),
    new Set([ma.phone, mb.phone]),
  );
  await req(`team/${ma.id}`, { user: owner, method: "DELETE" });
  await req("responses", {
    user: a,
    cookie: `formchat_workspace=${biz.id}`,
    status: 403,
  });
  await req(`team/${mb.id}`, { user: owner, method: "DELETE" });
  const fallback = await req(`public/${f.slug}/submit`, {
    method: "POST",
    data: payload({ name: "Owner fallback", method: "Pickup" }),
    status: 201,
  });
  assert.equal(fallback.phone, biz.phone);
  console.log(`PASS ${checks} team, routing and conditional API assertions.`);
} finally {
  await req("business", { user: owner, method: "DELETE" });
}
