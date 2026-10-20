"use client";
import { defaultAppointments } from "@/lib/appointments";
import TeamSettings from "./team-settings";
import { useState } from "react";
import { Trash2, Check, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Business, readableText } from "@/lib/model";
import { PLANS, PRESETS } from "@/lib/config";
import { api } from "@/lib/client";
import { Confirm, ImagePicker } from "./ui";
import { User } from "@/lib/model";
export default function SettingsPage({
  business,
  user,
  onSaved,
}: {
  business: Business;
  user: User;
  onSaved: (b: Business) => void;
}) {
  const [b, setB] = useState(business);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">THE DETAILS BEHIND YOUR FORMS</span>
          <h1>Business settings</h1>
          <p>Keep your identity and contact details up to date.</p>
        </div>
      </div>
      {!business.appointments_configured && (
        <section className="panel appointment-card">
          <h3>Optional features</h3>
          <p>
            Offer appointments with services, team schedules and available time
            slots.
          </p>
          <button
            className="btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const config = defaultAppointments();
                config.timezone =
                  Intl.DateTimeFormat().resolvedOptions().timeZone;
                await api("appointments/settings", "PATCH", {
                  enabled: true,
                  revision: -1,
                  config,
                });
                const next = { ...business, appointments_configured: 1 };
                setB(next);
                onSaved(next);
                toast.success(
                  "Appointments enabled. Open Appointments in the navigation to configure services.",
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Enable appointments
          </button>
        </section>
      )}
      <div className="settings-grid">
        <form
          className="panel settings-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const next = await api("business", "PATCH", {
                ...b,
                phone: b.phone.replace(/[\s()-]/g, ""),
              });
              onSaved(next);
              setB(next);
              toast.success("Business settings saved");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3>Business identity</h3>
          <p>Shown on your public forms.</p>
          <ImagePicker
            label="Upload logo"
            value={b.logo}
            onChange={(logo) => setB({ ...b, logo })}
          />
          <label>
            Business name
            <input
              required
              maxLength={100}
              value={b.name}
              onChange={(e) => setB({ ...b, name: e.target.value })}
            />
          </label>
          <label>
            WhatsApp number
            <input
              type="tel"
              required
              value={b.phone}
              onChange={(e) => setB({ ...b, phone: e.target.value })}
            />
          </label>
          <small>
            Include the country code, such as +971. Format validation does not
            confirm WhatsApp registration.
          </small>
          <hr />
          <h3>Default colours</h3>
          <p>
            Used for new forms. Edit each form to update its published
            appearance.
          </p>
          <fieldset disabled={!PLANS[business.plan].branding}>
            <div className="color-presets">
              {PRESETS.map((c) => (
                <button
                  type="button"
                  key={c}
                  style={{ background: c }}
                  className={b.accent === c ? "active" : ""}
                  aria-label={`Set default colour ${c}`}
                  onClick={() => setB({ ...b, accent: c, button: c })}
                >
                  {b.accent === c && (
                    <Check color={readableText(c)} size={16} />
                  )}
                </button>
              ))}
            </div>
            <div className="row">
              <label className="color-label">
                Accent
                <input
                  type="color"
                  value={b.accent}
                  onChange={(e) => setB({ ...b, accent: e.target.value })}
                />
              </label>
              <label className="color-label">
                Button
                <input
                  type="color"
                  value={b.button}
                  onChange={(e) => setB({ ...b, button: e.target.value })}
                />
              </label>
            </div>
          </fieldset>
          {!PLANS[business.plan].branding && (
            <small>Custom colours are included in Business.</small>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <button className="btn primary" disabled={busy}>
            {busy ? "Saving…" : "Save business settings"}
          </button>
        </form>
        <div>
          <section className="panel billing-panel">
            <div className="between">
              <h3>Your plan</h3>
              <span className="status-badge published">
                {PLANS[b.plan].name}
              </span>
            </div>
            <p>
              {PLANS[b.plan].publishedForms} published{" "}
              {PLANS[b.plan].publishedForms === 1 ? "form" : "forms"} ·{" "}
              {PLANS[b.plan].submissions.toLocaleString()} submissions / month
            </p>
            <hr />
            <h3>Business</h3>
            <div className="plan-price">
              ${PLANS.business.monthlyPrice}
              <span>/month</span>
            </div>
            <p>or ${PLANS.business.yearlyPrice}/year</p>
            <ul className="plan-features">
              {[
                "10 published forms",
                "1,000 submissions a month",
                "Product orders and custom branding",
                "CSV export and form analytics",
              ].map((x) => (
                <li key={x}>
                  <Check size={15} />
                  {x}
                </li>
              ))}
            </ul>
            <div className="notice">
              Payments are not connected yet. No charge or subscription will be
              created.
            </div>
          </section>
          <section className="panel account-panel">
            <h3>Account</h3>
            <p>{user.email}</p>
            <small>Secure sign-in is managed by ChatGPT.</small>
            <a className="text-btn" href="/sign-out?return_to=/">
              <LogOut size={15} />
              Sign out
            </a>
          </section>
          <section className="panel danger-zone">
            <h3>Delete workspace</h3>
            <p>
              Remove all forms, responses, analytics and uploaded images from
              this business.
            </p>
            <button
              className="text-btn danger"
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={15} />
              Delete workspace
            </button>
          </section>
        </div>
      </div>
      <TeamSettings />
      <Confirm
        title="Delete your entire workspace?"
        description="All forms, customer responses, analytics and uploaded images will be permanently removed. Your ChatGPT account is unaffected. This cannot be undone."
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          try {
            await api("business", "DELETE");
            location.reload();
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />
    </>
  );
}
