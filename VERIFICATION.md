# Verification record

Executed locally on 26–27 September 2026. Uses a real local D1/SQLite database and R2 emulator, not simulated dashboard data.

## Automated checks

- TypeScript: `npm run typecheck`.
- Domain suite: seven tests covering templates, money parsing, authoritative option totals and invalid quantities/options, answer validation, readable colour contrast across 4,096 colour samples, Unicode/Arabic WhatsApp formatting.
- API suite: 77 HTTP assertions plus value assertions. Covers authentication, cross-tenant access, onboarding validation, business update, Free feature limits, draft/published isolation, optimistic conflicts, historical snapshots, paused/deleted forms, retained responses, duplicate submission races, altered duplicate conflicts, response filters, CSV, analytics deduplication, handoff tokens, CSRF, invalid uploads, response/workspace deletion and exact monthly quota races. Deleting a response does not free its consumed quota.
- Production bundle: `npm run build`.

## Browser checks

- Desktop workspace and builder at 1280px; mobile customer forms at 390px.
- New-owner onboarding: business name and WhatsApp number, back-navigation retains values, skip logo, choose template, create/edit/publish first form, generated public URL and QR image.
- Builder draft editing and explicit publishing; business appearance controls and live preview inspected.
- Service request submitted with Arabic, emoji and special characters. Saved review persisted after reload; Copy message produced the expected text.
- Cake order: two cakes, 8-inch (+AED 70), dark chocolate (+AED 20), AED 180 base = AED 540 estimated total. Submitted review matched the server total.
- Long product note validation, then valid long text generated copy-first fallback with a plain WhatsApp destination link.
- Form creation WebMCP action opens the same template chooser without creating or publishing data.

Browser QA leaves labelled test responses in the local demo workspaces. No WhatsApp messages were sent.

## Not verified against external services

Hosted Sites deployment/authentication, native WhatsApp app opening on a physical phone, real payment processing, CAPTCHA services and production-scale load. Logo/image rejection is API-tested; device-specific camera/HEIC image support is not included.

## September 27 enhancements

- Landing page inspected at 1280px and 390px, with no horizontal overflow. Both example modes and the review interaction work; the how-it-works anchor scrolls to the guide.
- Required toggle checked through switch and label activation, immediate preview changes, saving and reopening. Fixed compounded thumb translation and invisible off track.
- Added a rating from the question library and verified it autosaves; new formats have domain and published API coverage.
- Product selection, increment/decrement controls and visible size/flavour choices update the itemized estimate correctly.
- Builder fetches the current form when opening it instead of using an old listing snapshot.

## Conditional logic, multi-page forms, teams and response detail

Implemented and verified on September 28, 2026:

- TypeScript checks and production build.
- Eight domain tests, including conditional visibility chains, forged hidden values, required validation scoped by page, page ordering/cycle rejection and numeric/multiple-choice condition matching.
- Existing 77 API assertions passed without regressions.
- New `tests/team-flow.mjs`: 40 API assertions covering invitation email binding, one-time acceptance, role restrictions, cross-workspace rejection, hidden-answer filtering, active-member routing validation, answer routing, idempotency, concurrent round robin, inbox reassignment, revocation and owner fallback. Fixtures are cleaned up.
- Browser: added a page and changed a condition in the builder, saved on exit, completed a multi-page request, navigated back with preserved answers, changed Delivery to Pickup, verified automatic skipping and absence of the stale delivery address from the saved receipt.
- Browser: team invitation link creation and dedicated Team navigation, updated owner response drawer, mobile form at 390 × 844.

Invitation emails and automatic WhatsApp messages are not sent. Invitation links are shared manually; the customer still chooses to open and send the WhatsApp message.

## Classic / Multi-page / Interactive experiences

- Added creation-time and builder experience selectors; legacy forms preserve their previous single/multi-page behavior.
- Nine domain tests pass, including current-question validation versus complete server validation.
- Browser verified interactive welcome, Enter-to-continue, focus on the next question, conditional skipping, restored progress, review before submission (confirmed zero saved responses), and successful explicit submission followed by the WhatsApp handoff screen.
- Mobile welcome checked at 390 × 844; viewport restored afterward. Proof: `outputs/formchat-interactive-mobile.png`.
- Custom welcome copy, start button label, progress/keyboard toggles, optional question hints, back navigation and answer review are available. Product catalogs remain one step, followed by individual questions.
- `tests/experiences.mjs` verifies all three creation modes, default multi-page groups, switching without changing questions, and published welcome/progress settings (16 API checks).

## Interactive builder and direct submit UX — September 28
- Replaced the older review-before-submit flow: successful submission now saves the response, persists its receipt, and navigates directly to WhatsApp. Browser verified with a temporary test tenant and reserved test phone number; one response saved and the prefilled WhatsApp destination opened. No message was sent.
- Browser verified focused question navigation, picture-choice upload cards, dropdown-specific option editing, and synchronized question preview. Added picture placeholders to prevent controls overlapping labels before upload.
- API regressions passed: 77 integration, 40 team/routing/conditional, 16 experience, and 14 media checks, including cross-workspace image rejection and image retrieval.
- TypeScript and nine domain tests passed; production build checked. All temporary UX forms/tenants were removed without changing existing user forms.
- Screenshots: `outputs/formchat-picture-builder.png`, `outputs/formchat-experience-cards.png`.

## Builder, response workflow and ordering polish
- TypeScript, production build and 10 domain tests passed. API regression suites passed: 77 integration, 40 team/routing, 14 media and 17 new workflow checks.
- New workflow tests cover persisted statuses/notes, status filtering, note search, preservation of assignment/customer receipt, invalid inputs and cross-tenant write rejection.
- Browser checked saved delivery/pickup setup reusing the template address, sold-out products disabling selection, category controls, 320px phone preview, status filters and private-note panel. Backend checks confirmed persisted availability and the conditional address rule.
- Migration `0003_response_workflow.sql` applied locally. The temporary product form was removed; existing customer responses were only viewed, not edited.
- Screenshots: `outputs/product-builder-polish.png`, `outputs/response-workflow.png`.

## Standalone appointments — 2026-10-14

- Appointments now have an independent public booking page and owner Calendar, Bookings, Services and Availability sections. New bookings create no form response and consume no response quota. Historical links remain preserved.
- Migration 0006 applied locally. All 28 domain/request-handler tests passed, including atomic overlaps, concurrent idempotency, authorization, cancellation/rescheduling, time zones/DST, migration preservation and existing enquiry/product flows.
- TypeScript and production build passed after final UI fixes. Actual Worker/D1 appointment tests and Better Auth smoke tests also passed during implementation.
- Browser verified service selection, available dates/times, customer details, review and a successfully saved confirmation. Its reserved time disappeared from availability and appeared in the owner calendar. No WhatsApp message was sent.
- Fixed stale slots after resetting a booking and guarded empty owner date inputs. Existing form response count remained unchanged. Browser preview uses the dedicated local demo workspace.
- Screenshots: outputs/standalone-booking-desktop.jpg, outputs/standalone-booking-confirmation.jpg, outputs/standalone-owner-calendar.jpg.
- Local preview only; no hosted deployment. External calendar sync, payments, reminders and customer self-service changes are not implemented. See README for full limits.

## Appointment approval and layout update — 2026-10-15

- Removed the appointment WhatsApp step. New bookings remain Pending until accepted; decline/cancel releases availability. Existing confirmed appointments keep their status.
- Added revision-checked accept/decline actions, protected customer status refresh, pending-first list, approval count and status filters. Calendar is a secondary view. Standardized card spacing, field/button alignment, wrapping and mobile styles.
- Applied migration 0007 locally. All 30 tests passed; TypeScript and production build passed. Live Better Auth/D1 checks passed for acceptance, decline, private status access, conflicts, retries, cancellation and unchanged form response counts.
- Visual browser verification was blocked by the browser URL policy. The CSS changes have not been visually verified in this turn. No new screenshots are claimed.
- Local app is running on port 5174. No hosted deployment. Pending requests have no automatic expiry; email/SMS notifications and cross-device receipt recovery remain unavailable.

## Customer handling and navigation — 2026-10-15

- Inspected reference booking details, request approval, customer list/profile and service editor read-only.
- Added customer profiles, private notes, archiving, booking history, manual owner booking, dedicated pending queue, hash navigation and booking detail/activity screens. Migration 0008 applied locally.
- 32 tests passed, including customer linkage, owner-only access, cross-workspace isolation, private-note exclusion, activity tracking and manual-booking conflict/idempotency behavior. TypeScript passed.
- Browser verified existing demo customer -> Add booking -> service/provider/date/time -> saved confirmed booking -> customer history. Booking reference ed3ca68b-3c9e-4df1-b5a6-5557d0e62dea is local demo data. No external notifications were sent.
- Captured outputs/appointment-customer-profile.jpg. Remaining feature gaps are listed in README; this is not complete Scritches feature parity.

## Navigation follow-up — 2026-10-16

- Corrected workspace hash routing so leaving Appointments for Responses, Analytics, Team or Business settings preserves the selected destination and supports refresh/back navigation.
- TypeScript passed. Restarted the local preview after it stopped between sessions.
- Final production build passed. Browser verified 390px appointment layout without page overflow (375px scroll width), workspace section URL changes and browser Back. Restored the normal viewport after testing.

## Focused form builder — 2026-10-16

- Simplified creation to form/product templates; new forms default to one question at a time. Existing saved layouts remain unchanged.
- Added Welcome / Questions / Ending outline, selected-block editing, separate Settings and Design, collapsed media/logic controls, and a full preview that does not persist responses or open WhatsApp.
- All 32 tests, TypeScript and production build passed. Browser verified draft creation, title autosave, question editing, complete preview and unchanged response count (5).
- Inspected desktop (1440px) and mobile (390px) layouts; corrected tab overflow, outline label styling and mobile outline ordering. Screenshot: outputs/form-studio-final.jpg.
- README documents behavior. Local preview only; this does not claim full Youform or Typeform feature parity.

## Product catalog and landing page — 2026-10-17

- Replaced fully expanded product editors with catalog cards; added optional options section, clear edit actions and an inline product-removal confirmation. Existing draft/API schemas preserved.
- Browser checked adding a personal message option, closing the editor, retrying save after the demo login expired, and successful save. Created only a local draft; no publish or customer submission.
- Customer preview verified adding a bouquet, choosing the AED 60 size adjustment, quantity 2 and correct AED 360 total, then removing it.
- Inspected desktop landing page and 390px catalog. Refined narrow-screen tabs and preview-only privacy copy.
- All 32 existing tests passed. Screenshot: outputs/landing-refresh.jpg. Local preview only.
- Final TypeScript and production build passed. Reopened the saved product draft and verified its three options persisted. Final 390px checks passed for catalog tabs and public homepage; viewport override reset. Local server running on port 5174.

## Landing hero and action visibility — 2026-10-17

- Added a responsive interactive hero sample with selection, demo completion and reset. No customer data is saved or sent by the sample. Added use-case strip and refined landing section spacing.
- Add service now has a solid green background, plus icon and clear button boundary. Secondary appointment actions have visible borders and keyboard focus outlines.
- TypeScript and production build passed. Browser verified sample selection/completion/reset, 390px layout, desktop hero, and visible Add service/Save changes controls. No appointment settings were changed.
- Screenshots: outputs/landing-hero-desktop.jpg and outputs/add-service-visible.jpg. Local preview only.

## Landing examples — 2026-10-19

- Removed the header illustration and added a separate Examples section with form and appointment selectors.
- TypeScript and production build passed during implementation. Browser completed all four enquiry questions and the appointment flow through service, date/time, details, review and demo completion. Completion explicitly states no appointment was saved or confirmed.
- Verified restart and service selection. Screenshot: outputs/landing-appointment-example.jpg. Demo availability is illustrative, not connected to a business calendar. Existing booking and form APIs unchanged.

## Bug fixes — 2026-10-19

- Appointment settings are disabled during an in-flight save; duplicate submits are guarded. Unsaved settings are recovered from workspace-scoped session storage after in-app navigation. Browser unload warns while dirty. Revision checks remain enforced, including recovered drafts that conflict with newer server settings.
- Add product stops at 40 products; Add choice stops at 30 values, matching server limits.
- 32 tests, TypeScript and production build passed. Browser verified unsaved description survives Forms -> Appointments navigation and successful saving clears dirty state. Restored original demo description after verification. Screenshot: outputs/appointment-bugfixes.jpg.
- Draft recovery is limited to the current browser tab session and requires browser session storage. No production deployment.
