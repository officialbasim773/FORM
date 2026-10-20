import { z } from "zod";
import { CURRENCIES, QUESTION_TYPES } from "./config";
const id = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[\w-]+$/);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const image = z
  .string()
  .max(180)
  .refine(
    (v) => !v || /^\/api\/images\/[\w-]+$/.test(v),
    "Upload an image using the image picker.",
  );
export const formMediaSchema = z.object({
  src: image,
  alt: z.string().max(240),
  fit: z.enum(["cover", "contain"]),
  layout: z.enum(["above", "side"]),
});
export type FormMedia = z.infer<typeof formMediaSchema>;
export const conditionSchema = z.object({
  questionId: id,
  operator: z.enum([
    "equals",
    "not_equals",
    "contains",
    "answered",
    "not_answered",
    "greater_than",
    "less_than",
  ]),
  value: z.string().max(4000).default(""),
});
export type Condition = z.infer<typeof conditionSchema>;
export type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "invited" | "active" | "revoked";
  expires_at?: string;
};
export const questionSchema = z
  .object({
    id,
    label: z.string().trim().min(1).max(180),
    description: z.string().max(400).optional(),
    choiceStyle: z.enum(["text", "pictures"]).optional(),
    choiceImageFit: z.enum(["cover", "contain"]).optional(),
    media: formMediaSchema.optional(),
    optionImages: z
      .record(z.string().max(100), image)
      .refine(
        (v) => Object.keys(v).length <= 30,
        "Up to 30 picture choices are supported.",
      )
      .optional(),
    type: z.enum(QUESTION_TYPES),
    required: z.boolean(),
    pageId: id.optional(),
    condition: conditionSchema.optional(),
    options: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  })
  .superRefine((q, c) => {
    if (new Set(q.options).size !== q.options.length)
      c.addIssue({
        code: "custom",
        message: "Each answer option needs a different label.",
      });
    if (
      (q.type.includes("choice") || q.type === "dropdown") &&
      q.options.length < 2
    )
      c.addIssue({
        code: "custom",
        message: "Choice questions need at least two options.",
      });
  });
export const optionSchema = z
  .object({
    id,
    name: z.string().trim().min(1).max(80),
    type: z.enum(["choice", "text"]),
    required: z.boolean(),
    values: z
      .array(
        z.object({
          id,
          label: z.string().trim().min(1).max(80),
          adjustment: z.number().int().min(0).max(10000000),
        }),
      )
      .max(30),
  })
  .superRefine((o, c) => {
    if (o.type === "choice" && !o.values.length)
      c.addIssue({
        code: "custom",
        message: "Add a choice to the product option.",
      });
  });
export const productSchema = z
  .object({
    id,
    name: z.string().trim().min(1).max(120),
    description: z.string().max(600),
    image,
    price: z.number().int().min(0).max(10000000),
    hidden: z.boolean(),
    category: z.string().trim().max(60).optional(),
    available: z.boolean().optional(),
    min: z.number().int().min(1).max(999),
    max: z.number().int().min(1).max(999),
    allowNote: z.boolean(),
    options: z.array(optionSchema).max(12),
  })
  .refine((p) => p.min <= p.max, "Minimum quantity cannot exceed maximum.");
export const draftSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().max(700),
    type: z.enum(["service", "product"]),
    currency: z.enum(CURRENCIES),
    accent: color,
    button: color,
    hideLogo: z.boolean(),
    experience: z.enum(["classic", "multipage", "interactive"]).optional(),
    interactive: z
      .object({
        welcome: z.boolean(),
        progress: z.boolean(),
        keyboard: z.boolean(),
        startLabel: z.string().trim().min(1).max(40),
        media: formMediaSchema.optional(),
        welcomeTitle: z.string().max(120).optional(),
        welcomeDescription: z.string().max(500).optional(),
      })
      .optional(),
    questions: z.array(questionSchema).min(1).max(40),
    products: z.array(productSchema).max(40),
    pages: z
      .array(z.object({ id, title: z.string().trim().min(1).max(100) }))
      .min(1)
      .max(10)
      .optional(),
    routing: z
      .object({
        mode: z.enum(["owner", "member", "round_robin", "rules"]),
        memberIds: z.array(id).max(30).default([]),
        rules: z
          .array(z.object({ condition: conditionSchema, memberId: id }))
          .max(20)
          .default([]),
      })
      .optional(),
  })
  .superRefine((d, c) => {
    if (
      d.routing &&
      new Set(d.routing.memberIds).size !== d.routing.memberIds.length
    )
      c.addIssue({
        code: "custom",
        message: "Choose each routing member only once.",
      });
    const pages = d.pages || [{ id: "main", title: "Your details" }];
    if (new Set(pages.map((p) => p.id)).size !== pages.length)
      c.addIssue({ code: "custom", message: "Duplicate page identifier." });
    const ordered = pages.flatMap((p) =>
      d.questions.filter((q) => (q.pageId || pages[0].id) === p.id),
    );
    for (const q of d.questions) {
      if (q.pageId && !pages.some((p) => p.id === q.pageId))
        c.addIssue({
          code: "custom",
          message: `${q.label}: choose an existing page.`,
        });
      if (
        q.condition &&
        !ordered
          .slice(0, ordered.indexOf(q))
          .some((x) => x.id === q.condition!.questionId)
      )
        c.addIssue({
          code: "custom",
          message: `${q.label}: conditions must use an earlier question.`,
        });
    }
    for (const rule of d.routing?.rules || [])
      if (!d.questions.some((q) => q.id === rule.condition.questionId))
        c.addIssue({
          code: "custom",
          message: "Routing must use an existing question.",
        });
    if (
      d.routing &&
      ["member", "round_robin"].includes(d.routing.mode) &&
      !d.routing.memberIds.length
    )
      c.addIssue({
        code: "custom",
        message: "Choose a team member for routing.",
      });
    for (const list of [
      d.questions,
      d.products,
      ...d.products.map((p) => p.options),
      ...d.products.flatMap((p) => p.options.map((o) => o.values)),
    ])
      if (new Set(list.map((x) => x.id)).size !== list.length)
        c.addIssue({ code: "custom", message: "Duplicate field identifier." });
  });
export const businessSchema = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z
    .string()
    .regex(
      /^\+[1-9]\d{7,14}$/,
      "Use an international number, for example +971501234567.",
    ),
  logo: image,
  accent: color,
  button: color,
});
export type Draft = z.infer<typeof draftSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Product = z.infer<typeof productSchema>;
export type Business = z.infer<typeof businessSchema> & {
  id: string;
  owner: string;
  email: string;
  plan: "free" | "business";
  onboarded: number;
  role?: "owner" | "member";
  memberId?: string;
  appointments_configured?: number;
};
export type FormRecord = {
  id: string;
  business_id: string;
  slug: string;
  draft: Draft;
  published: Draft | null;
  status: "draft" | "published" | "paused";
  version: number;
  revision: number;
  updated_at: string;
  submissions: number;
};
export type Answers = Record<string, string | string[]>;
export type Selection = {
  productId: string;
  quantity: number;
  options: Record<string, string>;
  note?: string;
};
export type Line = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  options: { name: string; value: string; adjustment: number }[];
  note: string;
};
export type Receipt = {
  id: string;
  formTitle: string;
  formType: string;
  businessName: string;
  phone: string;
  currency: string;
  answers: {
    id?: string;
    page?: string;
    label: string;
    value: string | string[];
  }[];
  items: Line[];
  total: number;
  booking?: {
    id: string;
    start: string;
    end: string;
    timezone: string;
    serviceName: string;
    providerName: string;
    price: number;
    currency: string;
  };
  message: string;
  token: string;
  createdAt: string;
};
export function readableText(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/../g)!
    .map((x) => parseInt(x, 16) / 255)
    .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  const lum = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  return (lum + 0.05) / 0.05 >= 4.5 ? "#000000" : "#ffffff";
}
export function money(n: number, currency = "USD") {
  return new Intl.NumberFormat("en", { style: "currency", currency }).format(
    n / 100,
  );
}
export function toMinor(value: string) {
  if (!/^\d{1,8}(\.\d{0,2})?$/.test(value))
    throw new Error("Enter a price with at most two decimal places.");
  const [a, b = ""] = value.split(".");
  return Number(a) * 100 + Number(b.padEnd(2, "0"));
}
export function calculateItems(draft: Draft, selections: Selection[]): Line[] {
  if (
    selections.length > 40 ||
    new Set(selections.map((s) => s.productId)).size !== selections.length
  )
    throw new Error("Invalid product selection.");
  return selections.map((s) => {
    const p = draft.products.find((x) => x.id === s.productId && !x.hidden);
    if (!p || p.available === false)
      throw new Error("A selected product is no longer available.");
    if (
      !Number.isInteger(s.quantity) ||
      s.quantity < p.min ||
      s.quantity > p.max
    )
      throw new Error(`${p.name}: choose ${p.min}–${p.max} items.`);
    const options = p.options.map((o) => {
      const value = s.options[o.id] || "";
      if (o.required && !value.trim())
        throw new Error(`Choose ${o.name} for ${p.name}.`);
      if (value.length > 500) throw new Error(`${o.name} is too long.`);
      if (o.type === "text") return { name: o.name, value, adjustment: 0 };
      const choice = o.values.find((v) => v.id === value);
      if (value && !choice) throw new Error(`Invalid ${o.name}.`);
      return {
        name: o.name,
        value: choice?.label || "",
        adjustment: choice?.adjustment || 0,
      };
    });
    const unitPrice = p.price + options.reduce((n, o) => n + o.adjustment, 0);
    const note = p.allowNote ? s.note || "" : "";
    if (note.length > 1000) throw new Error("Product note is too long.");
    return {
      name: p.name,
      quantity: s.quantity,
      unitPrice,
      total: unitPrice * s.quantity,
      options,
      note,
    };
  });
}
export function matchesCondition(condition: Condition, answers: Answers) {
  const raw = answers[condition.questionId];
  const values = (Array.isArray(raw) ? raw : [raw || ""]).map((v) => v.trim());
  const answered = values.some(Boolean);
  const value = condition.value.trim();
  switch (condition.operator) {
    case "answered":
      return answered;
    case "not_answered":
      return !answered;
    case "equals":
      return answered && values.includes(value);
    case "not_equals":
      return answered && !values.includes(value);
    case "contains":
      return (
        answered &&
        values.some((v) => v.toLowerCase().includes(value.toLowerCase()))
      );
    case "greater_than":
      return (
        answered &&
        value !== "" &&
        Number.isFinite(Number(values[0])) &&
        Number(values[0]) > Number(value)
      );
    case "less_than":
      return (
        answered &&
        value !== "" &&
        Number.isFinite(Number(values[0])) &&
        Number(values[0]) < Number(value)
      );
  }
}
export function formPages(draft: Draft) {
  return draft.pages || [{ id: "main", title: "Your details" }];
}
export function visibleQuestions(draft: Draft, answers: Answers) {
  const pages = formPages(draft);
  const ordered = pages.flatMap((p) =>
    draft.questions.filter((q) => (q.pageId || pages[0].id) === p.id),
  );
  const visible: Question[] = [];
  const clean: Answers = {};
  for (const q of ordered) {
    // Hidden parent answers never trigger a dependent question, even when forged.
    if (
      !q.condition ||
      (visible.some((p) => p.id === q.condition!.questionId) &&
        matchesCondition(q.condition, clean))
    ) {
      visible.push(q);
      if (answers[q.id] !== undefined) clean[q.id] = answers[q.id];
    }
  }
  return visible;
}
export function validateAnswers(
  draft: Draft,
  answers: Answers,
  pageId?: string,
  questionIds?: string[],
) {
  return visibleQuestions(draft, answers)
    .filter((q) => !questionIds || questionIds.includes(q.id))
    .filter((q) => !pageId || (q.pageId || formPages(draft)[0].id) === pageId)
    .map((q) => {
      let v = answers[q.id] ?? (q.type === "multiple choice" ? [] : "");
      if (q.type === "multiple choice") {
        if (
          !Array.isArray(v) ||
          v.some((x) => !q.options.includes(x)) ||
          new Set(v).size !== v.length
        )
          throw new Error(`Check ${q.label}.`);
      } else if (typeof v !== "string") throw new Error(`Check ${q.label}.`);
      if (q.required && (!v.length || (typeof v === "string" && !v.trim())))
        throw new Error(`${q.label} is required.`);
      if (typeof v === "string" && v.length > 4000)
        throw new Error(`${q.label} is too long.`);
      if (v && typeof v === "string") {
        if (q.type === "rating" && !/^[1-5]$/.test(v))
          throw new Error("Choose a rating from 1 to 5.");
        if (q.type === "yes/no" && !["Yes", "No"].includes(v))
          throw new Error(`Check ${q.label}.`);
        if (q.type === "url") {
          try {
            const url = new URL(v);
            if (!["http:", "https:"].includes(url.protocol)) throw new Error();
          } catch {
            throw new Error(
              "Enter a valid website link starting with https:// or http://.",
            );
          }
        }
        if (q.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
          throw new Error("Enter a valid email address.");
        if (q.type === "phone" && !/^\+?[\d\s()-]{7,22}$/.test(v))
          throw new Error("Enter a valid phone number.");
        if (
          q.type === "date" &&
          (!/^\d{4}-\d{2}-\d{2}$/.test(v) ||
            isNaN(Date.parse(v)) ||
            new Date(v).toISOString().slice(0, 10) !== v)
        )
          throw new Error("Enter a valid date.");
        if (q.type === "time" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v))
          throw new Error("Enter a valid time.");
        if (q.type === "number" && !/^-?\d+(\.\d+)?$/.test(v))
          throw new Error("Enter a valid number.");
        if (
          (q.type === "single choice" || q.type === "dropdown") &&
          !q.options.includes(v)
        )
          throw new Error(`Check ${q.label}.`);
      }
      return {
        id: q.id,
        page: formPages(draft).find(
          (p) => p.id === (q.pageId || formPages(draft)[0].id),
        )?.title,
        label: q.label,
        value: v,
      };
    });
}
export function formatMessage(r: Omit<Receipt, "message" | "token">) {
  return [
    `Hello ${r.businessName},`,
    `I’ve submitted ${r.formTitle}.`,
    `Reference: ${r.id.slice(0, 8)}`,
    "",
    ...r.answers
      .filter((a) => a.value.length)
      .map(
        (a) =>
          `${a.label}: ${Array.isArray(a.value) ? a.value.join(", ") : a.value}`,
      ),
    ...r.items.flatMap((i) => [
      "",
      `${i.quantity} × ${i.name} — ${money(i.total, r.currency)}`,
      ...i.options
        .filter((o) => o.value)
        .map(
          (o) =>
            `  ${o.name}: ${o.value}${o.adjustment ? ` (+${money(o.adjustment, r.currency)} each)` : ""}`,
        ),
      ...(i.note ? [`  Note: ${i.note}`] : []),
    ]),
    ...(r.items.length
      ? [
          "",
          `Estimated total: ${money(r.total, r.currency)}`,
          "Please confirm availability, delivery charges and the final price.",
        ]
      : r.booking
        ? []
        : [
            "",
            "Please confirm availability. Any preferred date is a request.",
          ]),
  ].join("\n");
}

export type User = { email: string; displayName: string };
