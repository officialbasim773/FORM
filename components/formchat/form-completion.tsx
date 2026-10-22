"use client";
import { Business, Draft } from "@/lib/model";
import { Toggle } from "./ui";

export default function FormCompletion({
  draft,
  business,
  onChange,
}: {
  draft: Draft;
  business: Business;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const completion = draft.completion || {
    title: "Your request is saved.",
    description: "",
    autoOpenWhatsApp: true,
  };
  const whatsapp = draft.whatsapp || { phone: "", introduction: "" };
  return (
    <section className="form-completion-settings">
      <div className="editor-intro">
        <span className="section-kicker">WHATSAPP & CONFIRMATION</span>
        <h3>Turn answers into a conversation</h3>
        <p>
          Every response is saved in your inbox first. Customers review the
          message in WhatsApp and tap Send.
        </p>
      </div>
      <fieldset>
        <legend>WhatsApp destination</legend>
        <label>
          Default recipient for this form
          <input
            type="tel"
            placeholder={business.phone}
            value={whatsapp.phone}
            maxLength={16}
            onChange={(e) =>
              onChange({ whatsapp: { ...whatsapp, phone: e.target.value } })
            }
          />
        </label>
        <p className="small">
          Leave blank to use your business number ({business.phone}). Use an
          international number with +. Assigned teammates take priority; this
          number is the fallback.
        </p>
        <label>
          Message introduction
          <textarea
            rows={3}
            maxLength={300}
            placeholder={`I’ve submitted ${draft.title}.`}
            value={whatsapp.introduction}
            onChange={(e) =>
              onChange({
                whatsapp: { ...whatsapp, introduction: e.target.value },
              })
            }
          />
        </label>
        <p className="small">
          The reference, answers and order totals are added automatically.
        </p>
      </fieldset>
      <fieldset>
        <legend>Confirmation screen</legend>
        <label>
          Confirmation title
          <input
            maxLength={120}
            value={completion.title}
            onChange={(e) =>
              onChange({ completion: { ...completion, title: e.target.value } })
            }
          />
        </label>
        <label>
          Thank-you message
          <textarea
            rows={3}
            maxLength={500}
            value={completion.description}
            onChange={(e) =>
              onChange({
                completion: { ...completion, description: e.target.value },
              })
            }
          />
        </label>
        <Toggle
          label="Open WhatsApp automatically after saving"
          checked={completion.autoOpenWhatsApp}
          onChange={(autoOpenWhatsApp) =>
            onChange({ completion: { ...completion, autoOpenWhatsApp } })
          }
        />
        <p className="small">
          When off, customers see the confirmation and choose Continue to
          WhatsApp. Embedded forms always show this confirmation first. Long
          messages offer copy and paste.
        </p>
      </fieldset>
      <div className="completion-preview">
        <span className="section-kicker">CONFIRMATION PREVIEW</span>
        <h3>{completion.title || "Your response is saved."}</h3>
        <p>{completion.description}</p>
        <span className="status-badge published">Response reference</span>
        <p className="small">Continue to WhatsApp →</p>
      </div>
    </section>
  );
}
