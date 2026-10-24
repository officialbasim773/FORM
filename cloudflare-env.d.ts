declare namespace Cloudflare {
  interface Env {
    APP_ENV?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
    BETTER_AUTH_API_KEY?: string;
  }
}
