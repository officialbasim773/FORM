"use client";
import { CheckCircle2, CircleAlert, Pause, Play } from "lucide-react";
import { Business, Draft, FormRecord, draftSchema } from "@/lib/model";
import { PLANS } from "@/lib/config";

export default function FormSettings({
  draft,
  form,
  business,
  busy,
  onChange,
  onStatus,
}: {
  draft: Draft;
  form: FormRecord;
  business: Business;
  busy: boolean;
  onChange: (patch: Partial<Draft>) => void;
  onStatus: (status: "paused" | "published") => void;
}) {
  const parsed = draftSchema.safeParse(draft);
  const issues = parsed.success
    ? []
    : [...new Set(parsed.error.issues.map((i) => i.message))];
  const checks = [
    {
      label: "Questions and answer rules",
      detail: issues.length
        ? issues.join(" ")
        : `${draft.questions.length} questions configured.`,
      ready: !issues.length,
    },
    {
      label: "WhatsApp destination",
      detail:
        draft.routing && draft.routing.mode !== "owner"
          ? "Team routing is enabled. Active teammates are checked when publishing."
          : draft.whatsapp?.phone || business.phone,
      ready: /^\+[1-9]\d{7,14}$/.test(draft.whatsapp?.phone || business.phone),
    },
    ...(draft.type === "product"
      ? [
          {
            label: "Product catalogue",
            detail: !PLANS[business.plan].products
              ? "Product publishing requires the Business plan."
              : "At least one visible, available product is needed.",
            ready:
              PLANS[business.plan].products &&
              draft.products.some((p) => !p.hidden && p.available !== false),
          },
        ]
      : []),
    {
      label: "Customer confirmation",
      detail:
        draft.completion?.autoOpenWhatsApp === false
          ? "Customers see confirmation before continuing to WhatsApp."
          : "Responses are saved before WhatsApp opens. Embedded forms show confirmation first.",
      ready: true,
    },
  ];
  return (
    <section className="form-general-settings">
      <div className="editor-intro">
        <span className="section-kicker">FORM SETTINGS</span>
        <h3>Make your form ready to share</h3>
        <p>Manage this form’s details and whether it accepts responses.</p>
      </div>
      <label>
        Form title
        <input
          maxLength={120}
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </label>
      <label>
        Description
        <textarea
          rows={3}
          maxLength={700}
          value={draft.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </label>
      <div className="form-acceptance">
        <div>
          <strong>
            {form.status === "published"
              ? "Accepting responses"
              : form.status === "paused"
                ? "Responses are paused"
                : "Form is unpublished"}
          </strong>
          <p>
            {form.published
              ? `Published version ${form.version}. Draft changes stay private until published.`
              : "Preview your form, then use Publish form to make it available."}
          </p>
        </div>
        {form.published && (
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() =>
              onStatus(form.status === "published" ? "paused" : "published")
            }
          >
            {form.status === "published" ? (
              <Pause size={16} />
            ) : (
              <Play size={16} />
            )}
            {form.status === "published"
              ? "Pause responses"
              : "Reopen published form"}
          </button>
        )}
      </div>
      <h4>Launch checklist</h4>
      <ul className="form-launch-checks">
        {checks.map((c) => (
          <li key={c.label}>
            {c.ready ? <CheckCircle2 size={19} /> : <CircleAlert size={19} />}
            <div>
              <strong>{c.label}</strong>
              <p>{c.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="small">
        Publishing also checks workspace permissions, active team members and
        your plan’s form limit. Use Preview form to test your customer flow
        without saving a response.
      </p>
    </section>
  );
}
