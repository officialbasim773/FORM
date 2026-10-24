export function secureResponse(request: Request, response: Response) {
  const headers = new Headers(response.headers);
  const url = new URL(request.url);
  const embeddable = /^\/(?:f|book)\//.test(url.pathname);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  if (url.protocol === "https:")
    headers.set("Strict-Transport-Security", "max-age=31536000");
  // Public forms and booking pages intentionally support cross-site iframes.
  // This policy preserves framework hydration while protecting private screens.
  if (!headers.has("Content-Security-Policy"))
    headers.set(
      "Content-Security-Policy",
      `object-src 'none'; base-uri 'self'; frame-ancestors ${embeddable ? "*" : "'none'"}`,
    );
  if (!embeddable) headers.set("X-Frame-Options", "DENY");
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth"))
    headers.set("Cache-Control", "no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
