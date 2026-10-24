import {
  readdirSync,
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
if (!existsSync("dist/server/wrangler.json"))
  throw new Error("Run npm run build before applying local migrations.");
const remote = process.argv.includes("--remote");
const config = JSON.parse(readFileSync("dist/server/wrangler.json", "utf8"));
if (
  remote &&
  (config.vars?.APP_ENV !== "production" ||
    /^00000000-/.test(config.d1_databases?.[0]?.database_id || "00000000-"))
)
  throw Error(
    "Build a provisioned production configuration before remote migration.",
  );
const base = [
  "--import",
  "./scripts/sites-env.mjs",
  "./node_modules/wrangler/bin/wrangler.js",
  "d1",
  "execute",
  "DB",
  remote ? "--remote" : "--local",
  "--config",
  "dist/server/wrangler.json",
  ...(!remote
    ? ["--persist-to", process.env.FORMCHAT_STATE_DIR || ".wrangler/state"]
    : []),
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
  mkdirSync(".sites-runtime", { recursive: true });
  const staged = `.sites-runtime/migration-${process.pid}.sql`;
  // D1 executes the migration and its receipt in the same file transaction.
  writeFileSync(
    staged,
    readFileSync("drizzle/" + name, "utf8") +
      `
INSERT INTO _formchat_migrations(name,sha256) VALUES('${name}','${digest}');
`,
  );
  try {
    run(["--file", staged]);
  } finally {
    unlinkSync(staged);
  }
  console.log("Applied " + name);
}
console.log(
  `${remote ? "Production" : "Local"} database migrations are up to date.`,
);
