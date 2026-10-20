import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
const base = process.env.TEST_URL || "http://127.0.0.1:5174";
if (!["127.0.0.1", "localhost"].includes(new URL(base).hostname))
  throw new Error("Integration tests run only against a local test database.");
let checks = 0;
async function request(
  path,
  { user, method = "GET", data, status = 200, raw = false, headers = {} } = {},
) {
  const res = await fetch(base + "/api/" + path, {
    method,
    headers: {
      ...(user
        ? {
            "oai-authenticated-user-id": user,
            "oai-authenticated-user-email": user + "@example.test",
          }
        : {}),
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const text = await res.text();
  assert.equal(res.status, status, `${method} ${path}: ${text}`);
  checks++;
  return raw ? text : JSON.parse(text);
}
function sql(statement) {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/sites-env.mjs",
      "./node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      "DB",
      "--local",
      "--config",
      "dist/server/wrangler.json",
      "--persist-to",
      ".wrangler/state",
      "--command",
      statement,
    ],
    { encoding: "utf8" },
  );
  if (result.status) throw new Error(result.stderr + result.stdout);
}
const user = "test-" + randomUUID();
const other = "test-" + randomUUID();
const bizInput = {
  name: "Test & Co",
  phone: "+971501234567",
  logo: "",
  accent: "#176650",
  button: "#176650",
};
await request("forms", { status: 401 });
await request("business", {
  user,
  method: "POST",
  data: { ...bizInput, phone: "123" },
  status: 400,
});
const b = await request("business", {
  user,
  method: "POST",
  data: bizInput,
  status: 201,
});
await request("business", {
  user: other,
  method: "POST",
  data: { ...bizInput, name: "Other business" },
  status: 201,
});
await request("business", {
  user,
  method: "PATCH",
  data: { ...bizInput, onboarded: 0 },
});
const f = await request("forms", {
  user,
  method: "POST",
  data: { template: "quote", type: "service" },
  status: 201,
});
await request("forms/" + f.id, { user: other, status: 404 });
await request("forms/" + f.id, {
  user: other,
  method: "PATCH",
  data: { draft: f.draft, revision: 0 },
  status: 404,
});
await request("forms/" + f.id, { user: other, method: "DELETE", status: 404 });
await request("forms/" + f.id + "/publish", {
  user,
  method: "POST",
  data: { revision: 0 },
});
const second = await request("forms", {
  user,
  method: "POST",
  data: { template: "contact", type: "service" },
  status: 201,
});
await request("forms/" + second.id + "/publish", {
  user,
  method: "POST",
  data: { revision: 0 },
  status: 409,
});
const publicForm = await request("public/" + f.slug);
assert.equal(publicForm.version, 1);
const changed = structuredClone(f.draft);
changed.title = "Updated draft";
changed.questions.find((q) => q.id === "name").label = "Full customer name";
await request("forms/" + f.id, {
  user,
  method: "PATCH",
  data: { draft: changed, revision: 0 },
});
assert.equal((await request("public/" + f.slug)).form.title, f.draft.title);
await request("forms/" + f.id, {
  user,
  method: "PATCH",
  data: { draft: f.draft, revision: 0 },
  status: 409,
});
await request("forms/" + f.id, {
  user,
  method: "PATCH",
  data: { draft: { ...changed, button: "#ffffff" }, revision: 1 },
  status: 403,
});
const payload = () => ({
  version: 1,
  idempotency: randomUUID(),
  token: randomUUID(),
  visitor: randomUUID(),
  website: "",
  startedAt: Date.now() - 5000,
  answers: {
    name: "ليلى أحمد 🎂 & Co",
    phone: "+971501234567",
    service: "Home cleaning",
    location: "Dubai",
    date: "2026-10-20",
    notes: "Line one\nLine two & special = characters",
  },
  selections: [],
});
await request("public/" + f.slug + "/submit", {
  method: "POST",
  data: { ...payload(), answers: {} },
  status: 400,
});
await request("public/" + f.slug + "/submit", {
  method: "POST",
  data: { ...payload(), website: "spam" },
  status: 400,
});
const pay = payload();
const results = await Promise.all(
  [201, 200].map(() =>
    request("public/" + f.slug + "/submit", {
      method: "POST",
      data: pay,
      status: 201,
    }).catch(async (e) => {
      if (e.message.includes("200 !== 201"))
        return request("public/" + f.slug + "/submit", {
          method: "POST",
          data: pay,
        });
      throw e;
    }),
  ),
);
assert.equal(results[0].id, results[1].id);
const receipt = results[0];
assert.ok(receipt.message.includes("ليلى أحمد 🎂 & Co"));
assert.ok(receipt.message.includes("preferred date is a request"));
await request("public/" + f.slug + "/submit", {
  method: "POST",
  data: { ...pay, answers: { ...pay.answers, name: "Changed" } },
  status: 409,
});
const before = await request("responses", { user });
assert.equal(before.responses.length, 1);
assert.equal(before.responses[0].handoff_at, null);
await request("public/" + f.slug + "/handoff", {
  method: "POST",
  data: { id: receipt.id, token: randomUUID() },
  status: 404,
});
await request("public/" + f.slug + "/handoff", {
  method: "POST",
  data: { id: receipt.id, token: pay.token },
});
assert.equal(
  (await request("responses?handoff=yes", { user })).responses.length,
  1,
);
assert.equal(
  (await request("responses?search=notfound", { user })).responses.length,
  0,
);
assert.equal(
  (await request("responses?form=" + second.id, { user })).responses.length,
  0,
);
assert.equal((await request("responses", { user: other })).responses.length, 0);
await request("responses/export", { user, status: 403 });
await request("analytics", { user, status: 403 });
await request("forms/" + f.id + "/publish", {
  user,
  method: "POST",
  data: { revision: 1 },
});
assert.equal(
  (await request("responses", { user })).responses[0].snapshot.questions[0]
    .label,
  "Your name",
);
await request("public/" + f.slug + "/submit", {
  method: "POST",
  data: payload(),
  status: 409,
});
await request("forms/" + f.id + "/status", {
  user,
  method: "POST",
  data: { status: "paused" },
});
await request("public/" + f.slug, { status: 404 });
assert.equal((await request("responses", { user })).responses.length, 1);
await request("forms/" + f.id + "/publish", {
  user,
  method: "POST",
  data: { revision: 1 },
});
const duplicate = await request("forms/" + f.id + "/duplicate", {
  user,
  method: "POST",
  data: {},
  status: 201,
});
assert.equal(duplicate.status, "draft");
assert.equal(duplicate.published, null);
const product = await request("forms", {
  user,
  method: "POST",
  data: { template: "cake", type: "product" },
  status: 201,
});
await request("forms/" + product.id + "/publish", {
  user,
  method: "POST",
  data: { revision: 0 },
  status: 403,
});
sql(`UPDATE businesses SET plan='business' WHERE id='${b.id}'`);
await request("forms/" + product.id + "/publish", {
  user,
  method: "POST",
  data: { revision: 0 },
});
const pp = {
  ...payload(),
  answers: {
    name: "Product Tester",
    phone: "+971501234567",
    date: "2026-10-21",
    address: "Dubai",
  },
  selections: [
    {
      productId: "cake",
      quantity: 2,
      options: { size: "eight", flavour: "chocolate", inscription: "مبروك 🎉" },
      note: "No nuts please",
    },
  ],
};
const pr = await request("public/" + product.slug + "/submit", {
  method: "POST",
  data: pp,
  status: 201,
});
assert.equal(pr.total, 54000);
assert.equal(pr.items[0].unitPrice, 27000);
assert.ok(pr.message.includes("Estimated total: AED"));
await request("public/" + product.slug + "/submit", {
  method: "POST",
  data: {
    ...pp,
    idempotency: randomUUID(),
    selections: [{ ...pp.selections[0], quantity: 999 }],
  },
  status: 400,
});
await request("public/" + product.slug + "/submit", {
  method: "POST",
  data: {
    ...pp,
    idempotency: randomUUID(),
    selections: [
      { ...pp.selections[0], options: { size: "invalid", flavour: "vanilla" } },
    ],
  },
  status: 400,
});
const visitor = randomUUID();
for (let i = 0; i < 2; i++)
  await request("public/" + product.slug + "/event", {
    method: "POST",
    data: { kind: "view", visitor },
  });
await request("public/" + product.slug + "/event", {
  method: "POST",
  data: { kind: "start", visitor },
});
const analytics = await request("analytics", { user });
assert.equal(analytics.submissions, 2);
assert.equal(analytics.handoffs, 1);
assert.equal(analytics.events.view, 1);
const csv = await request("responses/export", { user, raw: true });
assert.ok(csv.includes("Estimated total (minor units)"));
assert.ok(csv.includes("54000"));
await request("forms/" + f.id, { user, method: "DELETE" });
assert.equal((await request("responses", { user })).responses.length, 2);
await request("public/" + f.slug, { status: 404 });
await request("forms", {
  user,
  method: "POST",
  data: { template: "contact", type: "service" },
  headers: { Origin: "https://attacker.example" },
  status: 403,
});
const invalidUpload = await fetch(base + "/api/upload", {
  method: "POST",
  headers: {
    "oai-authenticated-user-id": user,
    "oai-authenticated-user-email": user + "@example.test",
  },
  body: '<svg onload="alert(1)"></svg>',
});
assert.equal(invalidUpload.status, 400);
checks++;
await request("responses/" + receipt.id, { user, method: "DELETE" });
assert.equal((await request("responses", { user })).responses.length, 1);
await request("business", { user, method: "DELETE" });
await request("business", { user: other, method: "DELETE" });
// A separate tenant tests the monthly boundary, concurrent requests and deletion accounting.
const quotaUser = "quota-" + randomUUID();
const quotaBusiness = await request("business", {
  user: quotaUser,
  method: "POST",
  data: bizInput,
  status: 201,
});
const quotaForm = await request("forms", {
  user: quotaUser,
  method: "POST",
  data: { template: "quote", type: "service" },
  status: 201,
});
await request("forms/" + quotaForm.id + "/publish", {
  user: quotaUser,
  method: "POST",
  data: { revision: 0 },
});
const month = new Date().toISOString().slice(0, 7);
sql(
  `INSERT INTO usage(key,business_id,month,count) VALUES('${quotaBusiness.id}:${month}','${quotaBusiness.id}','${month}',49)`,
);
const raced = await Promise.all(
  [payload(), payload()].map(async (data) => {
    const res = await fetch(
      base + "/api/public/" + quotaForm.slug + "/submit",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
    return { status: res.status, data: await res.json() };
  }),
);
assert.deepEqual(raced.map((r) => r.status).sort(), [201, 429]);
assert.ok(
  raced
    .find((r) => r.status === 429)
    .data.error.includes("monthly response limit"),
);
checks += 2;
const savedQuota = raced.find((r) => r.status === 201).data;
assert.equal((await request("forms", { user: quotaUser })).usage, 50);
await request("responses/" + savedQuota.id, {
  user: quotaUser,
  method: "DELETE",
});
assert.equal((await request("forms", { user: quotaUser })).usage, 50);
await request("public/" + quotaForm.slug + "/submit", {
  method: "POST",
  data: payload(),
  status: 429,
});
await request("business", { user: quotaUser, method: "DELETE" });
console.log(
  `PASS: ${checks} API assertions plus price, snapshot, Unicode, idempotency and isolation checks.`,
);
// New answer formats must work through publication and server-side validation.
const formatUser = "formats-" + randomUUID();
await request("business", {
  user: formatUser,
  method: "POST",
  data: bizInput,
  status: 201,
});
const formatForm = await request("forms", {
  user: formatUser,
  method: "POST",
  data: { template: "contact", type: "service" },
  status: 201,
});
const formatDraft = {
  ...formatForm.draft,
  questions: [
    {
      id: "website",
      label: "Website",
      type: "url",
      required: true,
      options: [],
    },
    {
      id: "score",
      label: "Rating",
      type: "rating",
      required: true,
      options: [],
    },
    { id: "gift", label: "Gift?", type: "yes/no", required: true, options: [] },
    {
      id: "method",
      label: "Method",
      type: "dropdown",
      required: true,
      options: ["Collection", "Delivery"],
    },
  ],
};
await request("forms/" + formatForm.id, {
  user: formatUser,
  method: "PATCH",
  data: { draft: formatDraft, revision: 0 },
});
await request("forms/" + formatForm.id + "/publish", {
  user: formatUser,
  method: "POST",
  data: { revision: 1 },
});
const formatPayload = {
  ...payload(),
  answers: {
    website: "https://example.com",
    score: "4",
    gift: "Yes",
    method: "Delivery",
  },
};
await request("public/" + formatForm.slug + "/submit", {
  method: "POST",
  data: { ...formatPayload, answers: { ...formatPayload.answers, score: "9" } },
  status: 400,
});
const formatReceipt = await request("public/" + formatForm.slug + "/submit", {
  method: "POST",
  data: formatPayload,
  status: 201,
});
assert.equal(
  formatReceipt.answers.find((a) => a.label === "Rating").value,
  "4",
);
assert.equal(
  (await request("responses", { user: formatUser })).responses[0].snapshot
    .questions[2].type,
  "yes/no",
);
await request("business", { user: formatUser, method: "DELETE" });
console.log(
  `PASS: all ${checks} API assertions including new question formats.`,
);
