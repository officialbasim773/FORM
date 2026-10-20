import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const base = process.env.TEST_URL || "http://127.0.0.1:5174";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw Error("Local tests only");
const user = "workflow-" + randomUUID(),
  other = "workflow-" + randomUUID();
let checks = 0;
async function req(
  path,
  { method = "GET", data, status = 200, who = user } = {},
) {
  const r = await fetch(base + "/api/" + path, {
    method,
    headers: {
      "content-type": "application/json",
      "oai-authenticated-user-id": who,
      "oai-authenticated-user-email": who + "@example.test",
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const out = await r.json();
  assert.equal(r.status, status, JSON.stringify(out));
  checks++;
  return out;
}
for (const who of [user, other])
  await req("business", {
    who,
    method: "POST",
    status: 201,
    data: {
      name: "Workflow test",
      phone: "+12025550123",
      logo: "",
      accent: "#176650",
      button: "#176650",
    },
  });
try {
  let f = await req("forms", {
    method: "POST",
    status: 201,
    data: { template: "blank", type: "service" },
  });
  f = await req("forms/" + f.id, {
    method: "PATCH",
    data: {
      revision: f.revision,
      draft: {
        ...f.draft,
        questions: [
          {
            id: "name",
            label: "Name",
            type: "short text",
            required: true,
            options: [],
          },
        ],
      },
    },
  });
  f = await req(`forms/${f.id}/publish`, {
    method: "POST",
    data: { revision: f.revision },
  });
  const receipt = await req(`public/${f.slug}/submit`, {
    method: "POST",
    status: 201,
    data: {
      version: f.version,
      visitor: randomUUID(),
      idempotency: randomUUID(),
      token: randomUUID(),
      startedAt: Date.now() - 5000,
      selections: [],
      answers: { name: "Workflow customer" },
    },
  });
  let list = await req("responses?status=new");
  assert.equal(list.responses.length, 1);
  await req("responses/" + receipt.id, {
    method: "PATCH",
    data: { status: "contacted", notes: "Private follow-up on Tuesday" },
  });
  list = await req("responses?status=contacted&search=Tuesday");
  assert.equal(list.responses.length, 1);
  assert.equal(
    list.responses[0].internal_notes,
    "Private follow-up on Tuesday",
  );
  assert.equal(list.responses[0].receipt.message, receipt.message);
  assert.equal(list.responses[0].assigned_to, null);
  assert.equal((await req("responses?status=new")).responses.length, 0);
  await req("responses/" + receipt.id, {
    method: "PATCH",
    data: { status: "completed" },
  });
  list = await req("responses?status=completed");
  assert.equal(
    list.responses[0].internal_notes,
    "Private follow-up on Tuesday",
  );
  await req("responses/" + receipt.id, {
    method: "PATCH",
    data: { status: "invalid" },
    status: 400,
  });
  await req("responses/" + receipt.id, {
    method: "PATCH",
    data: { notes: "x".repeat(10001) },
    status: 400,
  });
  await req("responses/" + receipt.id, {
    who: other,
    method: "PATCH",
    data: { status: "new" },
    status: 404,
  });
  await req("responses/" + receipt.id, {
    who: other,
    method: "PATCH",
    data: { notes: "overwrite" },
    status: 404,
  });
  assert.equal((await req("responses", { who: other })).responses.length, 0);
  console.log(
    `PASS ${checks} workflow API checks: status, private notes, filters, preservation and tenant isolation.`,
  );
} finally {
  for (const who of [user, other])
    await req("business", { who, method: "DELETE" });
}
