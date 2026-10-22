// Ephemeral verified account in the local D1 database. Never runs remotely.
import { randomUUID, randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { spawnSync } from "node:child_process";
export async function localAuth(base) {
  if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname))
    throw Error("Local test accounts are restricted to localhost.");
  const id = "form-authoring-test-" + randomUUID(),
    email = id + "@example.test",
    password = randomBytes(24).toString("base64url"),
    now = Date.now();
  const quote = (s) => "'" + String(s).replaceAll("'", "''") + "'";
  function sql(statement) {
    const result = spawnSync(
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
        "--command",
        statement,
      ],
      { encoding: "utf8" },
    );
    if (result.status)
      throw Error("Could not provision or clean the local test account.");
  }
  sql(
    `INSERT INTO user(id,name,email,email_verified,created_at,updated_at) VALUES(${quote(id)},'Form authoring test',${quote(email)},1,${now},${now}); INSERT INTO account(id,account_id,provider_id,user_id,password,created_at,updated_at) VALUES(${quote(id)},${quote(id)},'credential',${quote(id)},${quote(await hashPassword(password))},${now},${now});`,
  );
  const cleanup = () =>
    sql(
      `DELETE FROM session WHERE user_id=${quote(id)};DELETE FROM account WHERE user_id=${quote(id)};DELETE FROM user WHERE id=${quote(id)};`,
    );
  try {
    const response = await fetch(base + "/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: new URL(base).origin,
      },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok)
      throw Error(`Local test sign-in failed (${response.status}).`);
    const cookie = response.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    if (!cookie) throw Error("Local test sign-in returned no session.");
    return { cookie, cleanup };
  } catch (e) {
    cleanup();
    throw e;
  }
}
