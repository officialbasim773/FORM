import { readdirSync, readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
if (!existsSync("dist/server/wrangler.json"))
  throw new Error("Run npm run build before applying local migrations.");
const base = [
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
];
function run(extra, json = false) {
  const r = spawnSync(
    process.execPath,
    [...base, ...extra, ...(json ? ["--json"] : [])],
    { encoding: "utf8" },
  );
  if (r.status) throw new Error(r.stderr + r.stdout);
  return json ? JSON.parse(r.stdout) : r.stdout;
}
run([
  "--command",
  "CREATE TABLE IF NOT EXISTS _formchat_migrations(name TEXT PRIMARY KEY, sha256 TEXT NOT NULL)",
]);
const applied = run(
  ["--command", "SELECT name,sha256 FROM _formchat_migrations"],
  true,
)[0].results;
for (const name of readdirSync("drizzle")
  .filter((n) => n.endsWith(".sql"))
  .sort()) {
  const digest = createHash("sha256")
    .update(readFileSync("drizzle/" + name))
    .digest("hex");
  const previous = applied.find((r) => r.name === name);
  if (previous) {
    if (previous.sha256 !== digest)
      throw new Error(
        `Applied migration ${name} changed. Restore it and append a new migration.`,
      );
    continue;
  }
  run(["--file", "drizzle/" + name]);
  run([
    "--command",
    `INSERT INTO _formchat_migrations(name,sha256) VALUES('${name}','${digest}')`,
  ]);
  console.log("Applied " + name);
}
console.log("Local database migrations are up to date.");
