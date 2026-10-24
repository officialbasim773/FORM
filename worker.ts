import application from "vinext/server/fetch-handler";
import { secureResponse } from "./lib/security-headers";
import { retryObjectDeletions } from "./lib/object-cleanup";

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const start = Date.now();
    const id = crypto.randomUUID();
    try {
      if (
        env.APP_ENV === "production" &&
        (!env.DB ||
          !env.BUCKET ||
          !env.BETTER_AUTH_API_KEY ||
          !env.BETTER_AUTH_SECRET ||
          env.BETTER_AUTH_SECRET.length < 32 ||
          !env.BETTER_AUTH_URL?.startsWith("https://"))
      )
        throw Error("Missing production configuration");
      let response: Response;
      if (new URL(request.url).pathname === "/healthz") {
        if (!env.DB || !env.BUCKET) throw Error("Missing storage binding");
        const schema = await env.DB.prepare(
          "SELECT count(*) AS guards FROM sqlite_master WHERE (type='trigger' AND name='bookings_validate_approval') OR (type='table' AND name IN ('object_deletions','auth_rates'))",
        ).first<{ guards: number }>();
        if (schema?.guards !== 3) throw Error("Missing operational migrations");
        await env.BUCKET.head("__formchat_healthcheck__");
        response = Response.json(
          { status: "ok" },
          { headers: { "Cache-Control": "no-store" } },
        );
      } else response = await application.fetch(request, env, ctx);
      if (response.status >= 500)
        console.error(
          JSON.stringify({
            event: "request_failed",
            requestId: id,
            status: response.status,
            durationMs: Date.now() - start,
          }),
        );
      const secured = secureResponse(request, response);
      secured.headers.set("X-Request-Id", id);
      return secured;
    } catch {
      console.error(
        JSON.stringify({
          event: "request_failed",
          requestId: id,
          status: 503,
          durationMs: Date.now() - start,
        }),
      );
      return secureResponse(
        request,
        Response.json(
          { error: "Service temporarily unavailable.", requestId: id },
          {
            status: 503,
            headers: { "Cache-Control": "no-store", "X-Request-Id": id },
          },
        ),
      );
    }
  },
  async scheduled(
    _event: ScheduledController,
    env: Cloudflare.Env,
    ctx: ExecutionContext,
  ) {
    ctx.waitUntil(
      (async () => {
        if (!env.DB || !env.BUCKET) throw Error("Missing storage bindings");
        const result = await retryObjectDeletions(env.DB, env.BUCKET);
        await env.DB.prepare("DELETE FROM auth_rates WHERE expires<?")
          .bind(Date.now())
          .run();
        const queue = await env.DB.prepare(
          "SELECT count(*) pending,max(attempts) attempts FROM object_deletions",
        ).first();
        console.log(
          JSON.stringify({ event: "cleanup_completed", ...result, queue }),
        );
      })(),
    );
  },
};
export default worker;
