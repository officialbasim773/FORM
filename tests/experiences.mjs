import assert from "node:assert/strict";
import { localAuth } from "./local-auth.mjs";
const base = process.env.TEST_URL || "http://localhost:5174";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
  throw Error("Local tests only");
const session = await localAuth(base);
let checks = 0;
async function req(path, method = "GET", data, status = 200) {
  const r = await fetch(base + "/api/" + path, {
    method,
    headers: {
      "content-type": "application/json",
      cookie: session.cookie,
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const out = await r.json();
  assert.equal(r.status, status, JSON.stringify(out));
  checks++;
  return out;
}
try {
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
      f.draft.questions[0].placeholder = "e.g. Alex Taylor";
      const questions = structuredClone(f.draft.questions);
      f = await req(`forms/${f.id}`, "PATCH", {
        revision: f.revision,
        draft: {
          ...f.draft,
          experience: "interactive",
          accent: "#754b33",
          button: "#754b33",
          appearance: {
            font:
              experience === "classic"
                ? "poppins"
                : experience === "multipage"
                  ? "montserrat"
                  : "serif",
            background: "#fbf7f2",
            surface: "#ffffff",
            text: "#252525",
            radius: 12,
            hideBranding: true,
            buttonText: "Send my enquiry",
          },
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
      assert.equal(
        p.form.appearance.font,
        experience === "classic"
          ? "poppins"
          : experience === "multipage"
            ? "montserrat"
            : "serif",
      );
      assert.equal(p.form.appearance.hideBranding, true);
      assert.equal(p.form.button, "#754b33");
      const invalidDesign = structuredClone(f.draft);
      invalidDesign.appearance.radius = 100;
      await req(
        `forms/${f.id}`,
        "PATCH",
        { revision: f.revision, draft: invalidDesign },
        400,
      );
      const missingLogo = structuredClone(f.draft);
      missingLogo.appearance.logo = "/api/images/not-owned";
      await req(
        `forms/${f.id}`,
        "PATCH",
        { revision: f.revision, draft: missingLogo },
        400,
      );
      assert.equal(p.form.questions[0].placeholder, "e.g. Alex Taylor");
      const invalid = structuredClone(f.draft);
      invalid.questions[0].placeholder = "x".repeat(201);
      await req(
        `forms/${f.id}`,
        "PATCH",
        { revision: f.revision, draft: invalid },
        400,
      );
      const another = await req(
        "forms",
        "POST",
        { type: "service", template: "blank", experience },
        201,
      );
      const scoped = await req(`responses?form=${f.id}`);
      assert.ok(scoped.responses.every((r) => r.form_id === f.id));
      const untouched = await req(`forms/${another.id}`);
      assert.equal(untouched.draft.questions[0].placeholder, undefined);
      await req(`forms/${f.id}/status`, "POST", { status: "paused" });
    }
    console.log(`PASS ${checks} experience API checks.`);
  } finally {
    await req("business", "DELETE");
  }
} finally {
  session.cleanup();
}
