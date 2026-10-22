import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { localAuth } from "./local-auth.mjs";
const base = process.env.TEST_URL || "http://localhost:5174";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw Error("Local tests only");
const first = await localAuth(base);
let second;
let checks = 0;
async function req(
  path,
  method = "GET",
  data,
  status = 200,
  cookie = first.cookie,
) {
  const response = await fetch(`${base}/api/${path}`, {
    method,
    headers: { "content-type": "application/json", cookie },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json();
  assert.equal(response.status, status, JSON.stringify(result));
  checks++;
  return result;
}
const profile = {
  name: "Forms core regression",
  phone: "+971500000008",
  logo: "",
  accent: "#176650",
  button: "#176650",
};
let businessCreated = false,
  otherCreated = false;
try {
  await req("business", "POST", profile, 201);
  businessCreated = true;
  second = await localAuth(base);
  await req("business", "POST", profile, 201, second.cookie);
  otherCreated = true;
  let f = await req(
    "forms",
    "POST",
    { template: "blank", type: "service", experience: "multipage" },
    201,
  );
  assert.equal(f.draft.completion.autoOpenWhatsApp, false);
  f.draft.questions = [
    {
      id: "name",
      label: "Your name",
      type: "short text",
      required: true,
      options: [],
      validation: { minLength: 3, maxLength: 20 },
      pageId: "basics",
    },
    {
      id: "guests",
      label: "Guests",
      type: "number",
      required: true,
      options: [],
      validation: { min: 1, max: 10 },
      pageId: "request",
    },
    {
      id: "date",
      label: "Date",
      type: "date",
      required: true,
      options: [],
      validation: { minDate: "2026-10-01", maxDate: "2026-11-01" },
      pageId: "request",
    },
    {
      id: "pick",
      label: "Interests",
      type: "multiple choice",
      required: true,
      options: ["A", "B", "C"],
      validation: { minSelections: 1, maxSelections: 2 },
      pageId: "request",
    },
    {
      id: "rating",
      label: "Rating",
      type: "rating",
      required: true,
      options: [],
      validation: { ratingMax: 10 },
      pageId: "request",
    },
  ];
  f.draft.whatsapp = {
    phone: "+971500000009",
    introduction: "Please review my enquiry.",
  };
  f.draft.completion = {
    title: "Thanks, we have your request",
    description: "Continue to speak with the team.",
    autoOpenWhatsApp: false,
  };
  f = await req(`forms/${f.id}`, "PATCH", {
    draft: f.draft,
    revision: f.revision,
  });
  f = await req(`forms/${f.id}/publish`, "POST", { revision: f.revision });
  const versionOne = structuredClone(f.published);
  assert.equal(f.version, 1);
  let history = await req(`forms/${f.id}/versions`);
  assert.equal(history.versions.length, 1);
  assert.equal(history.versions[0].questions, 5);
  await req(`forms/${f.id}/versions`, "GET", undefined, 404, second.cookie);
  await req(
    `forms/${f.id}/restore`,
    "POST",
    { version: 1, revision: f.revision },
    404,
    second.cookie,
  );
  await req(`forms/${f.id}/versions`, "GET", undefined, 401, "");
  f = await req(`forms/${f.id}`, "PATCH", {
    revision: f.revision,
    draft: { ...f.draft, title: "Unpublished changes" },
  });
  assert.equal((await req(`public/${f.slug}`)).form.title, versionOne.title);
  await req(
    `forms/${f.id}/restore`,
    "POST",
    { version: 1, revision: f.revision - 1 },
    409,
  );
  await req(
    `forms/${f.id}/restore`,
    "POST",
    { version: 99, revision: f.revision },
    404,
  );
  f = await req(`forms/${f.id}/restore`, "POST", {
    version: 1,
    revision: f.revision,
  });
  assert.deepEqual(f.draft, versionOne);
  assert.equal(f.version, 1);
  assert.deepEqual(f.published, versionOne);
  f = await req(`forms/${f.id}`, "PATCH", {
    revision: f.revision,
    draft: { ...f.draft, title: "Version two" },
  });
  f = await req(`forms/${f.id}/publish`, "POST", { revision: f.revision });
  history = await req(`forms/${f.id}/versions`);
  assert.deepEqual(
    history.versions.map((v) => v.version),
    [2, 1],
  );
  const answers = {
    name: "Alex Taylor",
    guests: "4",
    date: "2026-10-25",
    pick: ["A", "B"],
    rating: "10",
  };
  const payload = {
    version: 2,
    idempotency: randomUUID(),
    token: randomUUID(),
    visitor: randomUUID(),
    website: "",
    startedAt: Date.now() - 10000,
    answers,
    selections: [],
  };
  for (const bad of [
    { name: "Al" },
    { guests: "11" },
    { date: "2026-11-02" },
    { pick: ["A", "B", "C"] },
    { rating: "11" },
  ])
    await req(
      `public/${f.slug}/submit`,
      "POST",
      {
        ...payload,
        idempotency: randomUUID(),
        answers: { ...answers, ...bad },
      },
      400,
      "",
    );
  const saved = await req(`public/${f.slug}/submit`, "POST", payload, 201, "");
  assert.equal(saved.phone, "+971500000009");
  assert.ok(saved.message.includes("Please review my enquiry."));
  assert.ok(saved.message.includes("Rating: 10"));
  assert.deepEqual(saved.completion, f.published.completion);
  const retry = await req(`public/${f.slug}/submit`, "POST", payload, 200, "");
  assert.equal(retry.id, saved.id);
  assert.equal((await req(`responses?form=${f.id}`)).responses.length, 1);
  const live = structuredClone(f.published);
  f = await req(`forms/${f.id}/restore`, "POST", {
    version: 1,
    revision: f.revision,
  });
  assert.deepEqual(f.published, live);
  assert.equal((await req(`public/${f.slug}`)).form.title, "Version two");
  await req(`forms/${f.id}/status`, "POST", { status: "paused" });
  await req(`public/${f.slug}`, "GET", undefined, 404, "");
  let another = await req(
    "forms",
    "POST",
    { template: "blank", type: "service" },
    201,
  );
  await req(`forms/${another.id}/status`, "POST", { status: "published" }, 400);
  another = await req(`forms/${another.id}/publish`, "POST", {
    revision: another.revision,
  });
  await req(`forms/${f.id}/status`, "POST", { status: "published" }, 409);
  await req(`forms/${another.id}/status`, "POST", { status: "paused" });
  f = await req(`forms/${f.id}/status`, "POST", { status: "published" });
  assert.equal(f.version, 2);
  assert.deepEqual(f.published, live);
  assert.equal(f.draft.title, versionOne.title);
  assert.equal((await req(`public/${f.slug}`)).form.title, "Version two");
  assert.equal((await req(`responses?form=${f.id}`)).responses.length, 1);
  const duplicate = await req(`forms/${f.id}/duplicate`, "POST", {}, 201);
  assert.deepEqual(duplicate.draft.whatsapp, f.draft.whatsapp);
  assert.equal(duplicate.published, null);
  assert.equal(
    (await req(`forms/${duplicate.id}/versions`)).versions.length,
    0,
  );
  console.log(
    `PASS ${checks} Forms core API checks: validation, confirmation, idempotency, history, authorization and reopening.`,
  );
} finally {
  if (otherCreated)
    await req("business", "DELETE", undefined, 200, second.cookie);
  if (second) second.cleanup();
  if (businessCreated) await req("business", "DELETE");
  first.cleanup();
}
