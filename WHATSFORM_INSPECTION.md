# WhatsForm inspection and FormChat adaptation plan

Inspected: 20 October 2026. Reference: https://app.whatsform.com/.

## Scope and confidence

This is a product and interaction inspection through the signed-in UI and public customer forms, plus a comparison with FormChat's repository. It is not access to WhatsForm's source code, database, or private API implementation. Internal implementation details below are proposals for FormChat, not claims about WhatsForm internals.

No form was created, edited, published, restored, deleted, or submitted. No invitation, WhatsApp message, integration connection, purchase, or account-setting change was made. Field selection, menus, dialogs, previews, and navigation were inspected. The existing Food Order Template was the main reference.

The available account is on Free. Responses, team invitations, conditional logic, and advanced capabilities have plan restrictions. Visible controls and descriptions are distinguished below from verified end-to-end functionality. No successful WhatsApp handoff, saved response, booking, payment, or integration execution was tested.

## 1. Navigation and form management

Observed dashboard:
- Workspace selector with current workspace, a settings gear, and New workspace.
- Greeting, form search, member shortcut, and New WhatsForm action.
- Form cards show form name, public link, Edit, Share, and Responses.
- Card overflow offers Duplicate, Settings, Rename, and Delete. A pin affordance is visible on interaction.
- Account menu offers Account Settings, Billing, and Logout; language and Help sit alongside it.

Within a form there are four primary destinations: Build, Share, Responses, Settings. Build has a separate toolbar for Preview, Open, and Publish. The publish dropdown offers Restore to last published version. The label is verified; restoration was not executed.

The published public form omitted rating, date, and extra email fields that were present in the builder preview. This supports a distinct draft versus published experience, but does not prove its storage or versioning implementation.

## 2. Creation flow and templates

New WhatsForm opens three clear choices:
1. Start from scratch: add questions to a blank form.
2. Use template: select a premade starting point.
3. Create with AI: a chat-style prompt composer with image attachment.

Template gallery inspected: Travel Booking, Appointment Booking, Contact Form, Customer Feedback, Food Order, Shopping Store, Event Registration. Cards have a name, brief use-case description, thumbnail, and eye preview link.

AI onboarding displays a prompt asking what type of form to create, a multiline composer, attachment action, Send, and suggested prompts for Appointment Booking, Contact / Enquiry, Customer Feedback, Event Registration, and Food Order. No prompt was sent; generated quality and editing behavior remain unverified.

## 3. Builder interaction model

The builder shows a centred white form canvas on a pale neutral background. Its green add action opens a left drawer. Clicking a question outlines the selected block and opens the right editor drawer. Selection scrolls the field into view. The rest of the form remains visible as context.

Each block has drag, logical-jump, duplicate, and delete affordances. Reordering, duplication, and deletion were not executed. A selected field exposes only the settings relevant to that field; this progressive disclosure is the main pattern worth adapting.

Basic palette: Text Input, Multiple Choice, Checkbox, Dropdown, Number, Rating, Date, Email, Phone, Title, Image, Video.

Advanced palette: Page, File Upload, Calculation, Payment, Address, Appointment. These labels were inspected; their paid configuration and execution were not tested.

Field editors actually opened:
- Text Input: title, rich subtitle controls (bold, italic, link), placeholder, image, required, paragraph toggle.
- Dropdown: title, subtitle, placeholder, editable ordered options, Bulk edit, add, per-option overflow, image, required.
- Checkbox: title, subtitle, options, per-choice images, Other option toggle, field image, required.
- Rating: title, subtitle, image, Star or Survey style, required.
- Date: title, subtitle, image, Date or Date & Time mode, disable past dates, disable future dates, required.

Bulk dropdown dialog: multiline choices, comma/newline separation, optional numeric values, Cancel and Save. The dialog was cancelled unchanged.

Choice overflow: Change image, Remove image, Assign values, Delete. Assign-values computation was not exercised. In the observed food template prices are also embedded in option labels; do not infer a calculated cart total from the labels alone.

Logic controls reference answer/date/option conditions and a destination page. Clicking the actual logic action produces a paid-plan notice. Treat the operator and destination UI as visible configuration affordances, not tested routing behavior.

## 4. Customer experience and preview

Builder Preview replaces editing with an embedded, narrow customer form and an explicit Exit Preview action. It contains the current draft fields. The public form was inspected separately.

The inspected public food form uses a classic scrolling page: hero image, title and description, section headings, product images, dropdown variants, separate quantity choices, picture checkboxes for sides, customer details, delivery preference, and Submit on WhatsApp. Dropdowns allow search/selection. Required fields use an asterisk. Branding links back to WhatsForm.

The public Appointment Booking template is a request form with name, email, new/returning customer, service checkboxes, and preferred date/time. This template alone does not demonstrate a live availability engine or atomic booking confirmation. The Advanced Appointment field and Calendar integration may offer additional behavior, but were not tested.

The final submit was not clicked. Saving order, retry handling, delivery detection, and confirmation semantics cannot be established from the button label.

## 5. Sharing

All six share destinations were opened:
- Link: public URL, Copy, Facebook/Twitter/LinkedIn share links.
- WhatsApp: copyable greeting, waiting, and away-message examples containing the public form link. These are instructions/snippets; no automatic Business account setup was verified.
- Website: iframe snippet and a launcher/widget script, welcome-message text, left/right position controls, and widget preview.
- Tag Manager: custom HTML installation snippet with the form ID and welcome-message options.
- WordPress: Form to Chat plugin instructions, public link for embedding, and widget snippet.
- QR code: storefront guidance, rendered QR image, Print and Download actions.

No share message, widget install, plugin install, print job, or download was executed.

## 6. Per-form settings

General: name, slug, custom-domain guidance, WhatsApp recipient, language, submit-button text, Enable Form, branding, Save.

Notifications: WhatsApp notification toggle (enabled and disabled for editing on this account), email notification toggle, Save. No notification was sent or configured.

SEO: indexing toggle with upgrade notice, meta title, meta description, meta image with upload/link source, Save. Controls are visible; indexing was not verified.

Team routing: Single, Distribute, Conditional cards. Single displays a WhatsApp recipient input. Alternate routing configurations were not saved or tested.

Integration catalogue: Google Sheet, Google Calendar, Custom Script, Webhook, Google Analytics, Meta Pixel Analytics. Descriptions identify spreadsheet response sync, confirmed-booking calendar sync, custom hours/calendar suggestions, external response delivery, and analytics events. No connection was initiated.

## 7. Workspace, account, billing, and restrictions

Workspace settings show name, members/roles, Invite member, and a deletion area. Invite member displays a paid-plan notice on this account.

Account settings show profile details, WhatsApp number, default/custom domain selection, response usage, and account deletion. Personal details are omitted from this report.

Billing displays Free, Lite, Standard, Unlimited tiers with monthly/yearly comparison. Relevant paid distinctions include dashboard responses, SEO, upload storage, custom links, integrations, branding removal, advanced questions, multiple-agent routing, and members. These are observed plan labels, not implementation requirements for FormChat.

The Responses page displays disabled Export as CSV, Delete, Reload, and date-range controls, followed by an upgrade notice. It says dashboard viewing is excluded from the current plan and mentions retaining two months of free-plan responses, including WhatsApp drop-offs. Retention and drop-off capture were not tested. Row layout, response detail, filtering results, export format, and deletion semantics remain inaccessible.

## 8. Comparison with the actual FormChat repository

| Area | FormChat today (source inspection) | Recommended change |
| --- | --- | --- |
| Form navigation | Builder tabs for Build, Settings, Design; share modal; separate Responses area | Add clear per-form Build / Share / Responses / Settings destinations while preserving workspace navigation |
| Builder | Focused outline and selected-question editor with preview | Introduce a visual canvas with a dedicated question library and contextual inspector; keep narrow-screen editing usable |
| Field types | 14 typed answer formats with server validation | Keep existing types; add explicit placeholder and field-specific configuration only with schema + renderer + server validation support |
| Choice editing | AnswerEditor, text/picture choices, server-enforced 30-choice limit | Add multiline bulk entry, duplicate/blank validation, and consistent per-choice image controls |
| Media | Validated uploaded images, field and picture-choice media | Improve placement and editor affordances; video/file responses require separate capabilities |
| Logic | Question conditions, page flow, routing rules in model and FlowEditor | Make rule summaries and field-level entry points easier to find; preserve existing published logic |
| Products | Typed catalog, quantity bounds, options, minor-unit price adjustments | Preserve real product/order calculations; improve their presentation without reducing orders to price strings |
| Preview | Explicit preview path that does not save answers or hand off | Keep this guarantee; make device modes and Exit Preview obvious |
| Publishing | Draft/revision/version structures and explicit publishing | Show saved/published state clearly; restore needs its own validated version/history implementation |
| Sharing | Public link, copy, test form, QR generation/download in Builder Share | Build a share workspace with link, QR, WhatsApp text templates; evaluate iframe/widget separately with security checks |
| Settings | Business/form settings and existing model constraints | Separate form identity, completion, routing, branding, and availability controls; only display supported settings |
| Inbox | Existing Responses page with search and customer answers | Improve per-form entry points; retain saved-answer access and current request workflow |
| Bookings | Dedicated appointment management and public booking flow | Keep independent. Do not turn a preferred date field into a confirmed booking |
| Integrations / AI / Payments | No equivalent fully connected integration, AI-generation, or payment workflow verified in this audit | Separate projects; never add nonfunctional Connect or payment controls as visual parity |

Relevant source files: components/formchat/builder.tsx, question-library.tsx, answer-editor.tsx, flow-editor.tsx, customer.tsx, new-form.tsx, forms-page.tsx, responses-page.tsx; lib/model.ts, lib/config.ts, lib/templates.ts; app/api/[...path]/route.ts. This comparison is a source audit, not a fresh end-to-end regression run.

## 9. Implementation sequence for FormChat

### First: navigation and editing clarity

1. Give each form a stable local navigation frame: Build, Share, Responses, Settings.
2. Retain the workspace back action, form name, save status, preview, and publish controls in a clear header.
3. Make Build a canvas + field palette + contextual inspector on wide screens, with drawers on small screens.
4. Keep branding/design controls clearly separate from question content.
5. Ensure per-form Responses filters correctly by form and the back action preserves useful context.

### Next: question editing and distribution

6. Add bulk choices with 30-option enforcement, trimming, uniqueness checks, keyboard access, and no partial save on invalid input.
7. Add explicit field placeholders and supported date/rating settings through backward-compatible optional schema properties. Validate on both client and server.
8. Build the share workspace around working link, QR, and copyable WhatsApp templates. Include publish-state checks and clear customer Send instructions.
9. Evaluate embedding against frame headers, cross-origin behavior, safe URLs, responsive sizing, and preview-versus-submit semantics before exposing an embed feature.

### Later: capabilities with backend dependencies

10. Notifications, webhooks, spreadsheets, calendar sync, custom domains, AI generation, file responses, and payments need actual provisioning, permission, retry, validation, and support design. Ship each only when operational.

## 10. Acceptance criteria

- Existing forms and published versions open with their original behavior, answers, media, products, and logic.
- Editing a draft cannot silently change a published form.
- Selection/reordering/duplication/deletion keep stable question IDs and do not corrupt logic references.
- Invalid or oversized bulk choices cannot bypass server limits.
- Previews never create responses, appointments, or outbound messages.
- Customer submissions are saved before WhatsApp handoff; delivery is not implied.
- Appointments remain separate, use server availability checks and atomic booking writes, and distinguish pending from accepted status.
- All per-form destinations enforce workspace access, including direct URLs.
- Save conflicts, network errors, loading states, empty states, keyboard navigation, and small screens work.

## Remaining inspection limits

Paid-plan flows and external connections require separate access or setup to validate. No purchase is necessary to begin the first navigation/editor improvements in FormChat. This document records what was observed and what still needs validation; it does not claim a complete feature clone or an implementation change.
