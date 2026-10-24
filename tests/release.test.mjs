import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { productionConfig } from "../scripts/production-config.mjs";
test("production configuration rejects absent infrastructure and preview IDs", () => {
  assert.throws(() => productionConfig({}), /CF_WORKER_NAME/);
  const fields = {
    CF_WORKER_NAME: "formchat",
    CF_D1_DATABASE_NAME: "database",
    CF_D1_DATABASE_ID: "00000000-0000-4000-8000-000000000000",
    CF_R2_BUCKET_NAME: "images",
    BETTER_AUTH_URL: "https://app.real-domain.com",
  };
  assert.throws(() => productionConfig(fields), /provisioned/);
  fields.CF_D1_DATABASE_ID = "792b40ad-17f3-41ef-aa87-55c94a6f487d";
  for (const value of [
    "http://app.real-domain.com",
    "https://localhost",
    "https://host.example",
    "https://app.real-domain.com/path",
  ])
    assert.throws(() =>
      productionConfig({ ...fields, BETTER_AUTH_URL: value }),
    );
  const config = productionConfig(fields);
  assert.equal(config.vars.APP_ENV, "production");
  assert.equal(config.triggers.crons[0], "*/5 * * * *");
  assert.equal(config.observability.enabled, true);
});
test("migration journal includes every append-only SQL file and latest schema checkpoint", () => {
  const journal = JSON.parse(
    readFileSync("drizzle/meta/_journal.json", "utf8"),
  );
  const sql = readdirSync("drizzle")
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => f.slice(0, -4));
  assert.deepEqual(
    journal.entries.map((e) => e.tag),
    sql,
  );
  assert.deepEqual(
    journal.entries.map((e) => e.idx),
    sql.map((_, i) => i),
  );
  const snapshot = JSON.parse(
    readFileSync("drizzle/meta/0010_snapshot.json", "utf8"),
  );
  for (const name of [
    "bookings",
    "appointment_customers",
    "auth_rates",
    "object_deletions",
    "user",
  ])
    assert.ok(snapshot.tables[name]);
});
