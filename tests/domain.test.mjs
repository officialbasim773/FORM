import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir(".sites-runtime", { recursive: true });
await build({
  entryPoints: ["lib/model.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".sites-runtime/model-test.mjs",
});
await build({
  entryPoints: ["lib/templates.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".sites-runtime/templates-test.mjs",
});
const {
  calculateItems,
  toMinor,
  readableText,
  validateAnswers,
  formatMessage,
  draftSchema,
} = await import("../.sites-runtime/model-test.mjs");
const { template, TEMPLATES } =
  await import("../.sites-runtime/templates-test.mjs");
test("all six templates and the blank draft are structurally valid", () => {
  for (const t of TEMPLATES)
    assert.ok(draftSchema.safeParse(template(t.id)).success);
  assert.equal(template("blank", "product").products.length, 0);
  assert.equal(template("product").products[0].name, "Seasonal bouquet");
});
test("minor-unit parsing avoids float multiplication and rejects ambiguous prices", () => {
  assert.equal(toMinor("10.29"), 1029);
  assert.equal(toMinor("0.01"), 1);
  assert.equal(toMinor("120"), 12000);
  for (const s of ["1.001", "-1", "NaN", "1e2", "2,45"])
    assert.throws(() => toMinor(s));
});
test("cake customisation is priced and validated on authoritative products", () => {
  const d = template("cake");
  const s = {
    productId: "cake",
    quantity: 2,
    options: { size: "eight", flavour: "chocolate", inscription: "مبروك 🎂" },
  };
  const result = calculateItems(d, [s]);
  assert.equal(result[0].total, 54000);
  assert.equal(result[0].unitPrice, 27000);
  for (const item of [
    { ...s, quantity: 0 },
    { ...s, quantity: 6 },
    { ...s, quantity: 1.1 },
    { ...s, options: { size: "invalid", flavour: "vanilla" } },
    { ...s, options: {} },
    { ...s, productId: "other" },
  ])
    assert.throws(() => calculateItems(d, [item]));
  assert.throws(() =>
    calculateItems(
      { ...d, products: d.products.map((p) => ({ ...p, hidden: true })) },
      [s],
    ),
  );
  assert.throws(() => calculateItems(d, [s, s]));
});
test("answer validation rejects invalid types, required fields and calendar dates", () => {
  const d = template("cake");
  const answers = {
    name: "Laila",
    phone: "+971500000001",
    date: "2026-10-12",
    address: "Dubai",
  };
  assert.equal(validateAnswers(d, answers).length, 4);
  assert.throws(() => validateAnswers(d, { ...answers, name: "" }));
  assert.throws(() => validateAnswers(d, { ...answers, date: "2026-02-30" }));
  assert.throws(() => validateAnswers(d, { ...answers, phone: ["bad"] }));
});
test("answer rules are optional and preserve legacy form validation", () => {
  const d = template("blank");
  assert.ok(draftSchema.safeParse(d).success);
  assert.equal(validateAnswers(d, { name: "Alice" })[0].value, "Alice");
  const rating = {
    ...d,
    questions: [
      {
        id: "score",
        label: "Score",
        type: "rating",
        options: [],
        required: true,
      },
    ],
  };
  assert.throws(() => validateAnswers(rating, { score: "6" }));
  assert.equal(validateAnswers(rating, { score: "5" })[0].value, "5");
});
test("text limits trim minimums and reject invalid min/max configurations", () => {
  const d = template("blank");
  d.questions[0].validation = { minLength: 3, maxLength: 10 };
  assert.ok(draftSchema.safeParse(d).success);
  assert.throws(() => validateAnswers(d, { name: " a " }), /at least 3/);
  assert.throws(
    () => validateAnswers(d, { name: "a".repeat(11) }),
    /at most 10/,
  );
  assert.equal(validateAnswers(d, { name: "Alice" })[0].value, "Alice");
  d.questions[0].required = false;
  assert.equal(validateAnswers(d, { name: "" })[0].value, "");
  d.questions[0].validation = { minLength: 10, maxLength: 5 };
  assert.equal(draftSchema.safeParse(d).success, false);
  d.questions[0].validation = { min: 3 };
  assert.equal(draftSchema.safeParse(d).success, false);
});
test("number and calendar date bounds are inclusive and server authoritative", () => {
  const d = template("blank");
  d.questions = [
    {
      id: "n",
      label: "Guests",
      type: "number",
      options: [],
      required: true,
      validation: { min: -1.5, max: 10 },
    },
    {
      id: "day",
      label: "Preferred date",
      type: "date",
      options: [],
      required: true,
      validation: { minDate: "2026-10-01", maxDate: "2026-10-31" },
    },
  ];
  assert.ok(draftSchema.safeParse(d).success);
  for (const n of ["-1.5", "0", "10"])
    assert.equal(validateAnswers(d, { n, day: "2026-10-01" }).length, 2);
  for (const n of ["-2", "11", "Infinity", "1e2", "9".repeat(400)])
    assert.throws(() => validateAnswers(d, { n, day: "2026-10-31" }));
  for (const day of ["2026-09-30", "2026-11-01", "2026-10-32"])
    assert.throws(() => validateAnswers(d, { n: "5", day }));
  d.questions[1].validation.minDate = "2026-02-30";
  assert.equal(draftSchema.safeParse(d).success, false);
});
test("checkbox counts and custom rating scales cannot be bypassed", () => {
  const d = template("blank");
  d.questions = [
    {
      id: "pick",
      label: "Pick",
      type: "multiple choice",
      options: ["A", "B", "C"],
      required: false,
      validation: { minSelections: 2, maxSelections: 2 },
    },
    {
      id: "score",
      label: "Score",
      type: "rating",
      options: [],
      required: true,
      validation: { ratingMax: 10 },
    },
  ];
  assert.ok(draftSchema.safeParse(d).success);
  assert.equal(validateAnswers(d, { pick: [], score: "10" }).length, 2);
  assert.equal(validateAnswers(d, { pick: ["A", "B"], score: "1" }).length, 2);
  for (const pick of [["A"], ["A", "B", "C"], ["A", "A"], ["A", "D"]])
    assert.throws(() => validateAnswers(d, { pick, score: "5" }));
  for (const score of ["0", "11", "5.5", "NaN"])
    assert.throws(() => validateAnswers(d, { pick: [], score }));
  d.questions[0].validation.maxSelections = 4;
  assert.equal(draftSchema.safeParse(d).success, false);
});
test("WhatsApp and completion settings have bounded validated content", () => {
  const d = template("blank");
  d.whatsapp = {
    phone: "+971500000002",
    introduction: "Please review my enquiry.",
  };
  d.completion = {
    title: "Thanks for getting in touch",
    description: "Our team will review your request.",
    autoOpenWhatsApp: false,
  };
  assert.ok(draftSchema.safeParse(d).success);
  d.whatsapp.phone = "";
  assert.ok(draftSchema.safeParse(d).success);
  d.whatsapp.phone = "javascript:alert(1)";
  assert.equal(draftSchema.safeParse(d).success, false);
  d.whatsapp.phone = "+971500000002";
  d.completion.title = " ";
  assert.equal(draftSchema.safeParse(d).success, false);
});
test("section jumps choose a forward path, exclude forged skipped answers and support submission", () => {
  const d = template("blank");
  d.experience = "multipage";
  d.pages = [
    { id: "start", title: "Start" },
    { id: "extra", title: "Extra" },
    { id: "end", title: "Finish" },
  ];
  d.questions = [
    {
      id: "route",
      label: "Route",
      type: "single choice",
      required: true,
      options: ["All", "Skip", "Finish"],
      pageId: "start",
    },
    {
      id: "extra",
      label: "Extra",
      type: "short text",
      required: true,
      options: [],
      pageId: "extra",
    },
    {
      id: "end",
      label: "Finish",
      type: "short text",
      required: true,
      options: [],
      pageId: "end",
    },
  ];
  d.pageRules = [
    {
      id: "skip",
      fromPageId: "start",
      targetPageId: "end",
      condition: { questionId: "route", operator: "equals", value: "Skip" },
    },
    {
      id: "finish",
      fromPageId: "start",
      targetPageId: "__end",
      condition: { questionId: "route", operator: "equals", value: "Finish" },
    },
  ];
  assert.ok(draftSchema.safeParse(d).success);
  assert.throws(
    () => validateAnswers(d, { route: "All", end: "Done" }),
    /Extra is required/,
  );
  assert.deepEqual(
    validateAnswers(d, { route: "Skip", extra: "forged", end: "Done" }).map(
      (a) => a.id,
    ),
    ["route", "end"],
  );
  assert.deepEqual(
    validateAnswers(d, { route: "Finish", extra: "forged", end: "forged" }).map(
      (a) => a.id,
    ),
    ["route"],
  );
  // Changing an earlier answer recomputes the whole path; skipped requirements return.
  assert.throws(
    () => validateAnswers(d, { route: "All" }),
    /Extra is required/,
  );
  d.experience = "classic";
  assert.throws(
    () => validateAnswers(d, { route: "Finish" }),
    /Extra is required/,
  );
  d.experience = "multipage";
  d.pageRules[0].targetPageId = "start";
  assert.equal(draftSchema.safeParse(d).success, false);
  d.pageRules[0].targetPageId = "missing";
  assert.equal(draftSchema.safeParse(d).success, false);
  d.pageRules[0].targetPageId = "end";
  d.pageRules[0].condition.questionId = "end";
  assert.equal(draftSchema.safeParse(d).success, false);
});
test("hidden or skipped answers never trigger section routing and first rule wins", () => {
  const d = template("blank");
  d.experience = "multipage";
  d.pages = [
    { id: "one", title: "One" },
    { id: "two", title: "Two" },
    { id: "three", title: "Three" },
  ];
  d.questions = [
    {
      id: "start",
      label: "Start",
      type: "yes/no",
      required: true,
      options: [],
      pageId: "one",
    },
    {
      id: "hidden",
      label: "Hidden",
      type: "short text",
      required: false,
      options: [],
      pageId: "one",
      condition: { questionId: "start", operator: "equals", value: "Yes" },
    },
    {
      id: "two",
      label: "Two",
      type: "short text",
      required: true,
      options: [],
      pageId: "two",
    },
    {
      id: "three",
      label: "Three",
      type: "short text",
      required: true,
      options: [],
      pageId: "three",
    },
  ];
  d.pageRules = [
    {
      id: "hidden-jump",
      fromPageId: "one",
      targetPageId: "__end",
      condition: { questionId: "hidden", operator: "equals", value: "secret" },
    },
  ];
  assert.throws(
    () => validateAnswers(d, { start: "No", hidden: "secret", three: "Done" }),
    /Two is required/,
  );
  d.pageRules = [
    {
      id: "first",
      fromPageId: "one",
      targetPageId: "three",
      condition: { questionId: "start", operator: "equals", value: "Yes" },
    },
    {
      id: "second",
      fromPageId: "one",
      targetPageId: "__end",
      condition: { questionId: "start", operator: "equals", value: "Yes" },
    },
    {
      id: "skipped",
      fromPageId: "three",
      targetPageId: "__end",
      condition: { questionId: "two", operator: "equals", value: "poison" },
    },
  ];
  assert.throws(
    () => validateAnswers(d, { start: "Yes", two: "poison" }),
    /Three is required/,
  );
});
test("button text has at least 4.5:1 contrast across sampled RGB colours", () => {
  function lum(h) {
    const x = h
      .slice(1)
      .match(/../g)
      .map((v) => parseInt(v, 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return x[0] * 0.2126 + x[1] * 0.7152 + x[2] * 0.0722;
  }
  for (let r = 0; r < 256; r += 17)
    for (let g = 0; g < 256; g += 17)
      for (let b = 0; b < 256; b += 17) {
        const h =
          "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
        const a = lum(h),
          c = lum(readableText(h));
        assert.ok((Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05) >= 4.5, h);
      }
});
test("WhatsApp draft preserves Unicode and states that dates require confirmation", () => {
  const message = formatMessage({
    id: "12345678-1234",
    formTitle: "Enquiry",
    formType: "service",
    businessName: "Business & Co",
    phone: "+971500000001",
    currency: "AED",
    answers: [
      { label: "Name", value: "ليلى 🎂" },
      { label: "Notes", value: "A & B\nA second line" },
    ],
    items: [],
    total: 0,
    createdAt: new Date().toISOString(),
  });
  assert.ok(message.includes("ليلى 🎂"));
  assert.ok(message.includes("A & B\nA second line"));
  assert.ok(message.includes("preferred date is a request"));
  assert.equal(decodeURIComponent(encodeURIComponent(message)), message);
});
test("new question formats validate supported answers and reject unsafe or out-of-range values", () => {
  const draft = {
    ...template("contact"),
    questions: [
      {
        id: "link",
        label: "Website",
        type: "url",
        required: true,
        options: [],
      },
      {
        id: "rating",
        label: "Rating",
        type: "rating",
        required: true,
        options: [],
      },
      {
        id: "answer",
        label: "Gift?",
        type: "yes/no",
        required: true,
        options: [],
      },
      {
        id: "delivery",
        label: "Delivery",
        type: "dropdown",
        required: true,
        options: ["Collection", "Delivery"],
      },
    ],
  };
  assert.ok(draftSchema.safeParse(draft).success);
  const answers = {
    link: "https://example.com/reference?x=1",
    rating: "5",
    answer: "No",
    delivery: "Collection",
  };
  assert.equal(validateAnswers(draft, answers).length, 4);
  for (const bad of [
    { link: "javascript:alert(1)" },
    { link: "ftp://example.com" },
    { rating: "6" },
    { rating: "2.5" },
    { answer: "Maybe" },
    { delivery: "Unknown" },
    { rating: "" },
  ])
    assert.throws(() => validateAnswers(draft, { ...answers, ...bad }));
  const optional = {
    ...draft,
    questions: draft.questions.map((q) => ({ ...q, required: false })),
  };
  assert.equal(validateAnswers(optional, {}).length, 4);
  assert.equal(
    draftSchema.safeParse({
      ...draft,
      questions: [{ ...draft.questions[3], options: ["Only one"] }],
    }).success,
    false,
  );
});
test("conditional fields ignore hidden stale answers, validate visible requirements and prevent cycles", async () => {
  const { visibleQuestions, matchesCondition } =
    await import("../.sites-runtime/model-test.mjs");
  const d = {
    ...template("blank"),
    pages: [
      { id: "one", title: "About you" },
      { id: "two", title: "Delivery" },
    ],
    questions: [
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
      {
        id: "gate",
        label: "Gate",
        type: "short text",
        required: true,
        options: [],
        pageId: "two",
        condition: { questionId: "address", operator: "answered", value: "" },
      },
    ],
  };
  assert.ok(draftSchema.safeParse(d).success);
  assert.deepEqual(
    visibleQuestions(d, {
      method: "Pickup",
      address: "stale",
      gate: "secret",
    }).map((q) => q.id),
    ["method"],
  );
  assert.equal(
    validateAnswers(d, { method: "Pickup", address: "stale" }).length,
    1,
  );
  assert.throws(
    () => validateAnswers(d, { method: "Delivery" }),
    /Address is required/,
  );
  assert.equal(validateAnswers(d, { method: "Delivery" }, "one").length, 1);
  assert.equal(
    validateAnswers(d, {
      method: "Delivery",
      address: "Dubai",
      gate: "Front",
    })[1].page,
    "Delivery",
  );
  assert.equal(
    draftSchema.safeParse({
      ...d,
      questions: [d.questions[1], d.questions[0], d.questions[2]],
      pages: [d.pages[1], d.pages[0]],
    }).success,
    false,
  );
  assert.equal(
    draftSchema.safeParse({ ...d, pages: [d.pages[0]] }).success,
    false,
  );
  assert.equal(
    matchesCondition(
      { questionId: "tags", operator: "equals", value: "Cake" },
      { tags: ["Cake", "Flowers"] },
    ),
    true,
  );
  assert.equal(
    matchesCondition(
      { questionId: "n", operator: "greater_than", value: "10" },
      { n: "11" },
    ),
    true,
  );
  assert.equal(
    matchesCondition(
      { questionId: "n", operator: "greater_than", value: "10" },
      { n: "oops" },
    ),
    false,
  );
  assert.equal(
    matchesCondition(
      { questionId: "n", operator: "not_equals", value: "No" },
      {},
    ),
    false,
  );
});
test("interactive steps validate just the current field without weakening final validation", () => {
  const d = {
    ...template("blank"),
    experience: "interactive",
    questions: [
      {
        id: "first",
        label: "First",
        type: "short text",
        required: true,
        options: [],
      },
      {
        id: "second",
        label: "Second",
        type: "short text",
        required: true,
        options: [],
      },
    ],
  };
  assert.ok(draftSchema.safeParse(d).success);
  assert.equal(
    validateAnswers(d, { first: "Done" }, undefined, ["first"]).length,
    1,
  );
  assert.throws(
    () => validateAnswers(d, { first: "Done" }),
    /Second is required/,
  );
  assert.equal(
    draftSchema.safeParse({ ...d, experience: "unknown" }).success,
    false,
  );
  for (const experience of ["classic", "multipage", "interactive"])
    assert.ok(draftSchema.safeParse({ ...d, experience }).success);
});

test("unavailable products cannot be ordered and category metadata survives validation", () => {
  const draft = template("cake");
  draft.products[0].available = false;
  draft.products[0].category = "Celebration cakes";
  const parsed = draftSchema.parse(draft);
  assert.equal(parsed.products[0].category, "Celebration cakes");
  assert.throws(
    () =>
      calculateItems(parsed, [
        { productId: parsed.products[0].id, quantity: 1, options: {} },
      ]),
    /no longer available/,
  );
});

await build({
  entryPoints: ["lib/form-authoring.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".sites-runtime/authoring-test.mjs",
});
const { parseBulkChoices, patchQuestion } =
  await import("../.sites-runtime/authoring-test.mjs");

test("bulk choices preserve commas, trim lines and enforce server-compatible limits", () => {
  assert.deepEqual(parseBulkChoices("  Dubai, UAE \r\n\n Abu Dhabi \n"), [
    "Dubai, UAE",
    "Abu Dhabi",
  ]);
  assert.equal(
    parseBulkChoices(
      Array.from({ length: 30 }, (_, i) => `Choice ${i}`).join("\n"),
    ).length,
    30,
  );
  for (const input of [
    "Only one",
    "A\nA",
    Array.from({ length: 31 }, (_, i) => `Choice ${i}`).join("\n"),
    "x".repeat(101) + "\nB",
  ])
    assert.throws(() => parseBulkChoices(input));
});
function authoringDraft() {
  const d = template("blank");
  d.questions = [
    {
      id: "source",
      label: "Service",
      type: "single choice",
      required: true,
      options: ["Website", "Brand"],
    },
    {
      id: "follow",
      label: "Details",
      type: "short text",
      required: false,
      options: [],
      condition: { questionId: "source", operator: "equals", value: "Website" },
    },
  ];
  d.routing = {
    mode: "rules",
    memberIds: ["member"],
    rules: [
      {
        memberId: "member",
        condition: { questionId: "source", operator: "equals", value: "Brand" },
      },
    ],
  };
  return d;
}
test("bulk option reordering preserves question and routing rule meanings", () => {
  const d = authoringDraft();
  const patch = patchQuestion(d, "source", { options: ["Brand", "Website"] });
  assert.equal(patch.questions[1].condition.value, "Website");
  assert.equal(patch.routing.rules[0].condition.value, "Brand");
  assert.deepEqual(d.questions[0].options, ["Website", "Brand"]);
});
test("explicit choice renames update conditions and routing together", () => {
  const patch = patchQuestion(
    authoringDraft(),
    "source",
    { options: ["Web design", "Brand"] },
    { Website: "Web design" },
  );
  assert.equal(patch.questions[1].condition.value, "Web design");
  assert.equal(patch.routing.rules[0].condition.value, "Brand");
});
test("section jump choices follow explicit renames and block unsafe removal", () => {
  const d = authoringDraft();
  d.pageRules = [
    {
      id: "jump",
      fromPageId: "main",
      targetPageId: "__end",
      condition: { questionId: "source", operator: "equals", value: "Website" },
    },
  ];
  const patch = patchQuestion(
    d,
    "source",
    { options: ["Web design", "Brand"] },
    { Website: "Web design" },
  );
  assert.equal(patch.pageRules[0].condition.value, "Web design");
  d.questions[1].condition = undefined;
  d.routing = undefined;
  assert.throws(
    () => patchQuestion(d, "source", { options: ["Brand", "Other"] }),
    /used by a rule/,
  );
});
test("removing a choice referenced by visibility or routing rules is blocked", () => {
  const d = authoringDraft();
  assert.throws(
    () => patchQuestion(d, "source", { options: ["Brand", "Other"] }),
    /used by a rule/,
  );
  assert.throws(
    () => patchQuestion(d, "source", { options: ["Website", "Other"] }),
    /used by a rule/,
  );
});
test("substring conditions survive choice edits without being treated as option labels", () => {
  const d = authoringDraft();
  d.questions[1].condition = {
    questionId: "source",
    operator: "contains",
    value: "Web",
  };
  const patch = patchQuestion(d, "source", {
    options: ["Brand", "Website", "Other"],
  });
  assert.equal(patch.questions[1].condition.value, "Web");
});
test("optional placeholders preserve legacy forms and enforce metadata limits", () => {
  const original = template("blank");
  assert.ok(draftSchema.safeParse(original).success);
  const updated = structuredClone(original);
  updated.questions[0].placeholder = "Alex Taylor";
  assert.equal(
    draftSchema.parse(updated).questions[0].placeholder,
    "Alex Taylor",
  );
  assert.equal(original.questions[0].placeholder, undefined);
  updated.questions[0].placeholder = "x".repeat(201);
  assert.equal(draftSchema.safeParse(updated).success, false);
});

await build({
  entryPoints: [
    "lib/api-response.ts",
    "lib/form-appearance.ts",
    "lib/form-embed.ts",
  ],
  bundle: true,
  platform: "node",
  format: "esm",
  outdir: ".sites-runtime/form-fixes",
});
const { readApiResponse } =
  await import("../.sites-runtime/form-fixes/api-response.js");
const { appearanceVariables, formAppearance } =
  await import("../.sites-runtime/form-fixes/form-appearance.js");
const { widgetSnippet, iframeSnippet, websiteEmbed } =
  await import("../.sites-runtime/form-fixes/form-embed.js");
test("plain-text Worker and HTML proxy failures never surface JSON parse errors", async () => {
  for (const res of [
    new Response("Your worker has failed", { status: 503 }),
    new Response("<html>bad gateway</html>", { status: 502 }),
  ])
    await assert.rejects(
      () => readApiResponse(res),
      (e) =>
        e.status >= 500 &&
        /temporarily unavailable/.test(e.message) &&
        !e.message.includes("Unexpected token"),
    );
  await assert.rejects(
    () => readApiResponse(new Response("<html>login</html>", { status: 200 })),
    /unexpected response/,
  );
});
test("API decoding preserves structured validation errors and identifies expired sessions", async () => {
  await assert.rejects(
    () =>
      readApiResponse(
        Response.json({ error: "Choose a service" }, { status: 400 }),
      ),
    (e) => e.status === 400 && e.message === "Choose a service",
  );
  await assert.rejects(
    () => readApiResponse(new Response("Signed out", { status: 401 })),
    (e) => e.status === 401 && /session has expired/.test(e.message),
  );
  assert.deepEqual(await readApiResponse(Response.json({ ok: true })), {
    ok: true,
  });
  assert.equal(
    await readApiResponse(new Response(null, { status: 204 })),
    undefined,
  );
});
test("customer appearance is independent, bounded, and backward compatible", () => {
  const d = template("blank");
  const before = structuredClone(d);
  assert.equal(formAppearance(d).background, "#ffffff");
  assert.equal(formAppearance(d).font, "poppins");
  d.appearance = {
    background: "#101827",
    surface: "#172033",
    text: "#f8fafc",
    muted: "#cbd5e1",
    border: "#596780",
    font: "serif",
    radius: 16,
    fontSize: 18,
    hideBranding: true,
    buttonText: "Send my request",
  };
  d.button = "#facc15";
  assert.equal(draftSchema.parse(d).appearance.font, "serif");
  const vars = appearanceVariables(d);
  assert.equal(vars["--form-bg"], "#101827");
  assert.match(vars["--form-font"], /Georgia/);
  assert.equal(vars["--form-button-text"], "#000000");
  assert.equal(before.appearance, undefined);
  for (const appearance of [
    { background: "red;display:none" },
    { font: "injected" },
    { radius: 99 },
    { fontSize: 40 },
    { logo: "https://external.example/x.svg" },
    { buttonText: "x".repeat(61) },
  ])
    assert.equal(draftSchema.safeParse({ ...d, appearance }).success, false);
});
test("widget snippets escape labels and reject executable origins or malformed slugs", () => {
  const code = widgetSnippet("https://forms.example", "demo-123", {
    label: 'Ask "us" <script>',
    position: "left",
    color: "#754b33",
  });
  assert.match(code, /https:\/\/forms.example\/widget.js/);
  assert.match(code, /data-position="left"/);
  assert.match(code, /&quot;us&quot; &lt;script&gt;/);
  assert.ok(!code.includes('data-label="Ask "us"'));
  assert.throws(() =>
    widgetSnippet("javascript:alert(1)", "demo", {
      label: "Hi",
      position: "right",
      color: "#176650",
    }),
  );
  assert.throws(() =>
    widgetSnippet("https://example.com", 'x" onload="evil', {
      label: "Hi",
      position: "right",
      color: "red",
    }),
  );
  assert.match(iframeSnippet("https://forms.example", "demo"), /\?embed=1/);
});

test("Poppins and Montserrat survive published draft validation; legacy neutral fonts adopt Poppins", () => {
  const d = template("blank");
  for (const font of ["poppins", "montserrat"]) {
    const themed = draftSchema.parse({ ...d, appearance: { font } });
    assert.equal(themed.appearance.font, font);
    assert.match(
      appearanceVariables(themed)["--form-font"],
      font === "poppins" ? /Poppins/ : /Montserrat/,
    );
  }
  assert.equal(
    formAppearance({ ...d, appearance: { font: "system" } }).font,
    "poppins",
  );
  assert.equal(
    formAppearance({ ...d, appearance: { font: "serif" } }).font,
    "serif",
  );
});

test("form and appointment website embeds target their separate public flows and reject unsafe settings", () => {
  const form = websiteEmbed(
    "https://forms.example/ignored",
    "form",
    "form-123",
    700,
  );
  assert.equal(form.src, "https://forms.example/f/form-123?embed=1");
  const booking = websiteEmbed(
    "https://forms.example",
    "appointment",
    "workspace-123",
    1100,
  );
  assert.equal(booking.src, "https://forms.example/book/workspace-123?embed=1");
  assert.match(booking.code, /title="Appointment booking"/);
  assert.match(booking.code, /height="1100"/);
  assert.match(booking.code, /width="100%"/);
  for (const height of [499, 1401, NaN, 900.5])
    assert.throws(() =>
      websiteEmbed("https://forms.example", "appointment", "workspace", height),
    );
  for (const origin of ["javascript:alert(1)", "https://user:pass@example.com"])
    assert.throws(() => websiteEmbed(origin, "form", "form"));
  assert.throws(() =>
    websiteEmbed("https://forms.example", "appointment", 'x" onload="evil'),
  );
  assert.throws(() =>
    websiteEmbed("https://forms.example", "private", "workspace"),
  );
});

test("responsive embeds constrain width, include automatic sizing, and support appointment widgets", () => {
  const embed = websiteEmbed("https://forms.example", "form", "demo", 600, {
    sizing: "auto",
    maxWidth: 640,
  });
  assert.match(embed.code, /max-width:640px/);
  assert.match(embed.code, /height="320"/);
  assert.match(embed.code, /\/embed.js/);
  assert.match(embed.src, /resize=1/);
  const fixed = websiteEmbed(
    "https://forms.example",
    "appointment",
    "workspace",
    600,
    { sizing: "fixed", maxWidth: 480 },
  );
  assert.match(fixed.code, /max-width:480px/);
  assert.ok(!fixed.code.includes("embed.js"));
  assert.throws(() =>
    websiteEmbed("https://forms.example", "form", "demo", 600, {
      sizing: "auto",
      maxWidth: 99999,
    }),
  );
  const widget = widgetSnippet("https://forms.example", "workspace", {
    kind: "appointment",
    label: 'Book "now"',
    position: "left",
    color: "#176650",
  });
  assert.match(widget, /data-booking="workspace"/);
  assert.match(widget, /Book &quot;now&quot;/);
  assert.ok(!widget.includes("data-form="));
});

const { runInNewContext } = await import("node:vm");
const { readFile } = await import("node:fs/promises");
const embedLoaderSource = await readFile("public/embed.js", "utf8");
function embedHarness() {
  const listeners = {},
    writes = [],
    requests = [];
  const frame = {
    isConnected: true,
    contentWindow: {
      postMessage: (data, origin) => requests.push({ data, origin }),
    },
    getAttribute: () => "https://forms.example/f/demo?embed=1&resize=1",
    addEventListener: () => {},
    setAttribute: () => {},
    style: { setProperty: (...args) => writes.push(args) },
  };
  const window = { addEventListener: (event, fn) => (listeners[event] = fn) };
  const document = {
    currentScript: { src: "https://forms.example/embed.js" },
    readyState: "complete",
    documentElement: {},
    querySelectorAll: () => [frame],
  };
  const context = {
    window,
    document,
    location: { href: "https://host.example" },
    URL,
    MutationObserver: class {
      observe() {}
    },
  };
  runInNewContext(embedLoaderSource, context);
  return { frame, listeners, writes, requests, context };
}
test("embed loader rejects untrusted messages and accepts grow and shrink only from its own public frame", () => {
  const h = embedHarness();
  const good = {
    origin: "https://forms.example",
    source: h.frame.contentWindow,
    data: { type: "formchat:resize", kind: "form", id: "demo", height: 420 },
  };
  for (const event of [
    { ...good, origin: "https://attacker.example" },
    { ...good, source: {} },
    { ...good, data: { ...good.data, id: "other" } },
    { ...good, data: { ...good.data, kind: "appointment" } },
    ...["420", NaN, Infinity, 10, 20001].map((height) => ({
      ...good,
      data: { ...good.data, height },
    })),
  ])
    h.listeners.message(event);
  assert.equal(h.writes.length, 0);
  h.listeners.message({ ...good, data: { ...good.data, height: 420.2 } });
  assert.deepEqual(h.writes[0], ["height", "421px", "important"]);
  h.listeners.message({ ...good, data: { ...good.data, height: 250 } });
  assert.deepEqual(h.writes[1], ["height", "250px", "important"]);
  h.listeners.message({ ...good, data: { ...good.data, height: 250 } });
  assert.equal(h.writes.length, 2);
  const requests = h.requests.length;
  h.listeners.message({
    ...good,
    data: { type: "formchat:ready", kind: "form", id: "demo" },
  });
  assert.equal(h.requests.length, requests + 1);
  runInNewContext(embedLoaderSource, h.context);
  assert.equal(h.writes.length, 2);
});
