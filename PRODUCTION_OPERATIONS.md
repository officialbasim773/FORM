# Production release and recovery

The repository includes production configuration and local verification. Provisioned infrastructure, delivered email, external alerts and a hosted recovery drill must be verified before launch. Local test success does not prove those external services work.

## Infrastructure and release

Use a Cloudflare Worker, D1 database and R2 bucket. Keep staging and production resources separate. Set these build environment variables using the actual provisioned resources:

| Variable | Value |
| --- | --- |
| `CF_WORKER_NAME` | Production Worker name |
| `CF_D1_DATABASE_NAME` | Production database name |
| `CF_D1_DATABASE_ID` | Provisioned database UUID |
| `CF_R2_BUCKET_NAME` | Production image bucket name |
| `BETTER_AUTH_URL` | Public HTTPS origin, without a path |

Authenticate Wrangler with the intended Cloudflare account. Store `BETTER_AUTH_SECRET` (at least 32 random characters) and `BETTER_AUTH_API_KEY` in that Worker's secret store using `wrangler secret put`, never Git or build variables committed to this repository. Enable transactional verification and reset email in the connected Better Auth Infrastructure project and configure its sender/domain. No secrets are copied from `.dev.vars` into a production deployment.

Release sequence:

1. Run `npm ci`, `npm audit --omit=dev`, `npm run lint`, `npm run typecheck`, `npm test` and all local API suites. CI runs these gates on pushes and pull requests.
2. Use `npm run build:production`. It rejects absent resource names, local placeholder database IDs and insecure/placeholder auth origins. `npm run build` and `npm start` remain local preview commands.
3. Before an update to an existing deployment, pause writes for a coordinated backup. Run `npm run backup -- --remote`; copy the resulting sensitive backup to an encrypted location outside this machine. Record the current Worker version and a D1 Time Travel bookmark (`wrangler d1 time-travel info DB --config dist/server/wrangler.json`).
4. Run `npm run db:migrate:production`. The migration runner checks the hash of every previously applied SQL file. New SQL and its migration receipt execute in the same D1 file transaction. Never edit previously applied migrations. Rehearse upgrades on staging first.
5. Run `npm run deploy:production -- --dry-run` to inspect the generated Worker, bindings and upload size. Then `npm run deploy:production` when ready to release. Attach the custom domain in Cloudflare and verify DNS/TLS. Build output is never evidence that deployment happened.
6. Verify `/healthz`, sign-up verification, password reset, cross-workspace isolation, enquiry submission, owner booking approval, public embeds and image loading on the hosted origin. Resume traffic only after these checks pass.

Migrations `0009` and `0010` are additive. The first protects pending approvals against revoked providers; the second creates distributed auth limits and a deletion queue. Existing forms, response snapshots and bookings remain intact. Drizzle's journal now includes every SQL file; `0010_snapshot.json` is the current schema checkpoint. SQL migrations remain authoritative for triggers and checks that Drizzle cannot express. Use `db:generate` to draft a migration, review it, and use the hash-checking runner to apply it. Never use schema push against production.

## Prove email delivery

Use a controlled inbox and a fresh account on the production origin. Submit sign-up, verify receipt and the sender, follow the link and confirm the address is verified before dashboard access. Sign out, request a password reset, receive and follow that link, choose a new password, verify the old password fails and the new password works. Repeat the reset link to confirm it cannot be reused. Record time, origin and pass/fail; keep email tokens and passwords out of logs and screenshots. An API success response or a populated API key does not prove inbox delivery. Local regression fixtures create already-verified accounts and deliberately do not test email delivery.

## Backups and restoration

`npm run backup` captures the local D1 database with a consistent SQLite snapshot, exports SQL, downloads every database-referenced image from R2 and writes SHA-256 checksums and table counts. `npm run backup -- --remote` uses the built production bindings and Cloudflare's remote D1 export and R2 API. A missing object fails the backup; a manifest is only written after validation succeeds. Unreferenced R2 orphan objects are not part of the backup. Pause writes during a remote database-plus-images backup because these services do not share a transaction.

Backups live under ignored `.sites-runtime/backups/` and contain customer data, auth hashes and sessions. Restrict access, encrypt offsite copies and establish retention. This repository does not schedule offsite backups automatically. Cloudflare D1 Time Travel supplements these exports; it does not back up R2.

Run `npm run restore:drill -- <backup-directory>`. It restores SQL into a **new isolated local SQLite database**, checks integrity, foreign keys, table counts and the approval trigger, restores each image into a separate local R2 state directory, retrieves it and verifies its checksum. It never overwrites the active local database or a remote database. `npm run test:operations` exercises this with a real temporary uploaded image. Do not run local-account test suites against production.

Before launch, also rehearse a remote restoration into newly provisioned **staging** D1/R2 resources: import the verified SQL and put every manifest object with its MIME type, then deploy staging bindings and exercise login, forms, image retrieval and bookings. Do not restore SQL over a live database. Record the measured recovery time and acceptable data-loss window. Restore authentication secrets consistently, or invalidate existing sessions deliberately.

## Rollback

Record the known-good version UUID before every release. `npm run rollback:production -- <version-uuid>` rolls the Worker code back using the validated production bindings. It does not roll back the database. The additive migrations in this change support the previous application schema; keep the new approval trigger in place during a code rollback. Verify compatibility on staging before relying on this. For a destructive future migration, restore into a new database or use an operator-approved Time Travel procedure; stop writes and account for submissions received after the recovery point. A code rollback cannot recover deleted customer data.

## Monitoring and cleanup

Production configuration enables Workers observability and runs cleanup every five minutes. The Worker emits structured `request_failed`, `object_deletion_retry`, `object_cleanup_deferred`, `upload_cleanup_deferred` and `cleanup_completed` events without request bodies, email addresses or tokens. Configure Cloudflare log retention and alerts for 5xx increases, scheduled-handler failures, repeated deletion attempts and queue growth. Configure an external uptime monitor on `https://<origin>/healthz`; alert on a non-200 response or sustained latency. No external alert destination is provisioned by this repository.

`/healthz` checks D1 schema access, an R2 metadata read and required production auth configuration. It exposes no IDs or secret values. It does not send email or prove a provider key is valid. Configure both an endpoint monitor and user-flow smoke checks.

Workspace deletion atomically queues image keys before removing database records. R2 failures leave durable retry jobs with exponential backoff up to 24 hours; no fixed attempt limit discards failed jobs. Uploads stage compensation before writing an object, so failed upload commits can also be cleaned up. Deletions and retries are idempotent. Monitor `SELECT count(*),max(attempts) FROM object_deletions`; investigate repeated failures instead of deleting jobs to hide the queue.

Dashboard/auth/API responses deny framing. Public `/f/*` and `/book/*` pages allow the website embed feature. Responses add `nosniff`, referrer and permissions policies, an embedding/base/object CSP, and HSTS over HTTPS. This CSP intentionally does not restrict all script sources; nonce-based script restrictions need additional hydration and third-party integration testing.

## Dependencies

The patched lockfile upgrades Next, React/RSC, Vinext, Vite and Cloudflare tooling. Transitive overrides are recorded in `package.json`; test the framework build and Drizzle generation when changing them. Run the production audit and the full development audit separately. A development-only advisory still needs review, even when production audit is clean. See `PRODUCTION_READINESS.md` for the executed audit results and any unresolved upstream advisory.
