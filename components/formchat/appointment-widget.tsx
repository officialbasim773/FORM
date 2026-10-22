"use client";
import { useEffect, useState } from "react";
import { CalendarDays, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { widgetSnippet } from "@/lib/form-embed";
import { readableText } from "@/lib/model";
import { copy } from "@/lib/client";

export default function AppointmentWidget({
  id,
  enabled,
}: {
  id: string;
  enabled: boolean;
}) {
  const [origin, setOrigin] = useState("");
  const [ready, setReady] = useState(false);
  const [prefs, setPrefs] = useState({
    label: "Book an appointment",
    position: "right" as "left" | "right",
    color: "#176650",
  });
  useEffect(() => {
    setOrigin(location.origin);
    try {
      const saved = JSON.parse(
        localStorage.getItem(`formchat:appointment-widget:${id}`) || "null",
      );
      if (saved)
        setPrefs({
          label:
            typeof saved.label === "string"
              ? saved.label.slice(0, 60)
              : "Book an appointment",
          position: saved.position === "left" ? "left" : "right",
          color: /^#[a-fA-F0-9]{6}$/.test(saved.color)
            ? saved.color
            : "#176650",
        });
    } catch {}
    setReady(true);
  }, [id]);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(
          `formchat:appointment-widget:${id}`,
          JSON.stringify(prefs),
        );
      } catch {}
  }, [ready, prefs, id]);
  const label = prefs.label.trim() || "Book an appointment";
  const code = origin
    ? widgetSnippet(origin, id, { ...prefs, label, kind: "appointment" })
    : "";
  return (
    <section className="website-embed appointment-widget">
      <p>
        Add a floating booking button. Your website stays as it is; the booking
        page opens only when a customer clicks.
      </p>
      {!enabled && (
        <div className="notice">
          Enable bookings and add an active service to use your widget.
        </div>
      )}
      <div className="widget-controls">
        <label htmlFor="appointment-widget-label">
          Button label
          <input
            id="appointment-widget-label"
            value={prefs.label}
            maxLength={60}
            onChange={(e) => setPrefs({ ...prefs, label: e.target.value })}
          />
        </label>
        <label htmlFor="appointment-widget-position">
          Position
          <select
            id="appointment-widget-position"
            value={prefs.position}
            onChange={(e) =>
              setPrefs({
                ...prefs,
                position: e.target.value as "left" | "right",
              })
            }
          >
            <option value="right">Bottom right</option>
            <option value="left">Bottom left</option>
          </select>
        </label>
        <label
          htmlFor="appointment-widget-colour"
          className="widget-colour-field"
        >
          Button colour
          <span className="widget-colour-value">
            <input
              type="color"
              id="appointment-widget-colour"
              value={prefs.color}
              onChange={(e) => setPrefs({ ...prefs, color: e.target.value })}
            />
            <code>{prefs.color.toUpperCase()}</code>
          </span>
        </label>
      </div>
      <div className="widget-preview-heading">
        <span>Button preview</span>
        <small>Opens appointment booking</small>
      </div>
      <div
        className="widget-launcher-example"
        style={{
          justifyContent: prefs.position === "left" ? "flex-start" : "flex-end",
        }}
      >
        <span
          style={{ background: prefs.color, color: readableText(prefs.color) }}
        >
          <CalendarDays size={18} />
          {label}
        </span>
      </div>
      <label htmlFor="appointment-widget-code">Website widget code</label>
      <textarea
        id="appointment-widget-code"
        aria-label="Appointment widget code"
        rows={5}
        readOnly
        value={code}
        onFocus={(e) => e.target.select()}
      />
      <div className="row">
        <button
          className="btn primary"
          disabled={!enabled || !code}
          onClick={() =>
            void copy(code)
              .then(() => toast.success("Booking widget code copied"))
              .catch(() => toast.error("Select and copy the code above."))
          }
        >
          <Copy size={16} />
          Copy widget code
        </button>
        {enabled && (
          <a
            className="btn"
            href={`/widget-preview.html?booking=${encodeURIComponent(id)}&label=${encodeURIComponent(label)}&position=${prefs.position}&color=${encodeURIComponent(prefs.color)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={16} />
            Test widget
          </a>
        )}
      </div>
      <p className="small">
        Paste the code before your website’s closing &lt;/body&gt; tag. Use the
        code from your deployed HTTPS app on a live website. Booking requests
        use live availability and still need business approval. No WhatsApp step
        is added.
      </p>
    </section>
  );
}
