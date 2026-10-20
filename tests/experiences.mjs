import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const base = process.env.TEST_URL || "http://127.0.0.1:5174";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw Error("Local tests only");
const user = "experience-" + randomUUID();
let checks = 0;
async function req(path, method = "GET", data, status = 200) {
  const r = await fetch(base + "/api/" + path, {
    method,
    headers: {
      "content-type": "application/json",
      "oai-authenticated-user-id": user,
      "oai-authenticated-user-email": user + "@example.test",
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const out = await r.json();
  assert.equal(r.status, status, JSON.stringify(out));
  checks++;
  return out;
}
await req(
  "business",
  "POST",
  {
    name: "Experience tests",
    phone: "+971500000008",
    logo: "",
    accent: "#176650",
    button: "#176650",
  },
  201,
);
try {
  for (const experience of ["classic", "multipage", "interactive"]) {
    let f = await req(
      "forms",
      "POST",
      { type: "service", template: "contact", experience },
      201,
    );
    assert.equal(f.draft.experience, experience);
    if (experience === "multipage") assert.equal(f.draft.pages.length, 2);
    const questions = structuredClone(f.draft.questions);
    f = await req(`forms/${f.id}`, "PATCH", {
      revision: f.revision,
      draft: {
        ...f.draft,
        experience: "interactive",
        interactive: {
          welcome: true,
          progress: false,
          keyboard: true,
          startLabel: "Begin",
          welcomeTitle: "Hello there",
          welcomeDescription: "Tell us about your request.",
        },
      },
    });
    assert.deepEqual(f.draft.questions, questions);
    f = await req(`forms/${f.id}/publish`, "POST", { revision: f.revision });
    const p = await req(`public/${f.slug}`);
    assert.equal(p.form.experience, "interactive");
    assert.equal(p.form.interactive.welcomeTitle, "Hello there");
    assert.equal(p.form.interactive.progress, false);
    await req(`forms/${f.id}/status`, "POST", { status: "paused" });
  }
  console.log(`PASS ${checks} experience API checks.`);
} finally {
  await req("business", "DELETE");
}
