"use client";
import { useEffect, useRef, useState } from "react";
import { Copy, Eye, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { copy } from "@/lib/client";
import { websiteEmbed } from "@/lib/form-embed";

export default function WebsiteEmbed({
  kind,
  id,
  enabled,
}: {
  kind: "form" | "appointment";
  id: string;
  enabled: boolean;
}) {
  const [origin, setOrigin] = useState("");
  const [height, setHeight] = useState("600");
  const [width, setWidth] = useState(640);
  const [auto, setAuto] = useState(true);
  const [preview, setPreview] = useState(false);
  const [contentHeight, setContentHeight] = useState(320);
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => setOrigin(location.origin), []);
  const number = Number(height),
    valid =
      auto || (Number.isInteger(number) && number >= 500 && number <= 1400);
  const embed =
    origin && valid
      ? websiteEmbed(origin, kind, id, auto ? 600 : number, {
          sizing: auto ? "auto" : "fixed",
          maxWidth: width,
        })
      : null;
  const request = () =>
    frame.current?.contentWindow?.postMessage(
      { type: "formchat:measure", kind, id },
      origin,
    );
  useEffect(() => {
    if (!preview || !auto || !origin) return;
    setContentHeight(320);
    const receive = (e: MessageEvent) => {
      if (
        e.origin !== origin ||
        e.source !== frame.current?.contentWindow ||
        e.data?.kind !== kind ||
        e.data.id !== id
      )
        return;
      if (e.data.type === "formchat:ready") {
        request();
        return;
      }
      if (
        e.data.type === "formchat:resize" &&
        typeof e.data.height === "number" &&
        Number.isFinite(e.data.height) &&
        e.data.height >= 80 &&
        e.data.height <= 20000
      )
        setContentHeight(Math.ceil(e.data.height));
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [preview, auto, origin, kind, id]);
  return (
    <section className="website-embed">
      <p>
        Place your {kind === "form" ? "form" : "booking flow"} inside a section
        or column of your website. It stays within that container and grows only
        as its content needs.
      </p>
      {!enabled && (
        <div className="notice" role="status">
          {kind === "form"
            ? "Publish this form before installing its embed."
            : "Enable bookings and add an active service before installing your booking embed."}
        </div>
      )}
      <div className="embed-layout-controls">
        <label htmlFor={`embed-sizing-${kind}`}>
          Height behaviour
          <select
            id={`embed-sizing-${kind}`}
            value={auto ? "auto" : "fixed"}
            onChange={(e) => setAuto(e.target.value === "auto")}
          >
            <option value="auto">Automatic · fit content</option>
            <option value="fixed">Fixed height · no script</option>
          </select>
        </label>
        <label htmlFor={`embed-width-${kind}`}>
          Maximum width
          <select
            id={`embed-width-${kind}`}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          >
            <option value={480}>Compact · 480 px</option>
            <option value={640}>Standard · 640 px</option>
            <option value={800}>Wide · 800 px</option>
            <option value={0}>Full parent container</option>
          </select>
        </label>
      </div>
      {!auto && (
        <>
          <label htmlFor={`embed-height-${kind}`}>Fixed height (pixels)</label>
          <input
            id={`embed-height-${kind}`}
            type="number"
            min={500}
            max={1400}
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            aria-invalid={!valid}
          />
          <p className="small">
            500–1400 px. Content scrolls inside the frame. Choose automatic
            sizing to avoid empty space.
          </p>
        </>
      )}
      <p className="small">
        {auto
          ? "Recommended: automatically grows and shrinks as customers move through the flow. Install both the iframe and the small resizing script."
          : "Use this fallback if your website builder does not allow scripts."}{" "}
        Width always adapts to smaller screens.
      </p>
      <label htmlFor={`embed-code-${kind}`}>Website embed code</label>
      <textarea
        id={`embed-code-${kind}`}
        aria-label={
          kind === "form" ? "Form embed code" : "Appointment embed code"
        }
        rows={6}
        readOnly
        value={embed?.code || "Enter a height between 500 and 1400 pixels."}
        onFocus={(e) => e.target.select()}
      />
      <div className="row">
        <button
          className="btn primary"
          disabled={!enabled || !embed}
          onClick={() =>
            void copy(embed!.code)
              .then(() => toast.success("Embed code copied"))
              .catch(() =>
                toast.error("Select the code above and copy it manually."),
              )
          }
        >
          <Copy size={16} />
          Copy embed code
        </button>
        <button
          className="btn"
          disabled={!enabled || !embed}
          aria-expanded={preview}
          onClick={() => setPreview(!preview)}
        >
          <Eye size={16} />
          {preview ? "Hide preview" : "Preview embed"}
        </button>
      </div>
      <ol>
        <li>
          Paste the complete code into a custom HTML block inside the section or
          column you want to use.
        </li>
        <li>Publish your website and check it on desktop and mobile.</li>
      </ol>
      <p className="small">
        Your website must allow {auto ? "scripts and frames" : "frames"} from{" "}
        {origin || "your FormChat domain"}. Copy the code from your deployed
        HTTPS app for use on a live website. Existing fixed-height installations
        need the new snippet to resize automatically.
      </p>
      {kind === "appointment" && (
        <p className="small">
          Availability is live. Booking requests must be saved and accepted by
          the business before they are confirmed.
        </p>
      )}
      {preview && enabled && embed && (
        <div className="embed-preview-section">
          <strong>Live website preview</strong>
          <p className="small">
            {kind === "form"
              ? "Submitting creates a real response."
              : "Submitting creates a real booking request."}{" "}
            Stop before submitting to inspect safely.
          </p>
          <a href={embed.src} target="_blank" rel="noopener noreferrer">
            Open in a new tab <ExternalLink size={14} />
          </a>
          <div
            className={`embed-preview-frame ${auto ? "embed-preview-auto" : ""}`}
            style={{
              width: "100%",
              maxWidth: width || "100%",
              margin: "0 auto",
            }}
          >
            <iframe
              ref={frame}
              onLoad={request}
              title={`${embed.title} website preview`}
              src={embed.src}
              style={{
                width: "100%",
                height: auto ? contentHeight : number,
                border: 0,
                display: "block",
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
