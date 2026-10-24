import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
const source = process.argv[2];
if (!source)
  throw Error("Pass the directory containing a verified backup manifest.");
const directory = resolve(source);
const manifest = JSON.parse(
  readFileSync(join(directory, "manifest.json"), "utf8"),
);
const sql = readFileSync(join(directory, "database.sql"), "utf8");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
if (hash(sql) !== manifest.databaseSha256)
  throw Error("Database backup checksum mismatch.");
const target = resolve(".sites-runtime", "restore-drills", randomUUID());
if (existsSync(target)) throw Error("Restore target must be new.");
mkdirSync(target, { recursive: true });
// Always restore into a new local database. There is no remote restore mode.
const restored = new DatabaseSync(join(target, "restored.sqlite"));
restored.exec(sql);
if (
  restored.prepare("PRAGMA integrity_check").get().integrity_check !== "ok" ||
  restored.prepare("PRAGMA foreign_key_check").all().length
)
  throw Error("Restored database failed integrity checks.");
for (const [table, expected] of Object.entries(manifest.counts)) {
  const count = restored
    .prepare('SELECT count(*) n FROM "' + table.replaceAll('"', '""') + '"')
    .get().n;
  if (count !== expected) throw Error(`Restored table count differs: ${table}`);
}
if (
  !restored
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='trigger' AND name='bookings_validate_approval'",
    )
    .get()
)
  throw Error("Restored booking approval guard missing.");
restored.close();
const config = JSON.parse(readFileSync("dist/server/wrangler.json", "utf8"));
function run(args) {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/sites-env.mjs",
      "node_modules/wrangler/bin/wrangler.js",
      ...args,
      "--config",
      "dist/server/wrangler.json",
      "--local",
      "--persist-to",
      join(target, "r2"),
    ],
    { encoding: "utf8" },
  );
  if (result.status)
    throw Error("Local R2 restoration failed: " + result.stderr);
}
for (const object of manifest.objects) {
  if (!/^[\w-]+$/.test(object.key)) throw Error("Invalid object key.");
  const file = join(directory, "objects", object.key);
  if (hash(readFileSync(file)) !== object.sha256)
    throw Error("Object backup checksum mismatch.");
  const key = config.r2_buckets[0].bucket_name + "/" + object.key;
  run([
    "r2",
    "object",
    "put",
    key,
    "--file",
    file,
    "--content-type",
    object.mime,
  ]);
  const output = join(target, object.key);
  run(["r2", "object", "get", key, "--file", output]);
  if (hash(readFileSync(output)) !== object.sha256)
    throw Error("Restored R2 checksum mismatch.");
}
console.log(
  `Restore drill passed: ${Object.keys(manifest.counts).length} tables and ${manifest.objects.length} R2 objects. Isolated target: ${target}`,
);
