export async function retryObjectDeletions(
  database: D1Database,
  storage: R2Bucket,
  now = Date.now(),
) {
  const { results } = await database
    .prepare(
      "SELECT key,attempts FROM object_deletions WHERE next_attempt<=? ORDER BY next_attempt LIMIT 100",
    )
    .bind(now)
    .all<{ key: string; attempts: number }>();
  let deleted = 0;
  for (const job of results) {
    try {
      await storage.delete(job.key); // R2 delete is idempotent, including missing keys.
      await database
        .prepare("DELETE FROM object_deletions WHERE key=?")
        .bind(job.key)
        .run();
      deleted++;
    } catch {
      await database
        .prepare(
          "UPDATE object_deletions SET attempts=attempts+1,next_attempt=? WHERE key=?",
        )
        .bind(
          now + Math.min(86400000, 60000 * 2 ** Math.min(job.attempts, 10)),
          job.key,
        )
        .run();
      console.error(
        JSON.stringify({
          event: "object_deletion_retry",
          attempt: job.attempts + 1,
        }),
      );
    }
  }
  return { processed: results.length, deleted };
}
