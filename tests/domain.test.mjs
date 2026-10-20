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
