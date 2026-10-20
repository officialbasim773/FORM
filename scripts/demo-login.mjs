// Local D1 only: create/reset the dedicated demo account, never production.
import { hashPassword } from "better-auth/crypto";
import { randomBytes } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
mkdirSync(".sites-runtime", { recursive: true });
const password = "Demo!" + randomBytes(9).toString("base64url");
const hash = await hashPassword(password);
const q = (s) => "'" + String(s).replaceAll("'", "''") + "'";
const now = Date.now();
const sql = `INSERT INTO user(id,name,email,email_verified,created_at,updated_at) VALUES('formchat-local-demo','Demo Owner','demo@formchat.local',1,${now},${now}) ON CONFLICT(id) DO UPDATE SET email_verified=1;
INSERT INTO account(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES('formchat-local-demo-password','formchat-local-demo','credential','formchat-local-demo',${q(hash)},${now},${now}) ON CONFLICT(id) DO UPDATE SET password=excluded.password,updated_at=excluded.updated_at;
INSERT OR IGNORE INTO businesses(id,owner,email,name,phone,logo,accent,button,plan,onboarded) VALUES('formchat-local-demo-workspace','formchat-local-demo','demo@formchat.local','FormChat Demo','+971500000001','','#176650','#176650','business',1);`;
writeFileSync(".sites-runtime/demo-login.sql", sql);
const r = spawnSync(
  process.execPath,
  [
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
    "--file",
    ".sites-runtime/demo-login.sql",
  ],
  { encoding: "utf8" },
);
if (r.status) throw new Error(r.stderr + r.stdout);
writeFileSync(
  ".sites-runtime/demo-login.json",
  JSON.stringify({ email: "demo@formchat.local", password }),
);
console.log("Local demo login created.");
