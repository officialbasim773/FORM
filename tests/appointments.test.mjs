import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

mkdirSync(".sites-runtime", { recursive: true });
await build({
  entryPoints: ["lib/appointments.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".sites-runtime/appointments-test.mjs",
});
const {
  availableSlots,
  defaultAppointments,
  defaultSchedule,
  appointmentConfigSchema,
  localDate,
} = await import("../.sites-runtime/appointments-test.mjs");
function config(timezone = "UTC") {
  return {
    ...defaultAppointments(),
    timezone,
    services: [
      {
        id: "service",
        name: "Consultation",
        description: "",
        duration: 30,
        buffer: 15,
        price: 5000,
        currency: "USD",
        providerIds: ["owner"],
      },
    ],
    providers: [
      {
        ...defaultSchedule(),
        days: Array.from({ length: 7 }, (_, day) => ({
          day,
          periods: [{ start: "00:00", end: "23:45" }],
          breaks: [],
        })),
      },
    ],
  };
}
test("availability accounts for duration, buffers, breaks and unavailable dates", () => {
  const c = config();
  c.providers[0].days[1] = {
    day: 1,
    periods: [{ start: "09:00", end: "12:00" }],
    breaks: [{ start: "10:00", end: "10:30" }],
  };
  const slots = availableSlots(
    c,
    "service",
    "owner",
    "2030-01-07",
    [
      {
        start: "2030-01-07T11:00:00.000Z",
        occupied_end: "2030-01-07T11:45:00.000Z",
      },
    ],
    0,
  );
  assert.deepEqual(
    slots.map((s) => s.start.slice(11, 16)),
    ["09:00", "09:15"],
  );
  c.unavailableDates = ["2030-01-07"];
  assert.equal(
    availableSlots(c, "service", "owner", "2030-01-07", [], 0).length,
    0,
  );
  c.unavailableDates = [];
  c.providers[0].unavailableDates = ["2030-01-07"];
  assert.equal(
    availableSlots(c, "service", "owner", "2030-01-07", [], 0).length,
    0,
  );
});
test("DST gaps have no phantom times; folds offer distinct UTC instants", () => {
  const c = config("America/New_York");
  c.services[0].buffer = 0;
  const spring = availableSlots(c, "service", "owner", "2030-03-10", [], 0);
  assert.equal(
    spring.some((s) => s.label.startsWith("02:")),
    false,
  );
  const fall = availableSlots(
    c,
    "service",
    "owner",
    "2030-11-03",
    [],
    0,
  ).filter((s) => s.label.startsWith("01:30"));
  assert.equal(fall.length, 2);
  assert.equal(Date.parse(fall[1].start) - Date.parse(fall[0].start), 3600000);
  assert.notEqual(fall[0].label, fall[1].label);
});
test("local dates and non-hour UTC offsets are respected", () => {
  const slots = availableSlots(
    config("Asia/Kathmandu"),
    "service",
    "owner",
    "2030-01-07",
    [],
    0,
  );
  assert.equal(slots[0].start, "2030-01-06T18:15:00.000Z");
  assert.equal(localDate(slots[0].start, "Asia/Kathmandu"), "2030-01-07");
  assert.equal(
    appointmentConfigSchema.safeParse({ ...config(), timezone: "Bogus/Zone" })
      .success,
    false,
  );
  const c = config();
  c.services[0].providerIds = ["foreign"];
  assert.equal(appointmentConfigSchema.safeParse(c).success, false);
});

// Run the real API and SQL migrations. Only the external identity boundary and D1
// transport are replaced; transactions, triggers, queries and validation are real.
globalThis.__appointmentTestEnv = {};
globalThis.__appointmentTestUser = null;
await build({
  entryPoints: ["app/api/[...path]/route.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".sites-runtime/appointment-route-test.mjs",
  plugins: [
    {
      name: "test-boundaries",
      setup(b) {
        b.onResolve({ filter: /^cloudflare:workers$/ }, () => ({
          path: "env",
          namespace: "fixture",
        }));
        b.onResolve({ filter: /auth-user$/ }, () => ({
          path: "identity",
          namespace: "fixture",
        }));
        b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
          contents:
            a.path === "env"
              ? "export const env=globalThis.__appointmentTestEnv"
              : "export async function getAuthUser(){return globalThis.__appointmentTestUser}",
          loader: "js",
        }));
      },
    },
  ],
});
const route = await import("../.sites-runtime/appointment-route-test.mjs");
let sqlite;
function fixture() {
  sqlite?.close();
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  for (const f of readdirSync("drizzle")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    sqlite.exec(readFileSync(`drizzle/${f}`, "utf8"));
  class Statement {
    constructor(sql, args = []) {
      this.sql = sql;
      this.args = args;
    }
    bind(...args) {
      return new Statement(this.sql, args);
    }
    async first() {
      return sqlite.prepare(this.sql).get(...this.args) || null;
    }
    async all() {
      return { results: sqlite.prepare(this.sql).all(...this.args) };
    }
    execute() {
      const r = sqlite.prepare(this.sql).run(...this.args);
      return { meta: { changes: Number(r.changes) } };
    }
    async run() {
      return this.execute();
    }
  }
  globalThis.__appointmentTestEnv.DB = {
    prepare: (sql) => new Statement(sql),
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const r = statements.map((s) => s.execute());
        sqlite.exec("COMMIT");
        return r;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  };
  globalThis.__appointmentTestUser = {
    userId: "owner",
    email: "owner@example.test",
    displayName: "Owner",
  };
  for (const [id, owner] of [
    ["business", "owner"],
    ["foreign", "other"],
  ])
    sqlite
      .prepare(
        "INSERT INTO businesses(id,owner,email,name,phone,plan,onboarded) VALUES(?,?,?,'Business','+971500000001','business',1)",
      )
      .run(id, owner, owner + "@example.test");
  const draft = {
    title: "Enquiry",
    description: "",
    type: "service",
    currency: "USD",
    accent: "#176650",
    button: "#176650",
    hideLogo: false,
    questions: [
      {
        id: "name",
        label: "Your name",
        type: "short text",
        required: true,
        options: [],
      },
    ],
    products: [],
  };
  for (const [id, appointment] of [
    ["enquiry", false],
    ["appointment", true],
  ]) {
    const d = JSON.stringify({
      ...draft,
      ...(appointment ? { appointment: { enabled: true } } : {}),
    });
    sqlite
      .prepare(
        "INSERT INTO forms(id,business_id,slug,draft,published,status,version,updated_at) VALUES(?,'business',?,?,?,'published',1,?)",
      )
      .run(id, id, d, d, new Date().toISOString());
  }
  sqlite
    .prepare(
      "INSERT INTO appointment_settings(business_id,enabled,config) VALUES('business',1,?)",
    )
    .run(JSON.stringify(config()));
  return new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
}
async function request(path, method = "GET", data, headers = {}) {
  const r = await route[method](
    new Request(`http://localhost/api/${path}`, {
      method,
      headers: {
        origin: "http://localhost",
        "content-type": "application/json",
        ...headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),
  );
  return { status: r.status, body: await r.json() };
}
function submission(appointment) {
  return {
    version: 1,
    idempotency: randomUUID(),
    token: randomUUID(),
    visitor: randomUUID(),
    startedAt: Date.now() - 5000,
    website: "",
    answers: { name: "Customer" },
    selections: [],
    ...(appointment ? { appointment } : {}),
  };
}
const choice = (date, time = "09:00") => ({
  serviceId: "service",
  providerId: "owner",
  start: `${date}T${time}:00.000Z`,
});
await build({
  entryPoints: [
    "lib/auth-rate-limit.ts",
    "lib/object-cleanup.ts",
    "lib/security-headers.ts",
  ],
  bundle: true,
  platform: "node",
  format: "esm",
  outdir: ".sites-runtime/operational-tests",
  outExtension: { ".js": ".mjs" },
});
const { authRateStorage } =
  await import("../.sites-runtime/operational-tests/auth-rate-limit.mjs");
const { retryObjectDeletions } =
  await import("../.sites-runtime/operational-tests/object-cleanup.mjs");
const { secureResponse } =
  await import("../.sites-runtime/operational-tests/security-headers.mjs");
test("authentication limits are atomic, shared and reset after expiry", async () => {
  fixture();
  const store = authRateStorage(globalThis.__appointmentTestEnv.DB);
  const attempts = await Promise.all(
    Array.from({ length: 20 }, () =>
      store.consume("signin:one", { max: 3, window: 60 }),
    ),
  );
  assert.equal(attempts.filter((x) => x.allowed).length, 3);
  assert.ok(attempts.filter((x) => !x.allowed).every((x) => x.retryAfter > 0));
  assert.equal(
    (await store.consume("signin:other", { max: 3, window: 60 })).allowed,
    true,
  );
  sqlite.exec("UPDATE auth_rates SET expires=0");
  assert.equal(
    (await store.consume("signin:one", { max: 3, window: 60 })).allowed,
    true,
  );
});
test("workspace image deletion survives R2 failure and is safely retried", async () => {
  fixture();
  sqlite.exec(
    "INSERT INTO uploads(id,business_id,mime,size) VALUES('retry-image','business','image/png',1)",
  );
  let unavailable = true;
  globalThis.__appointmentTestEnv.BUCKET = {
    async delete() {
      if (unavailable) throw Error("outage");
    },
  };
  assert.equal((await request("business", "DELETE")).status, 200);
  assert.equal(
    sqlite
      .prepare("SELECT count(*) n FROM businesses WHERE id='business'")
      .get().n,
    0,
  );
  const job = sqlite
    .prepare("SELECT * FROM object_deletions WHERE key='retry-image'")
    .get();
  assert.equal(job.attempts, 1);
  unavailable = false;
  assert.equal(
    (
      await retryObjectDeletions(
        globalThis.__appointmentTestEnv.DB,
        globalThis.__appointmentTestEnv.BUCKET,
        job.next_attempt,
      )
    ).deleted,
    1,
  );
  assert.equal(
    sqlite.prepare("SELECT count(*) n FROM object_deletions").get().n,
    0,
  );
  assert.equal(
    (
      await retryObjectDeletions(
        globalThis.__appointmentTestEnv.DB,
        globalThis.__appointmentTestEnv.BUCKET,
      )
    ).deleted,
    0,
  );
  delete globalThis.__appointmentTestEnv.BUCKET;
});
test("security headers protect private routes while allowing form and booking embeds", () => {
  for (const path of [
    "/",
    "/about",
    "/sign-in",
    "/api/responses",
    "/f/example",
    "/book/business",
  ]) {
    const response = secureResponse(
      new Request("https://forms.example" + path),
      new Response("ok"),
    );
    assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
    assert.equal(
      response.headers.get("Strict-Transport-Security"),
      "max-age=31536000",
    );
    const embedded = /^\/(f|book)\//.test(path);
    assert.equal(
      response.headers.get("X-Frame-Options"),
      embedded ? null : "DENY",
    );
    assert.ok(
      response.headers
        .get("Content-Security-Policy")
        .includes(embedded ? "frame-ancestors *" : "frame-ancestors 'none'"),
    );
  }
});
test("failed upload commits retain compensation when R2 deletion also fails", async () => {
  fixture();
  const database = globalThis.__appointmentTestEnv.DB;
  const originalBatch = database.batch;
  database.batch = async (statements) => {
    if (statements.some((s) => s.sql.includes("INSERT INTO uploads")))
      throw Error("commit unavailable");
    return originalBatch(statements);
  };
  globalThis.__appointmentTestEnv.BUCKET = {
    async put() {},
    async delete() {
      throw Error("R2 unavailable");
    },
  };
  const bytes = Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  try {
    const response = await route.POST(
      new Request("http://localhost/api/upload", {
        method: "POST",
        headers: { origin: "http://localhost", "content-type": "image/png" },
        body: bytes,
      }),
    );
    assert.equal(response.status, 500);
    assert.equal(sqlite.prepare("SELECT count(*) n FROM uploads").get().n, 0);
    assert.equal(
      sqlite.prepare("SELECT count(*) n FROM object_deletions").get().n,
      1,
    );
  } finally {
    delete globalThis.__appointmentTestEnv.BUCKET;
  }
});

test("existing enquiry flow saves the same receipt without a booking", async () => {
  fixture();
  const x = submission();
  const r = await request("public/enquiry/submit", "POST", x);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.booking, undefined);
  assert.match(r.body.message, /Customer/);
  assert.equal(sqlite.prepare("SELECT count(*) n FROM bookings").get().n, 0);
  assert.equal((await request("public/enquiry/slots")).status, 404);
  assert.equal(
    (await request("public/enquiry/submit", "POST", x)).body.id,
    r.body.id,
  );
});
const bookingInput = (appointment) => ({
  appointment,
  customer: {
    name: "Booking Customer",
    email: "booking@example.test",
    phone: "+971500000002",
    notes: "Please call on arrival.",
  },
  idempotency: randomUUID(),
  token: randomUUID(),
  startedAt: Date.now() - 5000,
  website: "",
});
const book = (input) => request("booking/business/confirm", "POST", input);
test("standalone booking creates no form or response and retries return the saved reference", async () => {
  const day = fixture();
  const x = bookingInput(choice(day));
  const r = await book(x);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.ok(r.body.id);
  assert.match(r.body.message, /Awaiting business approval/);
  const row = sqlite.prepare("SELECT * FROM bookings").get();
  assert.equal(row.form_id, null);
  assert.equal(row.submission_id, null);
  assert.equal(row.start, x.appointment.start);
  assert.equal(sqlite.prepare("SELECT count(*) n FROM submissions").get().n, 0);
  assert.equal(sqlite.prepare("SELECT count(*) n FROM usage").get().n, 0);
  const retry = await book(x);
  assert.equal(retry.status, 200);
  assert.equal(retry.body.id, r.body.id);
  assert.equal(sqlite.prepare("SELECT count(*) n FROM bookings").get().n, 1);
  assert.equal(
    (await book({ ...x, appointment: choice(day, "10:00") })).status,
    409,
  );
  assert.equal((await book({ ...x, token: randomUUID() })).status, 409);
});
test("concurrent duplicate retries return one booking with identical confirmation", async () => {
  const day = fixture(),
    x = bookingInput(choice(day));
  const result = await Promise.all([book(x), book(x)]);
  assert.deepEqual(result.map((r) => r.status).sort(), [200, 201]);
  assert.equal(result[0].body.id, result[1].body.id);
  assert.equal(sqlite.prepare("SELECT count(*) n FROM bookings").get().n, 1);
});
test("competing overlapping bookings are rejected atomically, including buffer", async () => {
  const day = fixture();
  const result = await Promise.all([
    book(bookingInput(choice(day))),
    book(bookingInput(choice(day, "09:30"))),
  ]);
  assert.deepEqual(result.map((r) => r.status).sort(), [201, 409]);
  assert.equal(sqlite.prepare("SELECT count(*) n FROM bookings").get().n, 1);
  assert.equal(sqlite.prepare("SELECT count(*) n FROM submissions").get().n, 0);
});
test("availability dates reflect time off and fully occupied days", async () => {
  const day = fixture(),
    c = config();
  c.providers[0].days.forEach(
    (d) => (d.periods = [{ start: "09:00", end: "09:45" }]),
  );
  sqlite
    .prepare("UPDATE appointment_settings SET config=?")
    .run(JSON.stringify(c));
  const path = `booking/business/dates?service=service&provider=owner&from=${day}&to=${day}`;
  assert.deepEqual((await request(path)).body.dates, [day]);
  await book(bookingInput(choice(day)));
  assert.deepEqual((await request(path)).body.dates, []);
});
test("rescheduling moves occupancy; cancelling immediately releases slots", async () => {
  const day = fixture(),
    a = await book(bookingInput(choice(day)));
  const id = a.body.id;
  assert.equal(
    (
      await request(`appointments/bookings/${id}`, "PATCH", {
        revision: 0,
        appointment: choice(day, "10:00"),
      })
    ).status,
    200,
  );
  const list = () =>
    request(
      `booking/business/slots?service=service&provider=owner&date=${day}`,
    );
  let slots = (await list()).body.slots;
  assert.ok(slots.some((s) => s.start === choice(day).start));
  assert.ok(!slots.some((s) => s.start === choice(day, "10:00").start));
  assert.equal(
    (
      await request(`appointments/bookings/${id}`, "PATCH", {
        revision: 0,
        status: "cancelled",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(`appointments/bookings/${id}`, "PATCH", {
        revision: 1,
        status: "cancelled",
      })
    ).status,
    200,
  );
  slots = (await list()).body.slots;
  assert.ok(slots.some((s) => s.start === choice(day, "10:00").start));
});
test("owner authorization, workspace isolation, and server-side contact validation", async () => {
  const day = fixture(),
    x = bookingInput(choice(day));
  const saved = await book(x);
  assert.equal(
    (
      await request("appointments/settings", "GET", undefined, {
        cookie: "formchat_workspace=foreign",
      })
    ).status,
    403,
  );
  globalThis.__appointmentTestUser = {
    userId: "other",
    email: "other@example.test",
  };
  assert.equal(
    (
      await request(`appointments/bookings/${saved.body.id}`, "PATCH", {
        revision: 0,
        status: "cancelled",
      })
    ).status,
    404,
  );
  globalThis.__appointmentTestUser = null;
  assert.equal((await request("appointments/settings")).status, 401);
  assert.equal(
    (
      await book({
        ...x,
        idempotency: randomUUID(),
        customer: { ...x.customer, name: "" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await book({
        ...x,
        idempotency: randomUUID(),
        customer: { ...x.customer, email: "bad" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await book({
        ...x,
        idempotency: randomUUID(),
        customer: { ...x.customer, phone: "123" },
      })
    ).status,
    400,
  );
  assert.equal(
    (await book(bookingInput({ ...choice(day), providerId: "foreign" })))
      .status,
    400,
  );
  assert.equal((await book(bookingInput(choice(day, "09:07")))).status, 409);
});
test("settings revision and provider guards reject stale direct inserts", () => {
  const day = fixture();
  sqlite
    .prepare(
      "UPDATE appointment_settings SET revision=1 WHERE business_id='business'",
    )
    .run();
  const insert = sqlite.prepare(
    "INSERT INTO bookings(id,business_id,service_id,provider_id,start,end,occupied_end,timezone,schedule_revision,details,created_at,updated_at) VALUES(?,'business','service',?,?,?,?, 'UTC',?,'{}',?,?)",
  );
  assert.throws(
    () =>
      insert.run(
        "stale",
        "owner",
        `${day}T09:00:00.000Z`,
        `${day}T09:30:00.000Z`,
        `${day}T09:45:00.000Z`,
        0,
        day,
        day,
      ),
    /APPOINTMENT_SETTINGS_CHANGED/,
  );
  assert.throws(
    () =>
      insert.run(
        "foreign",
        "foreign",
        `${day}T09:00:00.000Z`,
        `${day}T09:30:00.000Z`,
        `${day}T09:45:00.000Z`,
        1,
        day,
        day,
      ),
    /APPOINTMENT_PROVIDER_UNAVAILABLE/,
  );
});
test("members cannot manage bookings", async () => {
  const day = fixture();
  sqlite
    .prepare(
      "INSERT INTO members(id,business_id,user_id,email,name,phone,status,expires_at,created_at) VALUES('member','business','member-user','member@example.test','Member','+971500000002','active','2099-01-01T00:00:00.000Z',?)",
    )
    .run(new Date().toISOString());
  globalThis.__appointmentTestUser = {
    userId: "member-user",
    email: "member@example.test",
  };
  assert.equal((await request("appointments/settings")).status, 403);
  assert.equal(
    (await request(`appointments/bookings?from=${day}&to=${day}`)).status,
    403,
  );
});
test("conflicting reschedule preserves original time; completed/no-show bookings remain visible", async () => {
  const day = fixture(),
    a = await book(bookingInput(choice(day))),
    b = await book(bookingInput(choice(day, "10:00")));
  sqlite.exec("UPDATE bookings SET status='confirmed'");
  assert.equal(
    (
      await request(`appointments/bookings/${a.body.id}`, "PATCH", {
        revision: 0,
        appointment: choice(day, "10:15"),
      })
    ).status,
    409,
  );
  assert.equal(
    sqlite.prepare("SELECT start FROM bookings WHERE id=?").get(a.body.id)
      .start,
    choice(day).start,
  );
  assert.equal(
    (
      await request(`appointments/bookings/${a.body.id}`, "PATCH", {
        revision: 0,
        status: "completed",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(`appointments/bookings/${b.body.id}`, "PATCH", {
        revision: 0,
        status: "no_show",
      })
    ).status,
    200,
  );
  const r = await request(`appointments/bookings?from=${day}&to=${day}`);
  assert.deepEqual(
    r.body.bookings.map((b) => b.status),
    ["completed", "no_show"],
  );
  assert.equal(r.body.bookings[0].token_hash, undefined);
  assert.equal(r.body.bookings[0].idempotency, undefined);
});
test("product requests preserve prices, customer answers and WhatsApp handoff", async () => {
  fixture();
  const d = JSON.parse(
    sqlite.prepare("SELECT published FROM forms WHERE id='enquiry'").get()
      .published,
  );
  d.type = "product";
  d.products = [
    {
      id: "item",
      name: "Cake",
      description: "",
      image: "",
      price: 2500,
      hidden: false,
      min: 1,
      max: 9,
      allowNote: true,
      options: [],
    },
  ];
  sqlite
    .prepare("UPDATE forms SET draft=?,published=? WHERE id='enquiry'")
    .run(JSON.stringify(d), JSON.stringify(d));
  const x = submission();
  x.selections = [
    { productId: "item", quantity: 2, options: {}, note: "Happy birthday" },
  ];
  const r = await request("public/enquiry/submit", "POST", x);
  assert.equal(r.status, 201);
  assert.equal(r.body.total, 5000);
  assert.equal(r.body.booking, undefined);
  assert.match(r.body.message, /Happy birthday/);
  assert.equal(
    (
      await request("public/enquiry/handoff", "POST", {
        id: r.body.id,
        token: x.token,
      })
    ).status,
    200,
  );
  assert.equal(sqlite.prepare("SELECT count(*) n FROM bookings").get().n, 0);
});
test("old form appointment flags no longer affect enquiry submission", async () => {
  const day = fixture();
  assert.equal(
    (await request("public/appointment")).body.form.appointment,
    undefined,
  );
  assert.equal(
    (await request("public/appointment/submit", "POST", submission())).status,
    201,
  );
  assert.equal(
    (
      await request(
        "public/appointment/submit",
        "POST",
        submission(choice(day)),
      )
    ).status,
    400,
  );
  assert.equal(sqlite.prepare("SELECT count(*) n FROM bookings").get().n, 0);
});
test("service notice, booking horizon and active state apply on the server", async () => {
  const day = fixture(),
    c = config();
  c.services[0].minNoticeHours = 72;
  sqlite
    .prepare("UPDATE appointment_settings SET config=?")
    .run(JSON.stringify(c));
  assert.equal((await book(bookingInput(choice(day)))).status, 409);
  c.services[0].minNoticeHours = 0;
  c.services[0].maxAdvanceDays = 1;
  sqlite
    .prepare("UPDATE appointment_settings SET config=?")
    .run(JSON.stringify(c));
  assert.equal((await book(bookingInput(choice(day)))).status, 400);
  c.services[0].maxAdvanceDays = 90;
  c.services[0].active = false;
  sqlite
    .prepare("UPDATE appointment_settings SET config=?")
    .run(JSON.stringify(c));
  assert.equal((await request("booking/business")).body.services.length, 0);
  assert.equal((await book(bookingInput(choice(day)))).status, 409);
});
test("DST-gap breaks remain blocked, and slot intervals are configurable", () => {
  const c = config("America/New_York");
  c.providers[0].days[0].breaks = [{ start: "02:30", end: "03:30" }];
  c.services[0].slotInterval = 30;
  const slots = availableSlots(c, "service", "owner", "2030-03-10", [], 0);
  assert.equal(
    slots.some(
      (s) => s.label.startsWith("03:00") || s.label.startsWith("01:30"),
    ),
    false,
  );
  assert.ok(
    slots.every(
      (s) => s.label.slice(3, 5) === "00" || s.label.slice(3, 5) === "30",
    ),
  );
});
test("standalone migration preserves legacy booking IDs, responses and occupancy", () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  for (const f of readdirSync("drizzle")
    .filter((f) => f.endsWith(".sql") && f < "0006")
    .sort())
    db.exec(readFileSync(`drizzle/${f}`, "utf8"));
  db.exec(
    "INSERT INTO businesses(id,owner,email,name,phone) VALUES('b','o','a@example.test','Business','+971500000001'); INSERT INTO forms(id,business_id,slug,draft,updated_at) VALUES('f','b','f','{}','2030-01-01'); INSERT INTO appointment_settings(business_id,enabled,config) VALUES('b',1,'{}'); INSERT INTO bookings(id,business_id,form_id,service_id,provider_id,start,end,occupied_end,timezone,schedule_revision,details,created_at,updated_at) VALUES('legacy','b','f','s','owner','2030-01-01T09:00:00.000Z','2030-01-01T09:30:00.000Z','2030-01-01T09:45:00.000Z','UTC',0,'{}','2030-01-01','2030-01-01');",
  );
  db.exec(readFileSync("drizzle/0006_standalone_bookings.sql", "utf8"));
  assert.equal(
    db.prepare("SELECT form_id FROM bookings WHERE id='legacy'").get().form_id,
    "f",
  );
  assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
  assert.equal(
    db
      .prepare(
        "SELECT count(*) n FROM sqlite_master WHERE type='trigger' AND name LIKE 'bookings_%'",
      )
      .get().n,
    2,
  );
  db.close();
});

test("approval workflow holds pending slots, protects status access and releases declines", async () => {
  const day = fixture(),
    input = bookingInput(choice(day));
  const r = await book(input);
  assert.equal(r.body.status, "pending");
  assert.equal((await book(bookingInput(choice(day)))).status, 409);
  const url = `appointments/bookings/${r.body.id}`;
  assert.equal(
    (await request(url, "PATCH", { revision: 0, status: "completed" })).status,
    409,
  );
  assert.equal(
    (
      await request("booking/business/status", "POST", {
        id: r.body.id,
        token: randomUUID(),
      })
    ).status,
    404,
  );
  assert.equal(
    (await request(url, "PATCH", { revision: 0, status: "confirmed" })).status,
    200,
  );
  assert.equal(
    (
      await request("booking/business/status", "POST", {
        id: r.body.id,
        token: input.token,
      })
    ).body.status,
    "confirmed",
  );
  assert.equal(
    (await request(url, "PATCH", { revision: 0, status: "declined" })).status,
    409,
  );
  assert.equal(
    (await request(url, "PATCH", { revision: 1, status: "declined" })).status,
    409,
  );
  assert.equal(
    (await request(url, "PATCH", { revision: 1, status: "cancelled" })).status,
    200,
  );
  const second = await book(bookingInput(choice(day)));
  assert.equal(second.status, 201);
  assert.equal(
    (
      await request(`appointments/bookings/${second.body.id}`, "PATCH", {
        revision: 0,
        status: "declined",
      })
    ).status,
    200,
  );
  assert.equal((await book(bookingInput(choice(day)))).status, 201);
  assert.equal(
    (
      await request(`appointments/bookings/${second.body.id}`, "PATCH", {
        revision: 1,
        status: "confirmed",
      })
    ).status,
    409,
  );
});

test("approval atomically rejects a revoked provider and keeps the request pending", async () => {
  const day = fixture();
  sqlite.exec(
    "INSERT INTO members(id,business_id,name,email,phone,status,expires_at,created_at) VALUES('provider','business','Provider','provider@example.test','+12025550100','active','2099-01-01','2026-01-01')",
  );
  const settings = config();
  settings.services[0].providerIds = ["provider"];
  settings.providers[0].id = "provider";
  sqlite
    .prepare("UPDATE appointment_settings SET config=?")
    .run(JSON.stringify(settings));
  const input = bookingInput({ ...choice(day), providerId: "provider" });
  const pending = await book(input);
  assert.equal(pending.status, 201, JSON.stringify(pending.body));
  sqlite.exec("UPDATE members SET status='revoked' WHERE id='provider'");
  const accepted = await request(
    `appointments/bookings/${pending.body.id}`,
    "PATCH",
    { revision: 0, status: "confirmed" },
  );
  assert.equal(accepted.status, 409);
  assert.equal(
    sqlite
      .prepare("SELECT status FROM bookings WHERE id=?")
      .get(pending.body.id).status,
    "pending",
  );
  assert.throws(
    () =>
      sqlite
        .prepare("UPDATE bookings SET status='confirmed' WHERE id=?")
        .run(pending.body.id),
    /APPOINTMENT_PROVIDER_UNAVAILABLE/,
  );
  assert.equal(
    (
      await request(`appointments/bookings/${pending.body.id}`, "PATCH", {
        revision: 0,
        status: "declined",
      })
    ).status,
    200,
  );
});

test("concurrent acceptance and decline cannot both succeed", async () => {
  const day = fixture(),
    r = await book(bookingInput(choice(day)));
  const outcomes = await Promise.all(
    ["confirmed", "declined"].map((status) =>
      request(`appointments/bookings/${r.body.id}`, "PATCH", {
        revision: 0,
        status,
      }),
    ),
  );
  assert.deepEqual(outcomes.map((x) => x.status).sort(), [200, 409]);
});

test("customer records link bookings atomically and private notes remain private", async () => {
  const day = fixture(),
    input = bookingInput(choice(day)),
    r = await book(input);
  const list = await request("appointments/customers");
  assert.equal(list.status, 200);
  assert.equal(list.body.customers.length, 1);
  const c = list.body.customers[0];
  assert.equal(c.booking_count, 1);
  assert.equal(
    (
      await request(`appointments/customers/${c.id}`, "PATCH", {
        name: c.name,
        email: c.email,
        phone: c.phone,
        notes: "Private owner note",
        archived: false,
        revision: 0,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(`appointments/customers/${c.id}`, "PATCH", {
        name: c.name,
        email: c.email,
        phone: c.phone,
        notes: "Stale",
        archived: false,
        revision: 0,
      })
    ).status,
    409,
  );
  const profile = await request(`appointments/customers/${c.id}`);
  assert.equal(profile.body.bookings[0].id, r.body.id);
  const publicStatus = await request("booking/business/status", "POST", {
    id: r.body.id,
    token: input.token,
  });
  assert.ok(!JSON.stringify(publicStatus.body).includes("Private owner note"));
  const details = await request(`appointments/bookings/${r.body.id}`);
  assert.equal(details.body.booking.customer_id, c.id);
  assert.equal(details.body.activity[0].action, "pending");
  await request(`appointments/bookings/${r.body.id}`, "PATCH", {
    revision: 0,
    status: "confirmed",
  });
  assert.equal(
    (await request(`appointments/bookings/${r.body.id}`)).body.activity[0]
      .action,
    "confirmed",
  );
  globalThis.__appointmentTestUser = {
    userId: "other",
    email: "other@example.test",
  };
  assert.equal((await request(`appointments/customers/${c.id}`)).status, 404);
  assert.equal(
    (await request(`appointments/bookings/${r.body.id}`)).status,
    404,
  );
});

test("response pagination and CSV export include records beyond 5,000 with tied timestamps", async () => {
  fixture();
  const first = await request("public/enquiry/submit", "POST", submission());
  assert.equal(first.status, 201);
  const insert =
    sqlite.prepare(`INSERT INTO submissions(id,business_id,form_id,version,snapshot,receipt,idempotency,payload_hash,token_hash,customer,summary,total,created_at)
    SELECT ?,business_id,form_id,version,snapshot,receipt,?,payload_hash,token_hash,customer,summary,total,created_at FROM submissions WHERE id=?`);
  sqlite.exec("BEGIN");
  for (let i = 0; i < 5006; i++)
    insert.run(
      "page-" + String(i).padStart(5, "0"),
      randomUUID(),
      first.body.id,
    );
  sqlite.exec("COMMIT");
  const ids = new Set();
  let cursor = null;
  do {
    const page = await request(
      "responses?limit=100" +
        (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
    );
    assert.equal(page.status, 200);
    assert.equal(page.body.total, 5007);
    for (const row of page.body.responses) {
      assert.ok(!ids.has(row.id));
      assert.ok(!("token_hash" in row));
      ids.add(row.id);
    }
    cursor = page.body.nextCursor;
  } while (cursor);
  assert.equal(ids.size, 5007);
  assert.equal((await request("responses?cursor=bad")).status, 400);
  assert.equal((await request("responses?limit=1000")).status, 400);
  const csv = await route.GET(
    new Request("http://localhost/api/responses/export"),
  );
  assert.equal(csv.status, 200);
  const text = await csv.text();
  assert.equal((text.match(/"page-\d{5}"/g) || []).length, 5006);
  globalThis.__appointmentTestUser = {
    userId: "other",
    email: "other@example.test",
  };
  assert.equal((await request("responses")).body.total, 0);
  const isolated = await route.GET(
    new Request("http://localhost/api/responses/export"),
  );
  assert.ok(!(await isolated.text()).includes("page-"));
});

test("owner-created appointments use availability guards and are confirmed immediately", async () => {
  const day = fixture(),
    input = bookingInput(choice(day));
  const r = await request("appointments/bookings", "POST", input);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.status, "confirmed");
  assert.equal(
    (await request("appointments/bookings", "POST", input)).body.id,
    r.body.id,
  );
  assert.equal(
    (await request("appointments/bookings", "POST", bookingInput(choice(day))))
      .status,
    409,
  );
  assert.equal(
    sqlite.prepare("SELECT count(*) n FROM appointment_customers").get().n,
    1,
  );
  assert.equal(sqlite.prepare("SELECT count(*) n FROM submissions").get().n, 0);
  const pending = await book(bookingInput(choice(day, "11:00")));
  const queue = await request("appointments/bookings?status=pending");
  assert.deepEqual(
    queue.body.bookings.map((b) => b.id),
    [pending.body.id],
  );
});
