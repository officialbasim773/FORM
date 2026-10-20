import assert from "node:assert/strict";

const base = process.env.TEST_URL || "http://127.0.0.1:5174";
if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) {
  throw new Error("Auth smoke test runs only against localhost.");
}

const home = await fetch(base);
assert.equal(home.status, 200, "Public landing page must load");

const session = await fetch(`${base}/api/auth/get-session`);
assert.equal(session.status, 200, "Better Auth session endpoint must load");
assert.equal(await session.text(), "null", "Anonymous visitor has no session");

const forged = await fetch(`${base}/api/me`, {
  headers: {
    "oai-authenticated-user-id": "forged-owner",
    "oai-authenticated-user-email": "forged@example.test",
  },
});
assert.equal(forged.status, 401, "Legacy identity headers must grant no access");

console.log("Auth smoke checks passed.");
