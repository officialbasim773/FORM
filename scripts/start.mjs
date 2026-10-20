import { copyFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

if (!existsSync("dist/server/wrangler.json")) {
  throw new Error("Run npm run build before npm start.");
}
if (existsSync(".dev.vars")) {
  copyFileSync(".dev.vars", "dist/server/.dev.vars");
}

const wrangler = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));
const child = spawn(process.execPath, [
  "--import", "./scripts/sites-env.mjs", wrangler,
  "dev", "--config", "dist/server/wrangler.json", "--local",
  "--persist-to", ".wrangler/state", "--ip", "127.0.0.1",
  "--port", process.env.PORT || "5174", "--inspector-port", "0",
], { stdio: "inherit" });
child.on("error", (error) => { throw error; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
