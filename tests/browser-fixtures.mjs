// Local-only disposable data and a cross-origin website for manual browser QA.
// Keep running while testing; press Enter to remove the test workspace.
import { localAuth } from "./local-auth.mjs";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { build } from "esbuild";
const base = "http://localhost:5174";
mkdirSync(".sites-runtime", { recursive: true });
await build({
  entryPoints: ["lib/form-embed.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".sites-runtime/browser-embed.mjs",
});
const { websiteEmbed, widgetSnippet } =
  await import("../.sites-runtime/browser-embed.mjs");
const identity = await localAuth(base);
async function api(path, method = "GET", data) {
  const response = await fetch(base + "/api/" + path, {
    method,
    headers: { cookie: identity.cookie, "Content-Type": "application/json" },
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw Error(`${path}: ${JSON.stringify(result)}`);
  return result;
}
let business, server;
try {
  business = await api("business", "POST", {
    name: "Browser QA Studio",
    phone: "+12025550100",
    logo: "",
    accent: "#176650",
    button: "#176650",
  });
  const sql = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/sites-env.mjs",
      "node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      "DB",
      "--local",
      "--config",
      "dist/server/wrangler.json",
      "--persist-to",
      ".wrangler/state",
      "--command",
      `UPDATE businesses SET plan='business' WHERE id='${business.id}' AND owner='${identity.userId}'`,
    ],
    { encoding: "utf8" },
  );
  if (sql.status) throw Error("Could not configure isolated QA plan.");
  const upload = await fetch(base + "/api/upload", {
    method: "POST",
    headers: { cookie: identity.cookie, "Content-Type": "image/png" },
    body: readFileSync("tests/fixtures/landscape.png"),
  });
  if (!upload.ok) throw Error("Test image upload failed.");
  const image = (await upload.json()).url;
  const forms = {};
  for (const experience of ["classic", "multipage", "interactive"]) {
    let form = await api("forms", "POST", {
      template: "blank",
      type: experience === "multipage" ? "product" : "service",
      experience,
    });
    const draft = {
      ...form.draft,
      title: `QA ${experience} form`,
      description: "Browser testing only. No real requests or messages.",
      experience,
      completion: {
        title: "QA response saved",
        description:
          "This is a test receipt. Nothing is sent to WhatsApp automatically.",
        autoOpenWhatsApp: false,
      },
      appearance: {
        font: experience === "multipage" ? "montserrat" : "poppins",
        background: "#ffffff",
        surface: "#ffffff",
        text: "#243134",
        radius: 12,
        buttonText: "Submit test response",
      },
      pages: [
        { id: "details", title: "Your details" },
        { id: "preferences", title: "Your preferences" },
      ],
      questions: [
        {
          id: "name",
          label: "Your name",
          type: "short text",
          required: true,
          options: [],
          pageId: "details",
        },
        {
          id: "email",
          label: "Email",
          type: "email",
          required: true,
          options: [],
          pageId: "details",
        },
        {
          id: "style",
          label: "Choose a style",
          type: "single choice",
          required: true,
          options: ["Garden", "Sunshine"],
          pageId: "preferences",
          choiceStyle: "pictures",
          optionImages: { Garden: image, Sunshine: image },
        },
        {
          id: "notes",
          label: "Notes",
          type: "long text",
          required: false,
          options: [],
          pageId: "preferences",
        },
      ],
      interactive: {
        welcome: true,
        progress: true,
        keyboard: true,
        startLabel: "Begin test",
        media: {
          src: image,
          alt: "QA landscape image",
          fit: "cover",
          layout: "above",
        },
      },
      ...(experience === "multipage"
        ? {
            pages: [
              { id: "details", title: "Your details" },
              { id: "preferences", title: "Your preferences" },
            ],
            products: [
              {
                id: "bouquet",
                name: "QA bouquet",
                description: "A test product",
                image,
                price: 2500,
                hidden: false,
                min: 1,
                max: 5,
                allowNote: true,
                options: [],
              },
            ],
          }
        : {}),
    };
    form = await api(`forms/${form.id}`, "PATCH", {
      draft,
      revision: form.revision,
    });
    form = await api(`forms/${form.id}/publish`, "POST", {
      revision: form.revision,
    });
    forms[experience] = {
      id: form.id,
      slug: form.slug,
      url: base + "/f/" + form.slug,
    };
  }
  await api("appointments/settings", "PATCH", {
    enabled: true,
    revision: -1,
    config: {
      timezone: "America/New_York",
      unavailableDates: [],
      services: [
        {
          id: "consultation",
          name: "QA Consultation",
          description: "A test appointment",
          duration: 30,
          buffer: 15,
          price: 2500,
          currency: "USD",
          providerIds: ["owner"],
        },
      ],
      providers: [
        {
          id: "owner",
          unavailableDates: [],
          days: Array.from({ length: 7 }, (_, day) => ({
            day,
            periods: [{ start: "09:00", end: "17:00" }],
            breaks: [{ start: "12:00", end: "13:00" }],
          })),
        },
      ],
    },
  });
  const pages = {
    "/form-embed": websiteEmbed(base, "form", forms.classic.slug, 600, {
      sizing: "auto",
      maxWidth: 640,
    }).code,
    "/booking-embed": websiteEmbed(base, "appointment", business.id, 600, {
      sizing: "auto",
      maxWidth: 640,
    }).code,
    "/form-widget": widgetSnippet(base, forms.interactive.slug, {
      label: "Contact the studio",
      position: "right",
      color: "#176650",
    }),
    "/booking-widget": widgetSnippet(base, business.id, {
      label: "Book a consultation",
      position: "left",
      color: "#176650",
      kind: "appointment",
    }),
  };
  server = createServer((request, response) => {
    const path = new URL(request.url, "http://localhost:5180").pathname;
    response.writeHead(200, { "Content-Type": "text/html;charset=utf-8" });
    response.end(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QA host website</title><style>body{margin:0;font:16px system-ui;color:#17342b}main{max-width:1000px;margin:auto;padding:20px}nav{display:flex;gap:12px;flex-wrap:wrap}a{color:#176650}.site-section{margin:20px 0;padding:16px;background:#f6f8f7;border:1px solid #dee5e1;border-radius:12px;min-width:0}h1{font-size:clamp(24px,5vw,38px)}*{box-sizing:border-box}</style></head><body><main><nav>${Object.keys(
        pages,
      )
        .map((key) => `<a href="${key}">${key.slice(1)}</a>`)
        .join(
          "",
        )}</nav><h1>A real host website</h1><p>The form and booking integrations must stay within this website.</p><section class="site-section">${pages[path] || "<p>Choose an integration above.</p>"}</section><p id="after-embed">The rest of the website remains usable.</p></main></body></html>`,
    );
  });
  await new Promise((resolve) => server.listen(5180, "127.0.0.1", resolve));
  writeFileSync(
    ".sites-runtime/browser-fixtures.json",
    JSON.stringify(
      {
        businessId: business.id,
        forms,
        bookingUrl: base + "/book/" + business.id,
        host: "http://localhost:5180",
      },
      null,
      2,
    ),
  );
  console.log(
    "QA fixtures ready. Public URLs: .sites-runtime/browser-fixtures.json. Press Enter to clean up.",
  );
  process.stdin.resume();
  await new Promise((resolve) => process.stdin.once("data", resolve));
} finally {
  server?.close();
  if (business) await api("business", "DELETE");
  identity.cleanup();
  process.stdin.pause();
  console.log("QA workspace and account removed.");
}
