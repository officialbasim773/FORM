import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  appendFileSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
const remote = process.argv.includes("--remote");
const directory = resolve(
  ".sites-runtime",
  "backups",
  new Date().toISOString().replaceAll(/[:.]/g, "-"),
);
const configPath = "dist/server/wrangler.json";
const config = JSON.parse(readFileSync(configPath, "utf8"));
if (
  remote &&
  (config.vars?.APP_ENV !== "production" ||
    /^00000000-/.test(config.d1_databases?.[0]?.database_id || "00000000-"))
)
  throw Error(
    "Build a provisioned production configuration before a remote backup.",
  );
mkdirSync(join(directory, "objects"), { recursive: true });
function run(args) {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "./scripts/sites-env.mjs",
      "node_modules/wrangler/bin/wrangler.js",
      ...args,
      "--config",
      configPath,
    ],
    { encoding: "utf8" },
  );
  if (result.status)
    throw Error(`Backup command failed: ${result.stderr || result.stdout}`);
}
if (remote)
  run([
    "d1",
    "export",
    "DB",
    "--remote",
    "--output",
    join(directory, "database.sql"),
    "--skip-confirmation",
  ]);
else {
  // Wrangler export has no persist-to option. Copy the actual local database
  // with SQLite's snapshot operation, including committed WAL transactions.
  const state = resolve(".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
  const candidates = readdirSync(state).filter(
    (name) => name.endsWith(".sqlite") && name !== "metadata.sqlite",
  );
  if (candidates.length !== 1)
    throw Error(
      "Expected exactly one local D1 database; select a clean workspace state.",
    );
  const live = new DatabaseSync(join(state, candidates[0]), { readOnly: true });
  const snapshot = join(directory, "snapshot.sqlite");
  live.exec("VACUUM INTO '" + snapshot.replaceAll("'", "''") + "'");
  live.close();
  const copy = new DatabaseSync(snapshot, { readOnly: true });
  const entries = copy
    .prepare(
      "SELECT type,name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY type,name",
    )
    .all();
  const file = join(directory, "database.sql");
  const identifier = (value) => '"' + value.replaceAll('"', '""') + '"';
  writeFileSync(file, "PRAGMA foreign_keys=OFF;\n");
  for (const entry of entries.filter((e) => e.type === "table")) {
    appendFileSync(file, entry.sql + ";\n");
    const columns = copy
      .prepare("PRAGMA table_info(" + identifier(entry.name) + ")")
      .all()
      .map((c) => c.name);
    const query = copy.prepare(
      "SELECT " +
        columns
          .map((c) => "quote(" + identifier(c) + ") AS " + identifier(c))
          .join(",") +
        " FROM " +
        identifier(entry.name),
    );
    for (const row of query.iterate())
      appendFileSync(
        file,
        "INSERT INTO " +
          identifier(entry.name) +
          " VALUES(" +
          columns.map((c) => row[c]).join(",") +
          ");\n",
      );
  }
  for (const entry of entries.filter((e) => e.type !== "table"))
    appendFileSync(file, entry.sql + ";\n");
  appendFileSync(file, "PRAGMA foreign_keys=ON;\n");
  copy.close();
}
const sql = readFileSync(join(directory, "database.sql"), "utf8");
const database = new DatabaseSync(":memory:");
database.exec(sql);
if (database.prepare("PRAGMA integrity_check").get().integrity_check !== "ok")
  throw Error("Database export failed integrity verification.");
const uploads = database
  .prepare("SELECT id,mime FROM uploads ORDER BY id")
  .all();
const objects = [];
for (const upload of uploads) {
  if (!/^[\w-]+$/.test(upload.id)) throw Error("Unexpected object key.");
  const file = join(directory, "objects", upload.id);
  run([
    "r2",
    "object",
    "get",
    config.r2_buckets[0].bucket_name + "/" + upload.id,
    remote ? "--remote" : "--local",
    ...(!remote ? ["--persist-to", ".wrangler/state"] : []),
    "--file",
    file,
  ]);
  if (!existsSync(file)) throw Error("Missing image export.");
  const bytes = readFileSync(file);
  objects.push({
    key: upload.id,
    mime: upload.mime,
    size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
const counts = Object.fromEntries(
  database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    )
    .all()
    .map(({ name }) => [
      name,
      database
        .prepare('SELECT count(*) n FROM "' + name.replaceAll('"', '""') + '"')
        .get().n,
    ]),
);
database.close();
writeFileSync(
  join(directory, "manifest.json"),
  JSON.stringify(
    {
      version: 1,
      source: remote ? "production" : "local",
      createdAt: new Date().toISOString(),
      databaseSha256: createHash("sha256").update(sql).digest("hex"),
      counts,
      objects,
    },
    null,
    2,
  ),
);
console.log(
  `Verified database export and ${objects.length} image objects: ${directory}`,
);
