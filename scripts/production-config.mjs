import { isIP } from "node:net";
export function productionConfig(values = process.env) {
  const required = [
    "CF_WORKER_NAME",
    "CF_D1_DATABASE_NAME",
    "CF_D1_DATABASE_ID",
    "CF_R2_BUCKET_NAME",
    "BETTER_AUTH_URL",
  ];
  for (const key of required)
    if (!values[key]?.trim())
      throw Error(`Production configuration requires ${key}.`);
  const id = values.CF_D1_DATABASE_ID;
  if (
    !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(id) ||
    /^00000000-/.test(id)
  )
    throw Error("Supply the provisioned production D1 database ID.");
  const origin = new URL(values.BETTER_AUTH_URL);
  if (
    origin.protocol !== "https:" ||
    isIP(origin.hostname.replaceAll(/[\[\]]/g, "")) ||
    origin.hostname === "localhost" ||
    !origin.hostname.includes(".") ||
    /\.(example|test|invalid)$/.test(origin.hostname) ||
    origin.pathname !== "/" ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash
  )
    throw Error("BETTER_AUTH_URL must be your real production HTTPS origin.");
  return {
    name: values.CF_WORKER_NAME,
    vars: { APP_ENV: "production", BETTER_AUTH_URL: origin.origin },
    d1_databases: [
      {
        binding: "DB",
        database_name: values.CF_D1_DATABASE_NAME,
        database_id: id,
      },
    ],
    r2_buckets: [{ binding: "BUCKET", bucket_name: values.CF_R2_BUCKET_NAME }],
    triggers: { crons: ["*/5 * * * *"] },
    observability: { enabled: true, head_sampling_rate: 1 },
  };
}
