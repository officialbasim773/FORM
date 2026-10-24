import { localAuth } from "./local-auth.mjs";

// Aliases keep scenarios readable; every identity is a real verified session.
export function sessionFixtures(base) {
  const sessions = new Map();
  const get = async function session(alias) {
    if (!sessions.has(alias)) sessions.set(alias, await localAuth(base));
    return sessions.get(alias);
  };
  get.cleanup = async () => {
    for (const session of sessions.values()) {
      const response = await fetch(base + "/api/business", {
        method: "DELETE",
        headers: { cookie: session.cookie, origin: new URL(base).origin },
      });
      if (![200, 403, 404].includes(response.status))
        throw Error("Fixture workspace cleanup failed.");
      session.cleanup();
    }
    sessions.clear();
  };
  process.once("beforeExit", get.cleanup);
  return get;
}
