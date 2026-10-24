import assert from "node:assert/strict";
import { readdirSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { localAuth } from "./local-auth.mjs";
const base = process.env.TEST_URL || "http://localhost:5174";
const session = await localAuth(base);
async function request(path, method = "GET", data, headers = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      cookie: session.cookie,
      origin: new URL(base).origin,
      ...headers,
    },
    body: data,
  });
  assert.ok(response.ok, `${path}: ${response.status}`);
  return response;
}
try {
  const health = await request("/healthz");
  assert.deepEqual(await health.json(), { status: "ok" });
  const home = await request("/about");
  assert.equal(home.headers.get("X-Frame-Options"), "DENY");
  assert.equal(home.headers.get("X-Content-Type-Options"), "nosniff");
  await request(
    "/api/business",
    "POST",
    JSON.stringify({
      name: "Restore drill fixture",
      phone: "+12025550100",
      logo: "",
      accent: "#176650",
      button: "#176650",
    }),
    { "Content-Type": "application/json" },
  );
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=",
    "base64",
  );
  await request("/api/upload", "POST", png, { "Content-Type": "image/png" });
  mkdirSync(".sites-runtime/backups", { recursive: true });
  const previous = new Set(readdirSync(".sites-runtime/backups"));
  function run(args) {
    const result = spawnSync(process.execPath, args, { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    console.log(result.stdout.trim());
  }
  run(["scripts/backup.mjs"]);
  const created = readdirSync(".sites-runtime/backups").find(
    (name) => !previous.has(name),
  );
  assert.ok(created);
  run(["scripts/restore-drill.mjs", join(".sites-runtime/backups", created)]);
  console.log(
    "PASS health, security headers, database snapshot restoration and R2 round-trip verification.",
  );
} finally {
  await request("/api/business", "DELETE");
  session.cleanup();
}
