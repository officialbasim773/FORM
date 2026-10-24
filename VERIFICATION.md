# Verification record

For the 24 October 2026 lint cleanup and responsive forms/appointments/embed/widget checks, see [Browser QA](./BROWSER_QA.md). Lint now passes with **0 errors and 0 warnings**; physical mobile devices, Safari and Firefox remain unverified.

For the 23 October 2026 production remediation, current test results and remaining hosted gates, see [Production readiness](./PRODUCTION_READINESS.md). The records below describe earlier verification runs.

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

## Forms workflow adaptation — October 20, 2026

Implemented the first two priorities from WHATSFORM_INSPECTION.md within the existing Forms application: stable per-form Build/Share/Responses/Settings destinations, a selectable canvas and contextual inspector, a left question drawer, bulk choices, optional placeholders, share channels, and a fixed-form inbox.

Verification:
- 38 unit/domain/appointment tests passed; six new tests cover bulk limits, commas, rule-safe reordering/renaming/removal, substring rules, and optional placeholder compatibility.
- Type checking and production build passed.
- 28 local API checks passed using actual Better Auth sessions across classic, multipage and interactive forms. Placeholder persistence, oversized metadata rejection, and separate-form reads/filtering were included.
- Auth smoke checks passed, including rejection of forged legacy identity headers.
- The legacy experience harness initially failed because it used obsolete identity headers. It now uses isolated local verified accounts and real sessions; authentication was not weakened.
- Browser: edited a placeholder and returned it to blank, switched Share/Build with save continuity, added a temporary optional choice question in an unpublished demo draft, rejected duplicate bulk labels and applied valid choices. The demo draft was not published. Later user edits in that draft were left in place.
- Browser: existing published demo form showed 3 responses in its scoped inbox versus 5 workspace responses; copied its public link and generated its QR code; opened WhatsApp templates without sending; reloaded its Settings direct link successfully; completed its full preview with an explicit no-save state.
- Desktop and approximately 833 px panel layouts inspected. Smaller-screen layout is defined in CSS but was not separately exercised at a phone viewport in this run.

No migrations: placeholder is optional JSON metadata. Existing submissions, catalog prices and booking behavior retain their existing model/validation paths. No external embedding/widget, payment, notification, AI, or integration service was added.

## Custom form design and website widgets — October 21, 2026

- Safe response decoding covers plain-text Worker errors, HTML proxy failures, expired sessions, structured validation errors, empty 204 responses and malformed successful responses. Drafts remain recoverable on failed saves; upstream Worker reliability is a separate infrastructure concern.
- Added validated per-form design metadata and owned-logo checks. Existing published data remains readable. All plans can style forms; business settings gates remain separate. Choice rows are single-line inputs with independent delete buttons.
- Added real floating widgets and inline embeds in Share. Script labels are escaped, origins/slugs/colours validated, host styles isolated, and embedded submissions keep the saved confirmation before offering WhatsApp.
- Passed 42 unit/domain/appointment tests, 34 authenticated experience API checks, auth smoke checks, TypeScript and the production build. New tests cover response decoding, appearance defaults/bounds, invalid or unowned logos, free-plan customisation/published persistence, snippet escaping and executable-origin rejection.
- Browser verified compact choice rows and all design controls. Found a hidden file input extending the page width; after fixing, both Layout and Design measured document width equal to the 1265px viewport. Existing user draft settings were preserved and not published.
- Browser verified copyable widget code escapes quotes in its label. A separate local website on port 5180 loaded the custom serif/brown customer form from port 5174 despite conflicting host button/iframe CSS. Opening, closing, reopening and Escape from the close button worked, returning focus to the launcher.
- The browser automation could read but could not click controls inside the shadow-root iframe (reported unavailable targets). Verified required-field validation and successful embedded-mode submission by opening that same iframe URL directly. The confirmation remained on the page, displayed a reference and a separate WhatsApp link. An authenticated API read verified exactly one saved response. No WhatsApp message was sent. Removed the isolated local test workspace/account afterwards.
- Screenshots: `outputs/form-design-fixes.png` and `outputs/website-widget.png`. Viewport override did not change the measured browser viewport; separate phone-size browser verification remains outstanding. Cross-origin here means different local ports, not a hosted third-party deployment.

No database migration. Hosted deployment, external site builders and Escape while focus is inside a cross-origin iframe remain unverified.

## Widget and typography UI repairs — October 21, 2026

- Replaced borderless native selectors in the Forms editor, Design and Share with matching 44px controls, visible borders, clear focus and explicit labels. Improved contrast, spacing, narrow-panel stacking and code copying. Widget configuration now has a labelled button preview and separate installation step.
- Added self-hosted Poppins (default) and Montserrat, with bundled licenses. Existing system-font forms adopt Poppins while explicit legacy font selections remain supported. Verified Poppins is loaded in the editor and customer iframe; both fonts survive authenticated save/publish/read checks.
- Widget preferences persist per form in browser local storage. Verified changing label/position, switching to Settings and returning to Share preserves them. Restored the original Contact us/right settings after checking. No existing draft was published and no new customer response was submitted during these UI checks.
- Long popup titles truncate without crowding the external link/close control. Long launcher labels wrap. Escape from inside a customer field closes the dialog and returns focus to the launcher. Opening locks host scrolling; closing restores its previous overflow property.
- Page configuration and question page assignment are hidden outside the Sections layout. Updated the obsolete Questions-tab guidance to point to Build → Logic and visibility.
- Passed 43 unit/domain/appointment tests, 34 authenticated API checks, TypeScript, production build, JS syntax and diff whitespace checks.
- Desktop: measured 44px selectors with 1px borders, Poppins loaded, and equal viewport/document widths. Phone: because the browser viewport override was inconsistent, used temporary same-origin 390px iframes to exercise real media/container queries. Share fields and Design fields stack in one column with no horizontal overflow (375px content area with a scrollbar). The mobile dialog fits within the 390px viewport; its customer frame renders Poppins without horizontal overflow. Escape/scroll restoration was verified from inside the nested customer frame.
- Screenshots: `outputs/widget-ui-fixed.png`, `outputs/form-typography-fixed.png`, `outputs/widget-mobile-fixed.png`. Temporary responsive-check pages were used only for local verification and removed from the build afterwards. Third-party hosted compatibility remains unverified.

## Inline form and appointment embeds — October 21, 2026

- Added a dedicated Forms → Share → Website embed destination and an Appointments → Website embed dialog using a shared component and validated snippet generator.
- Configurable height (500–1400), responsive width, copy code, installation guidance and optional real iframe previews. Unpublished forms and paused/unconfigured booking pages cannot copy or preview an active embed from these controls. Old installed embeds retain the public endpoint’s normal status checks.
- Appointment embed mode reduces surrounding spacing and preserves embed mode when returning through its business header. Booking logic, authorization, atomic availability checks and saved/approval statuses are unchanged.
- 44 unit/domain/appointment tests pass, including separate public URLs, safe origin/identifier handling, and invalid height rejection. TypeScript and production build pass.
- Browser verified form iframe rendering, changing height to 1100 and copying the updated snippet. Verified appointment dialog, disabled actions at height 100, restored height 900, copying and live preview. Selected the service and October 25 inside the appointment iframe; real available dates and time slots loaded with no horizontal overflow (459px content width). No form or booking was submitted in these checks.
- Screenshots: `outputs/form-website-embed.png`, `outputs/appointment-website-embed.png`, `outputs/appointment-embed-preview.png`. Third-party hosted installation remains unverified; iframe height is manual with internal scrolling.

## Responsive inline embeds and appointment widget — October 21, 2026

- Replaced the default fixed-height snippet with a container-constrained wrapper and automatic height. Default maximum width is 640 px, with compact/wide/full-column choices and a fixed-height, script-free fallback. Existing installs need the new snippet to gain automatic height.
- Public inline mode removes full viewport minimum heights and surrounding page padding. Booking embeds/widgets use a compact layout. `/embed.js` handles lazy loading, duplicate script initialization, multiple frames, width changes, and both increasing/decreasing heights. Parent/child handshake validates service origin, frame identity, resource type/ID and numeric bounds. It exchanges dimensions only, not customer answers.
- Added Appointments → Website widget with label/position/colour, copyable `data-booking` snippet and a live booking widget test page. Existing form widgets remain compatible. Appointment widgets show booking-specific labels and a calendar icon, retain owner approval and have no WhatsApp handoff.
- 46 unit/domain/appointment tests pass, including responsive snippet bounds, appointment widget generation, actual loader rejection of wrong origins/windows/IDs/kinds and invalid dimensions, repeated loader initialization and grow/shrink handling. TypeScript, script syntax checks, whitespace checks and production build passed.
- Browser tested actual generated snippets on a separate local website at port 5180, with app frames served from port 5174. Both inline embeds remained within the host column, shrinking from 606px to 326px without horizontal page overflow. The form grew at narrow width and shrank when restored. Multiple embeds and the appointment widget coexisted.
- Browser tested the booking embed in its same-origin preview: service view about 546px, calendar step about 1251px, then back to services about 611px (before the final small rounding allowance). This confirms content growth/shrinkage rather than a fixed reserved block. Browser automation could not press inside the separate-origin iframe, so step changes were exercised in the same-origin preview.
- Browser verified appointment widget code copying and the floating booking launcher on the separate host. Service selection and Escape behavior were checked in its app-hosted preview. No customer form or booking was submitted.
- Screenshots: `outputs/responsive-embeds.png` and `outputs/appointment-widget.png`. Third-party hosted installation remains unverified; content cannot inherit the host’s CSS across an iframe, so customer form design is configured in FormChat. Scripts must be permitted for automatic sizing; the iframe-only fallback still scrolls internally.

## Forms product workflows — October 22, 2026

- Added General settings with launch checks, form identity and pause/reopen. Reopening uses the existing published snapshot and quota checks, without publishing an unfinished draft.
- Added per-form WhatsApp fallback recipients, introductions and confirmation title/message. New forms default to confirmation before handoff; legacy forms retain their original behavior. Embedded forms always confirm first. Long messages no longer attempt an oversized automatic WhatsApp URL.
- Added contextual text, number/date, checkbox-count and rating-scale limits to the schema, builder and customer renderer. The submission API enforces the same rules; optional empty answers remain optional.
- Added ordered forward section jumps and early submission in Sections layout. The server uses the visited, visible path for validation, response snapshots and team routing. Hidden/skipped answers cannot drive jumps. Choice renames update jump references; referenced choice removal and moving jump sources to later sections are blocked.
- Exposed the existing published-version snapshots through workspace-scoped history/restore endpoints. Restoration increments the draft revision, leaves the live snapshot and response history intact, and rejects stale/cross-workspace requests. The client waits for in-flight saves and cancels pending autosave before replacing a draft; invalid unsaved edits do not have to be saved before recovery.
- Passed 54 unit/domain/appointment tests, 39 Forms core authenticated API checks, 10 section-jump API checks and 34 existing experience API checks. TypeScript and the production build passed. The initial build hit a Windows output-directory lock while the local server was running; stopping the server resolved it.
- Browser verified General settings, new-form confirmation-first defaults, WhatsApp settings persistence across save/reload, version-history listing and cancellation of restoration. Existing owner forms and their unpublished drafts were not edited or published.
- Created an isolated Forms workflow QA form for UI checks. Added sections, moved a required question, saved 10–500 character validation and an early-submission rule. In the no-save preview a matching answer skipped the final section; changing the answer restored it. A five-character answer was rejected, and a valid answer displayed the confirmation. Published only this QA form locally, deliberately cleared its title to produce a failed autosave, then verified restoring version 1 recovered the draft, cleared the error and left version 1 live. The inbox count stayed at six. No WhatsApp message was sent. The temporary QA form was removed after verification; API suites removed their isolated workspaces/accounts.
- Screenshots: outputs/forms-whatsapp-settings.png and outputs/forms-section-jumps.png. The final desktop settings tabs wrap without an inner scrollbar, and the confirmation toggle uses the shared inline layout.
- No database migration. FORMS_PRODUCT.md records the repository-based plan, supported workflows and remaining gaps. Payments, custom domains, customer file uploads, translations, AI and operational external integrations are not complete. Production hosting, real WhatsApp delivery and new settings at phone viewport sizes were not independently verified.
