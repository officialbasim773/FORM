import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { productionConfig } from "./production-config.mjs";
const command = process.argv[2];
if (!["build", "deploy", "rollback"].includes(command))
  throw Error("Expected build, deploy or rollback.");
productionConfig(); // Reject local placeholders before invoking tooling.
function run(args) {
  const r = spawnSync(process.execPath, args, {
    stdio: "inherit",
    env: { ...process.env, FORMCHAT_DEPLOY: "production" },
  });
  if (r.status) process.exit(r.status || 1);
}
if (command === "build") run(["scripts/run-framework.mjs", "build"]);
else {
  const config = JSON.parse(readFileSync("dist/server/wrangler.json", "utf8"));
  if (
    config.vars?.APP_ENV !== "production" ||
    config.d1_databases?.[0]?.database_id !== process.env.CF_D1_DATABASE_ID ||
    config.name !== process.env.CF_WORKER_NAME ||
    config.vars.BETTER_AUTH_URL !== new URL(process.env.BETTER_AUTH_URL).origin
  )
    throw Error("Build the intended production configuration first.");
  const cli = [
    "--import",
    "./scripts/sites-env.mjs",
    "node_modules/wrangler/bin/wrangler.js",
  ];
  if (command === "deploy")
    run([
      ...cli,
      "deploy",
      "--config",
      "dist/server/wrangler.json",
      ...process.argv.slice(3),
    ]);
  else {
    const version = process.argv[3];
    if (!version || !/^[a-f\d-]{36}$/i.test(version))
      throw Error("Pass the previously verified Worker version UUID.");
    run([...cli, "rollback", version, "--config", "dist/server/wrangler.json"]);
  }
}
