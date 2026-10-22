import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { localAuth } from "./local-auth.mjs";
const base = process.env.TEST_URL || "http://localhost:5174";
const session = await localAuth(base);
let checks = 0,
  created = false;
async function req(path, method = "GET", data, status = 200) {
  const response = await fetch(`${base}/api/${path}`, {
    method,
    signal: AbortSignal.timeout(60000),
    headers: { "content-type": "application/json", cookie: session.cookie },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json();
  assert.equal(response.status, status, JSON.stringify(result));
  checks++;
  return result;
}
try {
  await req(
    "business",
    "POST",
    {
      name: "Forms path regression",
      phone: "+971500000008",
      logo: "",
      accent: "#176650",
      button: "#176650",
    },
    201,
  );
  created = true;
  let f = await req(
    "forms",
    "POST",
    { template: "blank", type: "service", experience: "multipage" },
    201,
  );
  f.draft.title = "Talk to our team";
  f.draft.description = "A quick enquiry, tailored to what you need.";
  f.draft.pages = [
    { id: "start", title: "What do you need?" },
    { id: "extra", title: "Project details" },
    { id: "end", title: "Contact details" },
  ];
  f.draft.questions = [
    {
      id: "route",
      label: "How can we help?",
      type: "single choice",
      required: true,
      options: ["Discuss a project", "Ask a quick question", "Just browsing"],
      pageId: "start",
    },
    {
      id: "extra",
      label: "Tell us about your project",
      type: "long text",
      required: true,
      options: [],
      pageId: "extra",
      validation: { minLength: 10, maxLength: 500 },
    },
    {
      id: "name",
      label: "Your name",
      type: "short text",
      required: true,
      options: [],
      pageId: "end",
      validation: { minLength: 2, maxLength: 80 },
    },
    {
      id: "email",
      label: "Your email",
      type: "email",
      required: true,
      options: [],
      pageId: "end",
    },
  ];
  f.draft.pageRules = [
    {
      id: "quick",
      fromPageId: "start",
      targetPageId: "end",
      condition: {
        questionId: "route",
        operator: "equals",
        value: "Ask a quick question",
      },
    },
    {
      id: "finish",
      fromPageId: "start",
      targetPageId: "__end",
      condition: {
        questionId: "route",
        operator: "equals",
        value: "Just browsing",
      },
    },
  ];
  f.draft.completion = {
    title: "Thanks for reaching out!",
    description:
      "Your response is saved. Continue to WhatsApp when you’re ready.",
    autoOpenWhatsApp: false,
  };
  const invalid = structuredClone(f.draft);
  invalid.pageRules[0].targetPageId = "start";
  await req(
    `forms/${f.id}`,
    "PATCH",
    { draft: invalid, revision: f.revision },
    400,
  );
  f = await req(`forms/${f.id}`, "PATCH", {
    draft: f.draft,
    revision: f.revision,
  });
  f = await req(`forms/${f.id}/publish`, "POST", { revision: f.revision });
  const submit = (answers, status = 201) =>
    req(
      `public/${f.slug}/submit`,
      "POST",
      {
        version: f.version,
        idempotency: randomUUID(),
        token: randomUUID(),
        visitor: randomUUID(),
        website: "",
        startedAt: Date.now() - 10000,
        answers,
        selections: [],
      },
      status,
    );
  const quick = await submit({
    route: "Ask a quick question",
    extra: "POISONED SKIPPED ANSWER",
    name: "Alex",
    email: "alex@example.test",
  });
  assert.deepEqual(
    quick.answers.map((a) => a.id),
    ["route", "name", "email"],
  );
  assert.ok(!quick.message.includes("POISONED"));
  const end = await submit({
    route: "Just browsing",
    name: "SKIPPED NAME",
    email: "invalid forged email",
  });
  assert.deepEqual(
    end.answers.map((a) => a.id),
    ["route"],
  );
  await submit(
    { route: "Discuss a project", name: "Alex", email: "alex@example.test" },
    400,
  );
  const all = await submit({
    route: "Discuss a project",
    extra: "A website redesign project",
    name: "Alex",
    email: "alex@example.test",
  });
  assert.equal(all.answers.length, 4);
  assert.equal((await req(`responses?form=${f.id}`)).responses.length, 3);
  console.log(
    `PASS ${checks} section-jump API checks: forward skips, early submission, required visited questions and excluded forged answers.`,
  );
} finally {
  if (created) await req("business", "DELETE");
  session.cleanup();
}
