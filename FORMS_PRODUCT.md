# Forms product scope and implementation

Updated: 22 October 2026.

## Product direction

Forms is a WhatsApp form builder for enquiries, registrations, feedback and product requests. A customer fills a branded public form, FormChat saves a response and reference, then the customer sends the prepared summary in WhatsApp. A handoff click is not proof of message delivery. Appointments remain a separate application with separate availability and booking management.

The reference is **whatsform.com**, not the unrelated whatsform.in product. Sources: [official feature guide](https://whatsform.com/help/category/116-features), [logical jump guide](https://whatsform.com/help/article/1102-logical-jump), [conditional team routing](https://whatsform.com/help/article/1056-conditional-agent-routing). See WHATSFORM_INSPECTION.md for the prior signed-in inspection and its limits.

## Repository-based implementation plan

The React client already has a canvas builder and per-form Build / Share / Responses / Settings destinations. Drafts and published snapshots are JSON validated by `lib/model.ts`. The API scopes forms to a business, uses revision checks for edits, stores publish snapshots in the existing `versions` table, and saves anonymous submissions idempotently before WhatsApp handoff. D1 stores responses; R2 stores uploaded images. These existing paths are extended rather than introducing a second Forms system.

1. Add optional, backward-compatible settings to draft JSON and validate them on the server.
2. Add contextual answer limits, per-form WhatsApp fallback recipient and introduction, and configurable confirmation screens.
3. Expose existing publish history and restore snapshots using workspace authorization and revision guards. Restore to draft only.
4. Reopen the existing published snapshot without publishing unfinished changes. Add a General settings page and launch checklist.
5. Add forward section jumps and early submission, resolving the same visible path in the customer UI and submission/routing validation. Preserve rule references when choices are renamed; reject backward or missing targets.
6. Verify schema boundaries, customer submission/retry, section jumps, version restoration, workspace isolation and paused-form behavior against the real local Worker; retain appointment and product regression coverage.

No migration is required for these additions: the settings are optional JSON properties and history uses the existing table. Old forms retain their previous validation and automatic WhatsApp behavior. Newly created forms show confirmation first by default.

## Working capabilities

| Area | Available |
| --- | --- |
| Authoring | Templates, blank forms, visual canvas, question library, reorder/duplicate/delete, image questions, picture choices, bulk choice editing, placeholders, hints and required questions |
| Customer layouts | All questions on one page, sections, or one question at a time; progress, welcome screen, keyboard support and preview without saving |
| Validation | Existing typed answers plus configurable text length, number ranges, inclusive calendar-date ranges, checkbox counts and 1–5 / 1–10 ratings; enforced by the submission API |
| Logic | Conditional question visibility; ordered forward section jumps and early submission; section assignment; team routing by answer rules; skipped/hidden answers excluded on the server |
| Orders | Real product catalogue, images, quantities, variants, notes, delivery/pickup questions and server-calculated totals; these are requests, not paid orders |
| Design | Per-form colours, fonts including Poppins/Montserrat, logo, images, text size, alignment, corners, submit text and branding settings |
| WhatsApp | Business default or per-form fallback number, active teammate routing, round-robin and conditional routing, custom introduction, encoded summary, long-message copy fallback |
| Completion | Saved response reference, custom title/message, optional automatic handoff; embedded forms show confirmation first |
| Publishing | Draft recovery/autosave, optimistic revision checks, immutable public snapshots, version list, restore to draft, pause and reopen without publishing draft changes |
| Distribution | Public link, WhatsApp message templates, QR download, responsive inline embed, floating website widget and installation guidance |
| Inbox | Saved answers and order snapshot, search, form/date/handoff/status/assignee filters, notes, status changes, assignment, CSV export subject to plan |
| Analytics | Views, starts, responses and handoff clicks; no claim of WhatsApp delivery or sales tracking |
| Teams/security | Authenticated workspace authorization, active-team checks, invitation flow, server validation, submission idempotency, spam controls and quotas |

## Explicit remaining gaps

This is **not yet complete WhatsForm feature parity**. Missing capabilities must not be advertised as connected or operational:

- Payment collection and verified provider webhooks (Stripe, Razorpay, PayPal). Product totals currently express a request only.
- Customer file attachments, arbitrary video/content blocks and calculated fields outside product totals.
- Customer-form translation/localization and right-to-left layout controls.
- Custom domain provisioning, domain ownership verification and custom public URLs.
- Google Sheets, Google Calendar, external webhooks with durable delivery/retries, analytics pixels and response email notifications.
- AI form generation and Google Forms / competitor-form import.
- Self-service subscription billing, production delivery/monitoring and deployed third-party integration verification.

Each integration needs an operational backend, credentials/provisioning and failure recovery. Do not add inert Connect buttons to imply these capabilities. Build and verify each missing workflow before marking it available.

## New workflow details

- **Settings → General:** edit title/description, review the checklist and pause/reopen responses. Reopening uses the last published snapshot and respects the published-form quota.
- **Settings → WhatsApp & ending:** leave the recipient blank for the business default; assigned active teammates take priority, then the per-form number, then the business number. The custom introduction never replaces the answer/reference summary.
- **Build → select a question → Answer validation:** empty optional answers are allowed. Limits apply to provided answers. Date bounds are inclusive dates without time-zone conversion; these are preferred-date fields, not appointments.
- **Settings → Version history:** up to 100 newest published versions. Restoration replaces the saved draft and increments its revision. It does not publish, change the live version, remove responses or rewrite response snapshots. Duplicate first if you need a separate copy of the current draft. Restored routing and images are subject to existing ownership/publishing checks.
- Changing a question type resets its type-specific answer rules. Existing answer/routing conditions retain the builder’s normal reference checks.
- **Settings → Layout & routing → Section jumps:** in Sections layout, add up to 20 ordered rules using a question in the current or an earlier section. Choose a later section or Submit form. The first matching rule for that section wins; unmatched rules continue in order. Backward jumps are rejected. Hidden/skipped answers cannot trigger rules. Jumps are retained but inactive in the other layouts. Deleting a source question or a referenced section removes its jump rules; moving a source after its rule is blocked.

## Verification

Run `npm test`, `npm run typecheck`, `npm run build`, then `npm start`, `npm run test:forms-core` and `npm run test:forms-logic`. The API suites provision isolated, verified localhost accounts, test the actual Worker, and remove their workspaces/accounts in cleanup. They never send a WhatsApp message or edit existing owner forms. See VERIFICATION.md for observed UI results and any remaining limits.
