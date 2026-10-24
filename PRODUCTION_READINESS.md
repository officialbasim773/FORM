# Production readiness — remediation

Updated 24 October 2026. Changes are in the working tree based on `940cbc6`. Responsive browser results and their device/engine limits are recorded in [Browser QA](./BROWSER_QA.md).

## Status

The reported application defects and local release gates have been addressed. **Production launch remains conditional on provisioned resources and hosted verification.** No production deployment, delivered authentication email, external alert destination or remote restore is claimed.

| Reported problem | Result |
| --- | --- |
| Pending booking accepted after provider revocation | Fixed with migration `0009`: a database trigger rechecks active membership during approval. A real authenticated local Worker regression returns **409** and the saved booking remains **pending**. Decline remains available. |
| Nine production dependency findings | **Zero findings** after patched framework/tooling updates, transitive overrides and a clean `npm ci`. Full development audit still has eight package findings, all tracing to the unpatched `braces` advisory reviewed below. |
| Local-only deployment and placeholder database ID | Explicit production build/migration/deploy/rollback commands added. Production configuration requires provisioned D1/R2 resources and a real HTTPS auth origin; placeholder IDs fail closed. Production runtime rejects missing auth configuration. Local preview retains its separate local bindings. Actual resources/domain were not supplied. |
| Lint and legacy authentication in tests | Lint passes with **0 errors, 0 warnings**, enforced with `--max-warnings=0`. Hook dependency cleanup and responsive browser checks are complete within the coverage in Browser QA. SQL and UI records have explicit contracts; narrow exceptions document necessary browser/API synchronization effects and two legacy generic API compatibility boundaries. Legacy team/integration/media/workflow tests use real verified Better Auth sessions. |
| Stale migrations and 5,000-response cap | Journal and current schema checkpoint reconciled without editing applied SQL. Fresh migration and repeat application pass; Drizzle generation reports no schema changes. Inbox uses cursor pages and totals. CSV streams all matches in batches; a **5,007-record** regression passes. |
| Recovery, cleanup, monitoring, headers | Database/R2 backup and isolated restore tools added and tested with an uploaded image; deletion/failed-upload compensation is durable with retry/backoff. Production cron, structured logs, health endpoint, security headers and CI gates added. Remote recovery and alert delivery need hosted verification. |

## Executed verification

| Check | Result |
| --- | --- |
| Clean `npm ci --no-audit --no-fund` | Pass |
| `npm audit --omit=dev --json` | **0 vulnerabilities** |
| `npm audit --json` | 8 high package findings from one development-tooling advisory; reviewed below |
| `npm run lint` | Pass: 0 errors, 0 warnings |
| `npm run typecheck` | Pass |
| `npm test` | **62 tests passed** |
| `npm run build` | Pass: patched Vinext/React/Cloudflare build |
| Fresh migrations into an isolated local state directory; repeat run | Pass: 11 migrations applied, then no work pending |
| `npm run db:generate` | Pass: no schema changes, nothing to migrate |
| Auth smoke | Pass: anonymous session behavior and rejection of forged identity headers |
| Forms core / section logic / experiences | Pass: 39 / 10 / 34 API assertions |
| Team / general integration / media / workflow | Pass: 40 / 77 / 14 / 17 API assertions |
| Real Worker revoked-provider approval | Pass: HTTP 409, saved status pending |
| Operational test | Pass: health, response headers, SQL restoration, table/foreign-key integrity and image restore/retrieval checksum |
| Browser check | Existing signed-in dashboard loads; Responses displays the existing 7 records, filtered total and Previous/Next controls. Existing user records were preserved. |

There are **231 authenticated feature API assertions**, plus auth, booking approval and operational checks, in addition to the 62 unit/regression tests. Temporary test workspaces and accounts were cleaned up. Runtime logs, SQL backups and generated artifacts remain ignored under `outputs/`, `.sites-runtime/` and `.wrangler/`; customer data and secrets are not part of this change.

## Dependency review

Original critical/high findings in Next and the image/source-map dependency chain were removed by updates. React and React Server Components now match at 19.3.1; Vinext is 1.3.0, Next 16.4.2, Vite 8.3.5 and Wrangler 4.152.0. Patched transitive packages include sharp, source-map-js, baseline-browser-mapping, fast-uri, esbuild, brace-expansion, browserslist, Babel, js-yaml and fflate. The installed esbuild tree now deduplicates to 0.28.2, including the legacy Drizzle loader; schema generation and the framework build both pass. Overrides must be retested when dependencies change.

The full audit reports **eight affected package nodes for one underlying advisory**, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). `braces` through 3.0.3 can exhaust the stack on deeply nested glob patterns; the advisory and npm registry currently show no patched release. Paths are Next ESLint → fast-glob → micromatch → braces, and Vinext build plugins → dynamic import globbing → fast-glob → micromatch → braces. The affected packages are development dependencies, are absent from the production audit, and the built Worker contains no identified micromatch/fast-glob/braceExpand references. Reviewed uses consume repository/config/import patterns; form answers and public booking input do not reach these build operations. This is a reachability assessment, not a universal proof of non-exploitability.

Do not run lint/build against attacker-controlled repositories or glob configuration using production credentials. The CI PR job receives no production secrets; deployment is a separate operator action. No advisory was hidden, downgraded or suppressed in the audit. Update the affected build packages when upstream ships a compatible fix. A clean production audit does not mean the full development audit is clean.

## Remaining hosted release gates

1. Supply the production domain, Cloudflare account/resources and real D1 database UUID; configure Worker secrets and the authentication email sender. The pending setup question requests these details.
2. Deploy to staging, then prove verification and reset **inbox delivery**, link behavior and password changes with a controlled inbox. Local tests provision verified accounts and do not send these emails.
3. Run the remote backup and restore rehearsal against separate staging D1/R2 resources. Record recovery time and acceptable data loss. The completed drill restored locally, not into hosted Cloudflare resources.
4. Configure external uptime/error/cleanup-queue alerts, log retention, offsite encrypted backup retention and a scheduled backup policy. Cron/log support is implemented; an alert destination and external backup service are not provisioned here.
5. Rehearse Worker rollback with the recorded known-good version on staging. The rollback command is implemented; no live version was rolled back in this task.

See [Production operations](./PRODUCTION_OPERATIONS.md) for the exact release/recovery procedure. Billing, automated appointment notifications, payments and other previously documented product limitations remain separate launch-scope decisions.
