"use client";
import NextImage from "next/image";
import { useEffect, useState } from "react";
import {
  Copy,
  Download,
  ExternalLink,
  Link2,
  QrCode,
  MessageCircle,
  CheckCircle2,
  ArrowRight,
  Code2,
} from "lucide-react";
import { widgetSnippet } from "@/lib/form-embed";
import WebsiteEmbed from "./website-embed";
import QRCode from "qrcode";
import { toast } from "sonner";
import { readableText } from "@/lib/model";
import type { FormRecord } from "@/lib/model";
import { copy } from "@/lib/client";
export default function FormSharing({
  form,
  onBuild,
}: {
  form: FormRecord;
  onBuild: () => void;
}) {
  const [channel, setChannel] = useState("link"),
    [url, setUrl] = useState(""),
    [qr, setQr] = useState("");
  useEffect(() => {
    let live = true;
    const value = location.origin + "/f/" + form.slug;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize browser/API lifecycle state and clear stale data before loading the new resource.
    setUrl(value);
    QRCode.toDataURL(value, {
      width: 640,
      margin: 3,
      color: { dark: "#176650", light: "#ffffff" },
    })
      .then((v) => {
        if (live) setQr(v);
      })
      .catch(() => toast.error("Could not generate the QR code."));
    return () => {
      live = false;
    };
  }, [form.slug]);
  const [widgetLabel, setWidgetLabel] = useState("Contact us");
  const [widgetSide, setWidgetSide] = useState<"left" | "right">("right");
  const [widgetColour, setWidgetColour] = useState(
    form.published?.button || form.draft.button,
  );
  const [widgetReady, setWidgetReady] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(`formchat:widget:${form.id}`) || "null",
      );
      if (saved) {
        if (typeof saved.label === "string")
          // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize browser/API lifecycle state and clear stale data before loading the new resource.
          setWidgetLabel(saved.label.slice(0, 60));
        if (saved.position === "left" || saved.position === "right")
          setWidgetSide(saved.position);
        if (/^#[a-fA-F0-9]{6}$/.test(saved.color)) setWidgetColour(saved.color);
      }
    } catch {}
    setWidgetReady(true);
  }, [form.id]);
  useEffect(() => {
    if (!widgetReady) return;
    try {
      localStorage.setItem(
        `formchat:widget:${form.id}`,
        JSON.stringify({
          label: widgetLabel,
          position: widgetSide,
          color: widgetColour,
        }),
      );
    } catch {}
  }, [widgetReady, widgetLabel, widgetSide, widgetColour, form.id]);
  const launcherLabel = widgetLabel.trim() || "Contact us";
  const available = form.status === "published";
  const widgetCode = url
    ? widgetSnippet(new URL(url).origin, form.slug, {
        label: launcherLabel,
        position: widgetSide,
        color: widgetColour,
      })
    : "";
  async function copyText(value: string) {
    try {
      await copy(value);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  }
  const messages = [
    {
      name: "Greeting message",
      body: `Thanks for getting in touch! Please fill in this short form so we can help: ${url}`,
    },
    {
      name: "While you’re waiting",
      body: `We’re helping another customer right now. Share a few details here and we’ll get back to you: ${url}`,
    },
    {
      name: "Away message",
      body: `Thanks for your message. We’re currently away. Please leave your request here and we’ll reply when we’re back: ${url}`,
    },
  ];
  return (
    <section className="form-sharing">
      <header>
        <span className="section-kicker">SHARE YOUR FORM</span>
        <h2>One link. Wherever your customers are.</h2>
        <p>
          Publish your form, then share it in messages, your website or at your
          counter.
        </p>
      </header>
      {!available && (
        <div className="notice share-publish-notice">
          <strong>
            {form.status === "paused"
              ? "This form is paused."
              : "This form is not published."}
          </strong>
          <p>
            Its public link cannot accept responses. Preview your draft and
            publish it from Build first.
          </p>
          <button className="btn" onClick={onBuild}>
            Go to Build
            <ArrowRight size={15} />
          </button>
        </div>
      )}
      <div className="sharing-layout">
        <nav aria-label="Sharing channels">
          {[
            { id: "link", label: "Share link", Icon: Link2 },
            {
              id: "whatsapp",
              label: "WhatsApp templates",
              Icon: MessageCircle,
            },
            { id: "qr", label: "QR code", Icon: QrCode },
            { id: "website", label: "Website widget", Icon: Code2 },
            { id: "embed", label: "Website embed", Icon: Code2 },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              aria-current={channel === id ? "page" : undefined}
              onClick={() => setChannel(id)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sharing-channel">
          {channel === "link" ? (
            <>
              <span className="sharing-icon">
                <Link2 />
              </span>
              <h3>Share a simple link</h3>
              <p>
                Add it to your website, Instagram bio, email or customer
                messages.
              </p>
              <label>
                Public form link
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <div className="row">
                <button
                  className="btn primary"
                  disabled={!available || !url}
                  onClick={() => copyText(url)}
                >
                  <Copy size={16} />
                  Copy link
                </button>
                {available && (
                  <a
                    className="btn"
                    target="_blank"
                    rel="noreferrer"
                    href={url}
                  >
                    <ExternalLink size={16} />
                    Open published form
                  </a>
                )}
              </div>
              <p className="sharing-reassurance">
                <CheckCircle2 size={15} />
                Customers don’t need an account.
              </p>
            </>
          ) : channel === "embed" ? (
            <>
              <span className="sharing-icon">
                <Code2 />
              </span>
              <h3>Embed your form in a page</h3>
              <WebsiteEmbed kind="form" id={form.slug} enabled={available} />
            </>
          ) : channel === "website" ? (
            <>
              <span className="sharing-icon">
                <Code2 />
              </span>
              <h3>Add your form to your website</h3>
              <p>
                Let customers open your form without leaving your website. Match
                the button to your brand, then copy the code below.
              </p>
              <fieldset className="widget-configuration">
                <legend>1. Customise your button</legend>
                <div className="widget-controls">
                  <label htmlFor="widget-button-label">
                    <span>Button label</span>
                    <input
                      id="widget-button-label"
                      maxLength={60}
                      value={widgetLabel}
                      onChange={(e) => setWidgetLabel(e.target.value)}
                    />
                  </label>
                  <label htmlFor="widget-button-position">
                    <span>Position</span>
                    <select
                      id="widget-button-position"
                      value={widgetSide}
                      onChange={(e) =>
                        setWidgetSide(e.target.value as "left" | "right")
                      }
                    >
                      <option value="right">Bottom right</option>
                      <option value="left">Bottom left</option>
                    </select>
                  </label>
                  <label className="widget-colour-field">
                    <span>Button colour</span>
                    <span className="widget-colour-value">
                      <input
                        type="color"
                        aria-label="Button colour"
                        value={widgetColour}
                        onChange={(e) => setWidgetColour(e.target.value)}
                      />
                      <code>{widgetColour.toUpperCase()}</code>
                    </span>
                  </label>
                </div>
                <div className="widget-preview-heading">
                  <span>Button preview</span>
                  <small>Opens your published form</small>
                </div>
                <div
                  className="widget-launcher-example"
                  style={{
                    justifyContent:
                      widgetSide === "left" ? "flex-start" : "flex-end",
                  }}
                >
                  <span
                    style={{
                      background: widgetColour,
                      color: readableText(widgetColour),
                    }}
                  >
                    <MessageCircle size={18} />
                    {launcherLabel}
                  </span>
                </div>
              </fieldset>
              <h4>2. Add it to your website</h4>
              <p className="small">
                Paste this snippet before your website’s closing &lt;/body&gt;
                tag, then publish your website. Add it once per page.
              </p>
              <textarea
                className="embed-code"
                readOnly
                aria-label="Website widget code"
                rows={5}
                value={widgetCode}
                onFocus={(e) => e.target.select()}
              />
              <div className="row">
                <button
                  className="btn primary"
                  disabled={!available || !widgetCode}
                  onClick={() => copyText(widgetCode)}
                >
                  <Copy size={15} />
                  Copy widget code
                </button>
                {available && (
                  <a
                    className="btn"
                    href={`/widget-preview.html?form=${encodeURIComponent(form.slug)}&label=${encodeURIComponent(launcherLabel)}&position=${widgetSide}&color=${encodeURIComponent(widgetColour)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={15} />
                    Test widget
                  </a>
                )}
              </div>
              <div className="inline-embed">
                <button
                  className="text-btn"
                  onClick={() => setChannel("embed")}
                >
                  Embed the form directly in a page <ArrowRight size={15} />
                </button>
              </div>
              <p className="small">
                The widget uses your published form design. Draft edits appear
                only after you publish. Responses are saved before the customer
                chooses to open WhatsApp. Your website’s security policy must
                allow scripts and frames from{" "}
                {url ? new URL(url).origin : "your FormChat domain"}.
              </p>
            </>
          ) : channel === "qr" ? (
            <>
              <span className="sharing-icon">
                <QrCode />
              </span>
              <h3>Take your form offline</h3>
              <p>
                Place a QR code on your counter, packaging, menu or event
                materials.
              </p>
              {qr && (
                <NextImage
                  unoptimized
                  width={240}
                  height={240}
                  className="sharing-qr"
                  src={qr}
                  alt="QR code for this form"
                />
              )}
              {available && qr && (
                <a
                  className="btn primary"
                  download={`${form.slug}-qr.png`}
                  href={qr}
                >
                  <Download size={16} />
                  Download QR code
                </a>
              )}
              <p className="small">
                Test the code on your phone after publishing. Pausing the form
                stops new submissions.
              </p>
            </>
          ) : (
            <>
              <span className="sharing-icon">
                <MessageCircle />
              </span>
              <h3>Make your next reply easier</h3>
              <p>
                Copy a template into your own WhatsApp greeting, away message or
                reply. Edit it to match your business.
              </p>
              {messages.map((m) => (
                <article className="sharing-message" key={m.name}>
                  <h4>{m.name}</h4>
                  <textarea
                    readOnly
                    aria-label={m.name}
                    value={m.body}
                    rows={3}
                  />
                  <button
                    className="btn"
                    disabled={!available || !url}
                    onClick={() => copyText(m.body)}
                  >
                    <Copy size={14} />
                    Copy message
                  </button>
                </article>
              ))}
              <p className="small">
                These templates aren’t installed or sent automatically.
                Customers submit the form first and choose whether to send its
                prepared WhatsApp summary.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
