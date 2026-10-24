// One SQLite upsert decides and increments the limit across Worker isolates.
export function authRateStorage(database: D1Database) {
  return {
    async consume(key: string, rule: { window: number; max: number }) {
      const now = Date.now();
      const expiry = now + rule.window * 1000;
      const row = await database
        .prepare(
          `INSERT INTO auth_rates(key,count,expires) VALUES(?,1,?)
        ON CONFLICT(key) DO UPDATE SET
        count=CASE WHEN expires<=? THEN 1 ELSE count+1 END,
        expires=CASE WHEN expires<=? THEN ? ELSE expires END RETURNING count,expires`,
        )
        .bind(key, expiry, now, now, expiry)
        .first<{ count: number; expires: number }>();
      if (!row) throw new Error("Authentication rate storage unavailable.");
      return {
        allowed: row.count <= rule.max,
        retryAfter:
          row.count <= rule.max
            ? null
            : Math.max(1, Math.ceil((row.expires - now) / 1000)),
      };
    },
  };
}
