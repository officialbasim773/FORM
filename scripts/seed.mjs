// Local-only demo fixtures. Never run these against a customer database.
import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
await mkdir(".sites-runtime", { recursive: true });
await build({
  entryPoints: ["lib/templates.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".sites-runtime/templates.mjs",
});
await build({
  entryPoints: ["lib/model.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".sites-runtime/model.mjs",
});
const { template } = await import("../.sites-runtime/templates.mjs");
const { validateAnswers, calculateItems, formatMessage } =
  await import("../.sites-runtime/model.mjs");
const quote = (v) =>
  v === null ? "NULL" : "'" + String(v).replaceAll("'", "''") + "'";
const statements = [];
function insert(table, row) {
  statements.push(
    `INSERT OR IGNORE INTO ${table}(${Object.keys(row).join(",")}) VALUES(${Object.values(row).map(quote).join(",")});`,
  );
}
const date = (days) => new Date(Date.now() - days * 86400000).toISOString();
const companies = [
  {
    id: "demo-service",
    owner: "local_seedy",
    email: "seedy@sites.test",
    name: "Willow Home Services",
    phone: "+971500000001",
    logo: "",
    accent: "#176650",
    button: "#176650",
    plan: "business",
    onboarded: 1,
  },
  {
    id: "demo-cake",
    owner: "local_cake",
    email: "cake@sites.test",
    name: "Butter & Crumb",
    phone: "+971500000002",
    logo: "",
    accent: "#704591",
    button: "#704591",
    plan: "business",
    onboarded: 1,
  },
];
for (const b of companies) insert("businesses", b);
const specs = [
  [
    "demo-service",
    "home-enquiry",
    "quote",
    "Home cleaning enquiry",
    "published",
    0,
  ],
  [
    "demo-service",
    "deep-clean",
    "quote",
    "Deep cleaning quote",
    "published",
    1,
  ],
  ["demo-service", "move-in", "quote", "Move-in cleaning", "draft", 3],
  [
    "demo-service",
    "consultation",
    "appointment",
    "Home care consultation",
    "paused",
    5,
  ],
  [
    "demo-cake",
    "cake-order",
    "cake",
    "Your celebration, made sweeter",
    "published",
    0,
  ],
];
for (const [bid, slug, t, title, status, days] of specs) {
  const b = companies.find((b) => b.id === bid);
  const d = template(t);
  d.title = title;
  d.accent = b.accent;
  d.button = b.button;
  if (t === "quote") {
    d.description =
      "A little about your home, and what you need. We’ll take it from there on WhatsApp.";
    d.questions.find((q) => q.id === "service").options = [
      "Regular home cleaning",
      "Deep cleaning",
      "Move-in cleaning",
    ];
  }
  if (t === "cake")
    d.description =
      "Choose the details for your celebration cake. We’ll confirm availability and delivery with you on WhatsApp.";
  const id = "form-" + slug;
  const published = status !== "draft";
  insert("forms", {
    id,
    business_id: bid,
    slug,
    draft: JSON.stringify(d),
    published: published ? JSON.stringify(d) : null,
    status,
    version: published ? 1 : 0,
    revision: 0,
    updated_at: date(days),
    deleted: 0,
  });
  if (published)
    insert("versions", {
      id: "version-" + slug,
      form_id: id,
      version: 1,
      snapshot: JSON.stringify(d),
      created_at: date(days),
    });
  if (!published) continue;
  const count =
    slug === "home-enquiry"
      ? 12
      : slug === "deep-clean"
        ? 7
        : slug === "cake-order"
          ? 5
          : 3;
  for (let i = 0; i < count; i++) {
    const customer = [
      "Amira Hassan",
      "James Wilson",
      "Sara Ahmed",
      "Omar Khalid",
      "Priya Shah",
      "Laila Ibrahim",
    ][i % 6];
    const answers = {
      name: customer,
      phone: "+971500000099",
      service: t === "appointment" ? "Consultation" : "Regular home cleaning",
      location: "Marina, Dubai",
      address: "Jumeirah, Dubai",
      date: "2026-10-12",
      time: "10:00",
      notes: "Please call before arriving.",
    };
    const items =
      t === "cake"
        ? calculateItems(d, [
            {
              productId: "cake",
              quantity: 1,
              options: {
                size: "eight",
                flavour: "vanilla",
                inscription: "Happy birthday, Amira!",
              },
            },
          ])
        : [];
    const rid = `seed-${slug}-${i}`;
    const receiptBase = {
      id: rid,
      formTitle: d.title,
      formType: d.type,
      businessName: b.name,
      phone: b.phone,
      currency: d.currency,
      answers: validateAnswers(d, answers),
      items,
      total: items.reduce((s, x) => s + x.total, 0),
      createdAt: date(i + 1),
    };
    const receipt = { ...receiptBase, message: formatMessage(receiptBase) };
    insert("submissions", {
      id: rid,
      business_id: bid,
      form_id: id,
      version: 1,
      snapshot: JSON.stringify(d),
      receipt: JSON.stringify(receipt),
      idempotency: rid,
      payload_hash: "seed",
      token_hash: createHash("sha256").update(randomUUID()).digest("hex"),
      customer,
      summary: items.length
        ? "1 × Celebration cake"
        : "Regular home cleaning · Marina, Dubai",
      total: receipt.total,
      created_at: receipt.createdAt,
      handoff_at: i % 3 ? receipt.createdAt : null,
    });
  }
  for (let i = 0; i < count * 3; i++) {
    const visitor = `demo-${slug}-${i}`;
    for (const kind of i % 2 ? ["view", "start"] : ["view"])
      insert("events", {
        id: visitor + "-" + kind,
        business_id: bid,
        form_id: id,
        visitor,
        kind,
        day: date(i % 25).slice(0, 10),
        created_at: date(i % 25),
      });
  }
}
statements.push(
  "INSERT INTO usage(key,business_id,month,count) SELECT business_id || ':' || substr(created_at,1,7),business_id,substr(created_at,1,7),count(*) FROM submissions WHERE business_id IN ('demo-service','demo-cake') GROUP BY business_id,substr(created_at,1,7) ON CONFLICT(key) DO UPDATE SET count=MAX(usage.count,excluded.count);",
);
await writeFile(".sites-runtime/seed.sql", statements.join("\n"));
const res = spawnSync(
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
    "--file",
    ".sites-runtime/seed.sql",
  ],
  { stdio: "pipe" },
);
if (res.status !== 0) {
  process.stderr.write(res.stderr);
  process.stderr.write(res.stdout);
  process.exit(res.status || 1);
}
console.log(
  "Seeded local service and cake-shop workspaces. Default preview identity: local_seedy. Public demos: /f/home-enquiry and /f/cake-order. Phone numbers are dummy values; replace before sharing.",
);
