# FormChat

A working form builder for service enquiries and product requests that continue on WhatsApp. Built with React 19, TypeScript, Vinext/Vite, Radix/shadcn UI, Cloudflare D1 (SQLite), Drizzle migrations and R2 image storage.

## Run locally

Use Node.js 22.13 or newer (Node 24 recommended).

Create an ignored `.dev.vars` in this `app` directory with `BETTER_AUTH_URL=http://localhost:5174`, a random `BETTER_AUTH_SECRET`, and `BETTER_AUTH_API_KEY`. The Infrastructure email service must be enabled for email verification and password reset. Then run:

```sh
npm ci
npm run build
npm run db:migrate
npm start
```

Open http://localhost:5174 and create an account with email and password. Verify the address using the emailed link before signing in. `db:migrate` applies pending SQL migrations to the local D1 database in `.wrangler/state`; `db:migrate:production` targets validated production bindings. Preserve that directory to keep local data.

### Demo data

| Workspace            | Local owner                        | Plan     | Public form       |
| -------------------- | ---------------------------------- | -------- | ----------------- |
| Willow Home Services | `local_seedy` / `seedy@sites.test` | Business | `/f/home-enquiry` |
| Butter & Crumb       | `local_cake` / `cake@sites.test`   | Business | `/f/cake-order`   |

Demo phone numbers are placeholders. Replace the business WhatsApp number before sharing a form with real customers. Browser QA may have added clearly labelled QA responses and a separate Green Studio QA workspace.

## Implemented

### Forms as a WhatsApp form-builder product

Forms has its own Build, Share, Responses and Settings workspace. See [Forms product scope](./FORMS_PRODUCT.md) for the current feature map, implementation plan and remaining gaps against WhatsForm.

- **General settings** includes title, description, launch checks and pause/reopen. Reopening serves the last published snapshot without exposing unfinished draft changes.
- **WhatsApp & ending** configures a per-form fallback recipient, message introduction and confirmation title/message. Active routed teammates take priority. New forms show confirmation first; existing forms retain automatic handoff unless changed. All responses save before handoff, and customers must tap Send in WhatsApp.
- **Answer validation** supports text length, number/date bounds, checkbox counts and 1–5 or 1–10 ratings, checked on the server. Date-only bounds have no time-zone conversion and do not reserve appointment availability.
- **Section jumps** in Layout & routing can skip to a later section or submit early. First matching rule wins, and the server excludes skipped answers. These rules apply to the Sections layout and reject backward jumps.
- **Version history** lists the latest 100 published snapshots. Restore replaces the draft using a revision check; review and publish explicitly. Existing public forms and historical responses remain unchanged. Duplicate your current form before restoring if you need to keep that draft separately.
- No new migration is needed for these optional draft settings. `npm run test:forms-core` runs isolated local authenticated API regressions against the running Worker.

Payments, custom domains, file responses, AI generation and external integration delivery are still incomplete; this is not a claim of complete WhatsForm parity. Appointments remain separate from Forms.

- Guided business setup with phone format validation, optional logo, templates and publish/share/QR.
- Service and product form builders, fourteen question types, reorder/duplicate/delete, required controls, draft autosave and recovery, explicit versioned publishing and mobile preview.
- Product images, quantities, choice/text customizations, price adjustments and integer minor-unit totals calculated again on the server. Templates include cake orders and bouquet requests.
- Anonymous customer forms; answers persist within the tab; submissions save before review. Encoded WhatsApp draft links, copy-message fallback for long messages and retry controls. The customer must press **Send** in WhatsApp.
- Response snapshots, search, form/date/handoff filters, response detail, CSV export and deletion. Pausing or deleting a form preserves its historical responses.
- Workspace/form analytics for views, starts, submissions and handoff clicks, daily trends and top forms. These do not measure messages sent or sales.
- Server-enforced Free/Business feature and quota limits. Monthly usage includes deleted submissions; simultaneous submissions cannot exceed the quota.
- Expanded landing page at `/about` with an interactive service/product example, how-it-works guide, benefits, pricing and FAQ.
- Searchable question library, ready-made questions, dropdowns, yes/no, ratings and website links.
- Product selection cards, quantity controls, clear option prices and itemized estimates.
- Flat green design with local Outfit font, consistent tokens, solid colour sections, responsive layouts and reduced-motion support.

## Configuration and structure

- `lib/config.ts`: product name, plan prices/limits, currencies, question types and colour presets. Rename `PRODUCT_NAME` to change the displayed name; update the favicon/brand mark if desired.
- `app/theme.css`: flat green design tokens and component styling; `app/globals.css`: layout and base rules.
- `components/formchat/`: workspace, onboarding, builder, customer flow, responses, analytics and settings.
- `app/api/[...path]/route.ts`: API and server-side authorization.
- `lib/model.ts`: shared validation, money, contrast and WhatsApp formatting.
- `lib/server.ts`: D1/R2 helpers, bounded inputs, authorization and rate limits.
- `db/schema.ts`, `drizzle/`: database schema and append-only migrations.
- `scripts/seed.mjs`: local service/cake demo data.

All supported currencies currently use two decimal minor units: USD, AED, EUR, GBP and SAR. Business is configured at $9/month or $79/year, 10 published forms and 1,000 monthly submissions. Free has one published service form and 50 monthly submissions. Plan changes are currently administrative database operations; there is no working checkout.

## Authentication and deployment

This checkout runs locally and has **not been deployed**. Better Auth stores users and sessions in D1, requires verified email for owner and team access, and sends verification/reset messages through Better Auth Infrastructure. Public customer forms remain anonymous. Legacy Sites identity headers are ignored.

For Cloudflare Workers deployment, bind D1 as `DB` and R2 as `BUCKET`; set `BETTER_AUTH_URL` to the public HTTPS origin and store `BETTER_AUTH_SECRET` and `BETTER_AUTH_API_KEY` as Worker secrets. Apply all `drizzle/*.sql` migrations to production D1 before routing traffic. Enable transactional email in the connected Infrastructure project, configure its sender, and verify delivery to a controlled inbox before allowing public registration. The app's existing demo owners use old IDs and need an explicit ownership migration if their data should remain accessible after login. Do not seed demo identities into production.

The API integration suites provision isolated local verified Better Auth accounts and use real session cookies. Tests are restricted to localhost. `npm run test:auth` checks anonymous access and rejects forged identity headers against a locally running Worker. Billing is not connected.

See [Production release and recovery](./PRODUCTION_OPERATIONS.md) for provisioned infrastructure configuration, fail-closed production builds, migrations, email verification, backups, restoration, rollback and monitoring.

## Security and data handling

- Per-owner queries and writes, optimistic draft revisions, immutable published versions and response snapshots.
- Same-origin write checks, bounded JSON payloads, durable IP-based request limits, a honeypot and minimum fill time.
- Submission idempotency, payload conflict detection and token-protected handoff events.
- PNG/JPEG/WebP upload signatures and size limits. Browser uploads are resized/re-encoded to WebP; image responses use a restrictive content policy and `nosniff`. Uploaded images are public assets with unguessable URLs.
- CSV formula-injection protection. Confirmations for form, response and workspace deletion.

Bot protection is basic; no external CAPTCHA, malware scanning or delivery verification is connected. Local customer drafts use session storage; views use a random browser-local identifier. Workspace deletion removes stored records and durably queues image deletion. Failed R2 deletions are retried by the five-minute production maintenance schedule; monitor pending cleanup jobs. Form deletion is a soft delete; response and workspace deletion are permanent.

## Verification

```sh
npm run typecheck
npm test
npm run build
npm run db:migrate
npm start
npm run test:auth
```

Run `npm run test:auth` in a second terminal while the built Worker is running. The `test:integration`, `test:team-flow`, `test:experiences`, `test:media`, `test:workflow`, `test:forms-core` and `test:forms-logic` suites use real local verified sessions. `test:operations` checks health/headers and rehearses database plus R2 restoration with an uploaded image.

See `VERIFICATION.md` for the executed checks and `outputs/` for desktop/mobile screenshots.

## Known limits

- Billing is an honest placeholder. No payments, WhatsApp delivery tracking, stock reservations, tax or delivery-fee calculation.
- Custom domains are not supported in this release.
- Responses use stable cursor pagination (50 by default, maximum 100 per page) with Previous/Next controls and a filtered total. CSV export streams all matching rows in batches of 100, with no 5,000-record cap. Export excludes records created after its initial high-water key; concurrent edits/deletions are not a database-wide snapshot.
- Analytics are browser-identifier based, not person-identity analytics. Clearing storage can count a new visitor. A handoff click proves only that the link was clicked.
- Native WhatsApp app launch and sending require the customer's device; no message was sent during testing. Hosted authentication/deployment and real payments have not been exercised.

### Form flow and teams

- **Questions → Show this question** adds a condition based on an earlier question. Equality, inequality, contains, answered/empty and numeric comparisons are supported. Hidden parent answers cannot trigger later questions, and hidden answers are excluded from receipts and WhatsApp drafts.
- **Flow & routing** manages up to ten named pages. Assign questions to pages in the Questions tab. Customers can go back without losing answers; empty conditional pages are skipped. Products appear on the first step. Existing forms remain single-page until configured.
- **Team** (also in Business settings) creates email-bound invitation links, valid for seven days. Copy and send these links yourself; the app does not send invitation emails. Members sign in with the invited account and see only their assigned responses. Owners retain all editing, publishing, team management and deletion permissions. Users with multiple accessible workspaces can switch in the sidebar.
- Routing supports the owner, a fixed active member, round robin across selected active members, or ordered answer rules. The first matching answer rule wins. Missing matches or removed members fall back to the business owner. Round robin uses an atomic database counter; failed or concurrent duplicate attempts can advance the counter without creating another request.
- Responses include grouped answer cards, itemized product details, saved price estimates, handoff state, and assignee filtering. Owners can reassign inbox access. Reassignment deliberately preserves the originally saved WhatsApp destination in the customer receipt.

Apply migration `0002_outgoing_agent_brand.sql` with `npm run db:migrate`. Run `npm run test:team-flow` against the local built server on port 5174 to test invitations, authorization, routing and conditional submission behavior. Hosted owner and member access both require verified Better Auth sessions; invitation email addresses must match the signed-in account.

### Form experiences

Choose **Classic**, **Multi-page**, or **Interactive** when creating a form or in **Flow & routing**. Switching preserves the underlying questions, conditional logic, products and routing. Classic displays all visible questions together; Multi-page uses the configured page groups; Interactive displays the catalog first (for product forms), followed by one visible question at a time.

Interactive options include welcome visibility, custom welcome heading/description/button text, progress visibility and Enter shortcuts. Question help text is available in the question editor. Enter continues from single-line fields; Ctrl/Command + Enter continues from long answers. Customers can navigate back and edit answers, then submit to save their response and open WhatsApp directly. Preview does not save submissions. Hidden fields remain excluded and final server validation still covers all visible required questions.

Interactive editing includes a question navigator, synced question preview, welcome/question images, image layout and fit controls, and editable picture-choice cards. Classic and multi-page forms use individual choice rows and type-specific answer previews.

### Builder, inbox and ordering improvements

- Set question positions directly; dependency checks prevent moving a conditional question before its source. Preview widths cover 320, 390 and 430 pixels. Image uploads show supported formats/limits, support retrying the same file, and picture-choice editing respects the selected image fit.
- Owners can mark responses New, Contacted or Completed and save private internal notes. Filter by status or search notes alongside customer answers. Status and notes are included in CSV exports, never in the customer receipt or WhatsApp message. Assigned members can read these details but cannot edit them.
- Products support categories and manual availability. Unavailable products remain visible but cannot be ordered; server validation also rejects them. Existing variants support price adjustments, with a shortcut for size choices. Publish changes to update the customer-facing catalog.
- Products → Add delivery & pickup creates a method question and reuses the first existing address question, making it required only for delivery. The setup can be edited using the existing question/condition controls. Order summaries show variant selections, unit prices, totals and item removal, including the final interactive step. Availability is manual; this does not reserve or decrement stock.
- Apply `0003_response_workflow.sql` with `npm run db:migrate`. Run `npm run test:workflow` against the built local server to check status/notes persistence, filters and tenant isolation.


## Standalone appointment booking

Appointments and forms are separate products within the workspace. **Forms** retains its existing builder, published URLs, enquiry/product submission flow, Responses inbox and WhatsApp handoff. **Appointments** has Calendar, Bookings, Services and Availability tabs, with its own public `/book/<business-id>` link. New bookings never create forms or form responses.

### Setup

1. Run `npm run build`, then `npm run db:migrate` for local D1. Apply all migrations, including `0005_appointments.sql` and `0006_standalone_bookings.sql`, to production D1 before routing updated traffic. The new migration preserves legacy appointment IDs, times, details and response links while making form links optional. Existing enquiry/product data and published snapshots are untouched.
2. Enable appointments in **Business settings → Optional features**. Businesses that do not use appointments have no appointment builder controls or dashboard tab. Once enabled, owners can pause new bookings under Availability while still managing previous bookings.
3. In **Appointments → Services**, configure names, descriptions, durations, starting prices, buffers, active providers, minimum notice, booking horizon and start-time intervals. Services can be made unavailable online without deleting their history.
4. In **Availability**, choose an IANA business time zone and configure weekly provider hours, breaks, provider days off and business-wide unavailable dates. Save changes to apply them to the separate booking page.
5. Use **Copy link** or **View booking page** to share the booking page. No form publication is needed.

### Customer and owner flow

Customers choose a service, team member, available date and time, enter their name/email/international phone number and optional notes, and review the booking. The date calendar marks only days with available slots. Confirmation rechecks availability and saves the booking first. New appointments are saved as **Pending** and hold their time until the owner accepts, declines or cancels. Only accepted requests are confirmed. Appointments have no WhatsApp handoff; existing forms retain theirs.

The customer’s pending confirmation request is retained in session storage for safe retry after a network interruption. A retry returns the original confirmation. Customers can refresh their booking status on the saved receipt screen using a private token retained in that browser tab. The status endpoint returns current status, time and provider. There are no automatic email/SMS notifications or cross-device recovery links; contact the business for changes.

The owner dashboard defaults to a bookings list, with pending requests first, search, status filters and a date range. Owners can accept or decline pending requests, use an optional weekly calendar, inspect contact details, reschedule, cancel, or mark confirmed appointments completed/no-show. Declining immediately releases the time. Stale or concurrent decisions are rejected using booking revisions. Cancelling releases the time immediately. Rescheduling reserves the new interval and releases the old one atomically. Tell the customer about changes yourself; no notifications are sent automatically. Booking status is independent of the Responses inbox. Legacy form-linked appointments remain readable, but old appointment flags on forms no longer enable booking; forms use their normal enquiry flow.

### Guarantees and limits

- Server-side contact, service, provider, date/time, notice and horizon validation. Owner-only appointment management and workspace-scoped queries. Public responses contain no staff contact details, internal schedules, idempotency keys or token hashes.
- One atomic SQLite insert, guarded by overlap triggers across the workspace/provider (including buffers). Settings revisions and active-member checks reject stale in-flight writes. A unique workspace/idempotency key plus payload/token hashes prevents duplicate confirmations, including concurrent retries. New bookings do not consume form-response usage.
- UTC ISO timestamps with business-zone display. Temporal skips nonexistent DST times, distinguishes repeated times with offsets and handles gap boundaries conservatively. Changing the business zone changes future availability, not existing appointment instants.
- Slot intervals: 15, 30 or 60 minutes. Booking horizon: 1–90 days. Minimum notice: 0–720 hours. Duration: 5–480 minutes; buffer after: 0–240 minutes. Buffer must fit working hours and avoid breaks. Up to 30 services, 31 providers, three working periods and three breaks/day, and 366 unavailable dates per scope.
- Capacity is one per provider per workspace. No external calendar sync, cross-workspace collision checking, recurring/group/overnight booking workflow, invoices, payments, reminders, customer accounts, self-service cancellation or intake-form attachment. These reference-app features are not part of this implementation. Starting prices are estimates.
- Same-day working periods cannot cross midnight; split schedules across weekdays. Completed/no-show bookings retain occupied intervals. Terminal statuses cannot be reversed. Pausing stops new bookings and rescheduling. Rescheduling uses the service’s current duration/buffer and preserves its original price snapshot. Removing a service prevents rescheduling it until restored.
- Booking lists are capped at 500 records and 93-day ranges. Calendar/date availability is refreshed on selection and confirmation rather than pushed live to every open browser. Hosted deployment remains unverified. Pending requests do not auto-expire; owners must review or close them.

Migration `0007_booking_approval.sql` adds pending/declined states and preserves existing booking statuses, links, retry hashes and receipts. Apply migrations before starting the updated app.

### Verification and local demo

`npm test` runs domain tests and real request-handler tests using all SQL migrations, SQLite transactions and triggers, with only D1 transport and identity replaced at the boundary. It covers separation from forms, concurrent conflicts/retries, cancellation/rescheduling, contact validation, authorization, migration preservation, DST, notice/horizon rules, and existing enquiry/product behavior.

After local migration, `node scripts/demo-login.mjs` creates/resets a dedicated local demo login and writes credentials to ignored `.sites-runtime/demo-login.json`. Start the Worker with `npm start`; `node tests/appointments-live.mjs` exercises actual Better Auth login and local D1 concurrency. This fixture modifies its dedicated demo appointment settings and creates a cancelled test booking. Never use it against a customer workspace. The older Sites-header integration suites still require migration to Better Auth sessions and are not used as regression gates.

## Customer management and booking navigation (October 15, 2026)

The appointment area has refreshable hash links for Requests, Bookings, Customers, Calendar, Services and Availability. Customer profiles and booking details have their own links; browser Back returns to the previous section. The Requests queue covers pending requests across all dates rather than only the displayed booking range.

Owners can create confirmed appointments for a customer using server-generated available slots. The same atomic availability checks and idempotency rules apply. Public requests still need owner approval. There is no appointment WhatsApp handoff.

Migration `0008_appointment_customers.sql` backfills customer profiles for existing bookings with email contact information, links future appointments atomically using normalized email plus phone within the workspace, and records status/time/provider changes in an activity log. Contacts are unverified customer-supplied data, not authenticated identities. Public submissions never overwrite owner-edited profile fields or private notes. Changing a customer's contact details preserves historical booking snapshots; future submissions with different contact information can create a separate profile. Archiving a profile does not cancel appointments or prevent that contact from submitting a new request.

Customer lists support search and archived records. Owners can add/edit customers, keep private notes and open their appointment history. Profiles and histories are capped at 500 records; refine search for larger lists. Public status access still requires the private booking token and never returns customer profile notes. Historical activity before this migration is not reconstructed.

### Reference review and remaining scope

Read-only inspection of Scritches covered its booking summary, pending request approval, client list/profile/history, service editing and application navigation. Existing earlier inspection covered availability and the public service/date/contact/review flow. No Scritches records were changed or imported.

Scritches also exposes invoicing, credits, client portals, recurring bookings, service pricing variants, documents, reviews, intake forms, staff visit tracking and pet-specific records. Those are not implemented in this update. FormChat remains a general appointment system with separate forms. Automatic email/SMS delivery, payments, external calendar synchronization, multi-service/recurring appointments and customer login/self-service are still unavailable. Owner-created bookings must currently use active online services and the configured notice/horizon rules. Deployment remains local.

## Focused form builder — October 16, 2026

The form editor now has a Welcome / question / Ending outline and edits one block at a time for every existing layout. Build, Design and Settings separate content from styling and delivery options. Images and conditional logic sit in expandable controls. Preview form opens a complete test flow; preview answers are never saved or sent. The inline preview is unmounted while the full preview is open to avoid duplicate field IDs.

New forms default to one question at a time. Creation offers a blank form or template without requiring three separate setup decisions. Appointment-request templates are hidden from the new-form chooser; existing forms and snapshots are unchanged. Existing forms keep their saved layout. Appointment-related footer text only appears when a form actually contains a date question. The welcome screen shows one heading instead of repeating the form title.

Reference patterns: Youform's ordered question blocks and one-question default (https://youform.com/features/ and https://help.youform.com/can-i-add-multiple-questions-on-the-same-page-in-youform-zvmx6); Typeform's content/design/preview/publish workflow (https://help.typeform.com/hc/en-us/articles/360053660271-My-first-form). This adapts interaction patterns to FormChat; it does not reproduce every feature of those products. Existing form WhatsApp behavior remains explicit, and appointments remain independent.

## Product catalog and homepage refresh — October 17, 2026

Product forms now show compact product cards with price, availability and option count. Open a card to edit it; sizes and personalisation are in an optional disclosure. Done editing closes the card; edits still autosave as drafts and require publishing to reach customers. Removing a product requires an inline confirmation. Delivery/pickup setup remains optional.

Customer product buttons explicitly add or remove an item. Quantities, option price adjustments, stock validation and saved order requests keep their existing behavior. Preview answers are not saved or shared. Product forms collect requests and estimates, not online payments.

The public homepage (`/about`, also shown to signed-out visitors) uses a simpler hero, direct demo navigation and an interactive form demonstration inspired by https://youform.com/. FormChat keeps its own design, actual plan limits and supported features. No database migration is needed for this refresh.

## Conversion-focused landing page — 2026-10-17

Removed the form-layout picker, live flower demo and use-case strip from the public landing page. The page now presents an outcome-led headline, a clearly labelled illustrative request/inbox preview, three benefits, a three-step setup explanation, actual plan limits and FAQs. Signup calls to action use consistent wording. No conversion uplift is claimed without measurement; form and booking behavior is unchanged.

## Separate landing examples — October 19, 2026

The header contains no example. The dedicated Examples section offers a project enquiry using the actual Customer renderer in preview mode and an interactive appointment walkthrough (service, sample date/time, details, review, demo completion). Appointment times are illustrative; the demo does not call the booking API or reserve slots. Neither example saves data or sends messages.

## Forms workspace — October 20, 2026

Forms now have their own **Build / Share / Responses / Settings** navigation. The hash URL `#forms/<id>/<section>` reopens the same owned form and destination after reload. The form header keeps autosave status, Preview and Publish visible as separate actions. Unsaved edits remain in the mounted builder while changing destinations; leaving via Back to forms waits for the save queue.

- **Build:** select a welcome, question or ending block in the visual canvas to open its contextual inspector. Add questions from the left drawer. Product forms retain their catalog, quantities, options and delivery/pickup setup in the Products subtab. Question order and duplication controls remain keyboard-accessible in the inspector.
- **Bulk choices:** enter one label per line, including labels containing commas. Input is trimmed, blank lines ignored, and duplicate labels, over 30 options, or labels over 100 characters rejected. Images stay with matching labels. Explicit renames update dependent visibility/routing rules; removing choices referenced by equality rules is blocked until those rules are updated. Reordering choices does not rewrite rule meaning.
- **Placeholders:** optional custom placeholder text is supported for text, email, phone, number, URL, address and dropdown questions. It is validated to 200 characters by the server schema and rendered in customer forms. Existing forms need no migration because their JSON question metadata remains valid without this property.
- **Share:** a dedicated destination supplies public links, copyable greeting/waiting/away-message templates and downloadable QR codes. Copy/download actions are gated for unpublished/paused forms. Templates are copied for manual use; messages are not sent or installed in WhatsApp automatically.
- **Responses:** the per-form inbox and CSV export use a fixed form ID while keeping search, dates, workflow status, assignment and handoff filters. Workspace authorization still runs on the server. The workspace-wide inbox remains available separately.
- **Settings:** layout, conditional flow, recipient routing and design reuse the existing controls. Preview completes without saving or sending anything. Publishing remains an explicit operation.

Appointments stay in their independent application and booking page. At this stage there was no widget; the October 21 update below adds website embedding. AI generation, file responses, payment collection and custom domains remain outside this update.

Verification: `npm test` (38 tests), `npm run typecheck`, `npm run build`, `npm run test:experiences` (28 authenticated local API checks), and `npm run test:auth`. The experience harness provisions a unique verified account only in local D1, signs in through Better Auth, and removes its test workspace/account afterwards; forged identity headers remain rejected. Browser checks covered canvas selection, insertion, duplicate and valid bulk choices, save continuity across tabs, draft sharing restrictions, scoped existing responses, published-link copying, QR generation, Settings direct-link reload and preview completion.

## Form design, reliable errors and website widgets — October 21, 2026

**Settings → Design** now controls each form’s page/surface colours, accent, button, text, borders, font, font size, corners, heading alignment, submit label, logo and footer branding. Four starting styles are provided. These controls are available on every plan; business-level branding rules remain separate. New forms start with the business colours; owners can override them per form. Existing saved accent/button choices are preserved. Publish to apply draft changes publicly. Appearance is optional JSON metadata, so no migration is needed. Arbitrary custom CSS/HTML and custom font uploads are not supported.

Choice labels use individual single-line inputs. Bulk editing remains an explicitly labelled one-choice-per-line area. Hidden image-upload inputs no longer create horizontal page overflow. Editing is locked while publishing or leaving through Back to forms. Links to another form now open that form rather than leaving the previous editor visible.

API responses are read safely even when a Worker/proxy returns plain text or HTML. Expired sessions have a sign-in action in the editor; save failures retain the local draft and give a retry message instead of a JSON parser exception. This prevents the reported `Unexpected token` error from obscuring the service failure; it does not repair an upstream Worker outage. Browser recovery requires local storage and a matching server revision.

### Install a website widget

1. Publish the form, then open **Share → Website widget**.
2. Set the button label, colour and bottom-left/right position.
3. Copy the widget code into your website before `</body>` and publish the website. Use the public HTTPS FormChat origin for a deployed website; localhost snippets work only locally.
4. Use **Test widget** to check the real form. Test submissions are real responses. Use **Share → Website embed** for an inline iframe instead of a floating widget.

The dependency-free `/widget.js` loader isolates its button/dialog styles with a shadow root and loads the published customer form in a sandboxed iframe. It supports close, Escape, backdrop dismissal, focus return and a new-tab fallback. Install once per form per page. Widget options are encoded in the copied snippet; copy it again to change an installed launcher. Form design changes propagate after publishing without replacing the snippet.

Embedded forms save the response and display its reference before offering a new-tab WhatsApp handoff. The customer must tap Send in WhatsApp; message delivery is not confirmed. Ordinary public links retain their existing handoff behavior. Paused/unpublished forms cannot accept responses. Appointments remain independent.

Site builders must allow custom scripts or iframes. If the host has a Content Security Policy, allow the FormChat origin in `script-src` and `frame-src`; do not remove other protections. Automatic inline embeds fit their content; a fixed-height fallback remains available for builders that block scripts. No automatic host installation, cross-page analytics or external messaging service is included. Hosted deployment and third-party site-builder compatibility have not been verified.

### Form and widget UI refinements

Forms now default to **Poppins**, with **Montserrat** available in Settings → Design. Older neutral/system forms adopt Poppins; explicit Outfit, serif and mono choices remain supported. Fonts are self-hosted WOFF2 assets, including their OFL licenses in `public/fonts`; no Google Fonts request is needed at runtime. Characters outside the bundled Latin subset use the system fallback.

Widget configuration and typography selectors have matching 44px fields, visible borders and keyboard focus, readable helper text, and layouts that stack in narrow panels. Widget button preferences are remembered per form in this browser, independently of the form draft; copy the snippet again to update an installed launcher. Long launcher labels wrap, popup titles truncate without displacing the close/open controls, and Escape from a form field closes the widget with focus returned to its launcher. Close messages are accepted only from the matching embedded window and service origin. Page configuration is shown only for the Sections layout.

## Website embeds for forms and appointments

- **Forms:** open the form → Share → Website embed. Publish the form first.
- **Appointments:** open Appointments → Website embed beside the booking-page link. Enable booking and configure an active service first.
- Automatic height is the default. Choose a maximum width (480, 640, 800 px, or full parent container); the default is 640 px. The embed never exceeds a smaller parent column. Copy the complete iframe + resizing script into a custom HTML block inside the desired section. Copy code from the deployed HTTPS app; localhost code is only for local testing.
- Preview embed loads the real public flow. Submitting creates a real form response or appointment request; stop before Submit to inspect safely. Form responses are saved before offering WhatsApp. Appointment requests use live availability, atomic conflict checks, idempotency and owner approval; they have no WhatsApp handoff.
- Automatic sizing requires both frames and scripts from the app origin (`frame-src` and `script-src` when using CSP). `/embed.js` accepts resize messages only from the embedded window at that service origin with the matching public resource ID. ResizeObserver updates intrinsic content height when content or container width changes, including growth and shrinkage across steps. Height is bounded to 80–20,000 px, with a small rounding allowance; very large content can still scroll at the upper bound. Inline pages use compact layouts rather than a full viewport minimum height.
- If a site builder blocks scripts, select **Fixed height · no script**, choose 500–1400 px, and use the iframe-only snippet. **Replace previously installed fixed-height code with the new automatic snippet** to enable resizing. No automatic host installation or database migration is required.

### Floating appointment widget

In Appointments, select **Website widget** beside Website embed. Set the button label, corner and colour, then copy the script before the host’s closing `</body>` tag. The `data-booking` attribute opens the independent public appointment flow; existing `data-form` widget snippets still work. Preferences are remembered in this browser. Test widget opens a real preview with service selection, dates and times; submitting creates a real request. Requests still require owner approval, and no WhatsApp handoff is added. The widget loads only when opened, isolates its styles, and supports close, Escape from a customer field, and a new-tab alternative. Use one floating button per corner when installing multiple widgets.

### Responsive QA and lint — October 24, 2026

Lint is enforced with zero warnings. Hook dependencies, draft recovery and embed measurement were reviewed; booking embeds now fit narrow website columns and mobile workspace fields use 16 px text. See [Browser QA](./BROWSER_QA.md) for the tested workflows, evidence and remaining Safari/Firefox/physical-device checks. Run `npm run test:browser-fixtures` with the local app on port 5174 to provision disposable forms/bookings and a separate website host on port 5180; press Enter in that terminal to clean up afterwards.
