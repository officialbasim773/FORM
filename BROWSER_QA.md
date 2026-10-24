# Forms, appointments and website integrations QA

Executed locally on **24 October 2026**, against the built Cloudflare Worker and real local D1/R2. Test submissions used disposable accounts/workspaces and synthetic customer data. No WhatsApp messages were sent.

## Fixes

- Removed all 51 remaining lint warnings. Corrected hook dependencies in draft recovery/autosave, onboarding, appointment settings, customer preview and embed measurement. Appointment settings now ignore responses after their workspace effect is disposed.
- Removed unused code, used explicit navigation/download controls and supplied image dimensions through the existing image component. Uploaded images continue to load directly without requiring an image optimisation service.
- Fixed booking progress, service cards and confirmation references overflowing narrow website columns. The booking calendar and service picker fit the tested iframe widths down to 231 px.
- Raised mobile workspace text inputs, selects and textareas to 16 px, including the choice editor's more specific style. Choice labels remain single-line 40 px inputs. This reduces the risk of iPhone focus zoom; physical iOS testing is still required.
- Made lint warnings fail the lint command with `--max-warnings=0`.

## Browser coverage

The available browser was the Chromium-based Codex in-app browser. Actual DOM viewport and content widths were measured at **320, 375, 768 and 1280 px**, with 812 or 900 px heights. No page horizontal overflow remained in the checked screens. Embedded content widths were checked separately from their host pages.

| Surface | Verified |
| --- | --- |
| Classic form | Required-field validation/focus; picture selection; Unicode/Arabic notes; successful saved response and receipt recovery on reload |
| Sectioned product form | Product image and quantity/price summary; next/back retains answers and selections; picture choices; saved receipt with authoritative total |
| One-question form | Welcome image; next-input focus; Enter navigation; textarea newline; Ctrl+Enter submission; saved answers |
| Public booking | Services, calendar and slots; business time zone; breaks/buffer reflected in slots; contact/review; saved pending request; same reference after reload; accurate owner-approval copy |
| Form inline embed | Real generated iframe/resizing script on a different origin; container sizing; keyboard selection/submission; iframe height updated after saved receipt; host footer usable |
| Appointment inline embed | Real generated snippet on a different origin; narrow service picker and calendar; no internal horizontal overflow |
| Floating form widget | Bounds at all four widths; loaded public flow; close/reopen; Escape from inside iframe; focus returned to launcher and host scrolling restored |
| Floating booking widget | Bounds and loaded service picker at all four widths; close/reopen; new-tab fallback; no internal horizontal overflow |
| Owner workspace | Responses, appointments, services and expanded availability; mobile sidebar navigation; no horizontal page overflow |
| Builder and sharing | Canvas, choice editor, design settings, widget configuration and inline-embed configuration; Poppins/Montserrat options; mobile single-line choice fields |

Browser-created form responses and the appointment request were saved in isolated QA workspaces. Existing owner forms and bookings were inspected without editing or publishing them. The QA fixture cleanup removed its workspace/account and uploaded objects.

## Automated checks

| Command | Result |
| --- | --- |
| `npm run lint` | Pass, **0 errors and 0 warnings** |
| `npm run typecheck` | Pass |
| `npm test` | **62 passed**, 0 failed |
| `npm run test:experiences` | **34 authenticated API checks passed** |
| `npm run test:forms-core` | **39 authenticated API checks passed** |
| `npm run build` | Pass |
| `git diff --check` | Pass |

Local evidence is in ignored `outputs/`: `mobile-browser-metrics.json`, `mobile-browser-{lint,typecheck,unit,experiences,forms-core,build}.txt`, `qa-mobile-builder.png`, `qa-booking-embed-before.png`, `qa-booking-embed-after.png`, `qa-mobile-form-widget.png` and `qa-mobile-booking-widget.png`.

## Repeat locally

1. Build and start the local application on port 5174 using the README setup.
2. Run `npm run test:browser-fixtures` in another terminal. It creates a verified temporary local account, three published form experiences, an uploaded synthetic image and bookable services.
3. Read public URLs from `.sites-runtime/browser-fixtures.json`. The separate host on `http://localhost:5180` offers `/form-embed`, `/booking-embed`, `/form-widget` and `/booking-widget`, using the production snippet generators and loaders.
4. Inspect responsive widths and complete test submissions. Press Enter in the fixture terminal to remove its data and stop the host. Keep the app running until cleanup completes.

## Remaining verification limits

- **Safari, Firefox, physical iOS/Android and native WhatsApp were not available for this run.** Responsive Chromium testing does not establish compatibility with those engines/devices, virtual keyboards or touch behavior.
- Browser tooling could fill cross-origin iframe fields but could not reliably pointer-click iframe controls. Embedded form submission was exercised through real keyboard input; native touch/pointer testing remains required.
- Complete submissions were checked in direct public forms/bookings and the inline form embed. Full submission was not repeated in every floating widget or the appointment embed; those share the public flow and their integration sizing/navigation were checked.
- Third-party site-builder installation, restrictive customer CSPs, hosted email delivery and production resource/recovery/monitoring gates remain as documented in `PRODUCTION_READINESS.md`. This is not an unconditional production sign-off.
