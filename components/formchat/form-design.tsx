"use client";
import { Draft } from "@/lib/model";
import { formAppearance } from "@/lib/form-appearance";
import { ImagePicker } from "./ui";
export default function FormDesign({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const a = formAppearance(draft);
  const appearance = (patch: Partial<NonNullable<Draft["appearance"]>>) =>
    onChange({ appearance: { ...draft.appearance, ...patch } });
  return (
    <section className="form-design">
      <header>
        <span className="section-kicker">YOUR FORM, YOUR BRAND</span>
        <h3>Make it yours</h3>
        <p>
          Customise your customer form independently of the workspace. Preview
          your changes, then publish when you’re ready.
        </p>
      </header>
      <div className="design-presets">
        <strong>Start with a style</strong>
        <div>
          {[
            {
              name: "Minimal",
              accent: "#1f2937",
              bg: "#ffffff",
              surface: "#ffffff",
              font: "poppins",
            },
            {
              name: "Botanical",
              accent: "#176650",
              bg: "#f4f7ef",
              surface: "#ffffff",
              font: "poppins",
            },
            {
              name: "Studio",
              accent: "#4338ca",
              bg: "#f5f4ff",
              surface: "#ffffff",
              font: "montserrat",
            },
            {
              name: "Editorial",
              accent: "#754b33",
              bg: "#fbf7f2",
              surface: "#ffffff",
              font: "montserrat",
            },
          ].map((p) => (
            <button
              className="design-preset"
              key={p.name}
              onClick={() =>
                onChange({
                  accent: p.accent,
                  button: p.accent,
                  appearance: {
                    ...draft.appearance,
                    background: p.bg,
                    surface: p.surface,
                    font: p.font as typeof a.font,
                    text: "#1f2937",
                    muted: "#667085",
                    border: "#d0d5dd",
                  },
                })
              }
            >
              <span style={{ background: p.bg, borderColor: p.accent }}>
                <i style={{ background: p.accent }} />
              </span>
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <fieldset>
        <legend>Colours</legend>
        <div className="design-colours">
          {[
            { key: "accent", label: "Accent", value: draft.accent },
            { key: "button", label: "Button", value: draft.button },
            {
              key: "background",
              label: "Page background",
              value: a.background,
            },
            { key: "surface", label: "Form background", value: a.surface },
            { key: "text", label: "Text", value: a.text },
            { key: "muted", label: "Supporting text", value: a.muted },
            { key: "border", label: "Input borders", value: a.border },
          ].map((c) => (
            <label key={c.key}>
              <input
                type="color"
                aria-label={c.label + " colour"}
                value={c.value}
                onChange={(e) => {
                  if (c.key === "accent" || c.key === "button")
                    onChange({ [c.key]: e.target.value });
                  else appearance({ [c.key]: e.target.value });
                }}
              />
              <span>
                {c.label}
                <small>{c.value.toUpperCase()}</small>
              </span>
            </label>
          ))}
        </div>
        <p className="small">
          Choose text and background colours with enough contrast for
          comfortable reading. Button text adjusts for readability.
        </p>
      </fieldset>
      <fieldset>
        <legend>Typography & shape</legend>
        <div className="design-field-grid">
          <label htmlFor="form-design-font">
            Font
            <select
              id="form-design-font"
              value={a.font}
              onChange={(e) =>
                appearance({ font: e.target.value as typeof a.font })
              }
            >
              <option value="poppins">Poppins</option>
              <option value="montserrat">Montserrat</option>
              <option value="outfit">Rounded · Outfit</option>
              <option value="serif">Editorial · Serif</option>
              <option value="mono">Technical · Mono</option>
            </select>
          </label>
          <label htmlFor="form-design-size">
            Text size
            <select
              id="form-design-size"
              value={a.fontSize}
              onChange={(e) => appearance({ fontSize: Number(e.target.value) })}
            >
              {[14, 15, 16, 17, 18, 19, 20].map((n) => (
                <option value={n} key={n}>
                  {n} px
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="form-design-radius">
            Corner style
            <select
              id="form-design-radius"
              value={a.radius}
              onChange={(e) => appearance({ radius: Number(e.target.value) })}
            >
              {[0, 4, 8, 10, 12, 16, 20, 24].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "Square" : n + " px"}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="form-design-alignment">
            Heading alignment
            <select
              id="form-design-alignment"
              value={a.align}
              onChange={(e) =>
                appearance({ align: e.target.value as typeof a.align })
              }
            >
              <option value="left">Left</option>
              <option value="center">Centre</option>
            </select>
          </label>
        </div>
        <label>
          Submit button text
          <input
            maxLength={60}
            placeholder="Use the default label"
            value={a.buttonText}
            onChange={(e) => appearance({ buttonText: e.target.value })}
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={a.accentLine}
            onChange={(e) => appearance({ accentLine: e.target.checked })}
          />
          Show an accent line above the form
        </label>
      </fieldset>
      <fieldset>
        <legend>Logo & branding</legend>
        <ImagePicker
          label="Form logo"
          value={a.logo}
          onChange={(logo) => appearance({ logo })}
        />
        <p className="small">
          Use a separate logo here, or leave it empty to use your business logo.
        </p>
        <label className="check-label">
          <input
            type="checkbox"
            checked={!draft.hideLogo}
            onChange={(e) => onChange({ hideLogo: !e.target.checked })}
          />
          Show logo or business initials
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={a.hideBranding}
            onChange={(e) => appearance({ hideBranding: e.target.checked })}
          />
          Hide the “Made with FormChat” footer
        </label>
      </fieldset>
    </section>
  );
}
