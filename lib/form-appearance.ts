import { readableText } from "./model";
import type { Draft } from "./model";
export const appearanceDefaults = {
  background: "#ffffff",
  surface: "#ffffff",
  text: "#1f2937",
  muted: "#667085",
  border: "#d0d5dd",
  font: "poppins" as const,
  radius: 10,
  fontSize: 16,
  align: "left" as const,
  buttonText: "",
  logo: "",
  hideBranding: false,
  accentLine: false,
};
export function formAppearance(draft: Draft) {
  const appearance = { ...appearanceDefaults, ...draft.appearance };
  // Older neutral forms used the browser system font. Adopt the new default.
  if (appearance.font === "system") appearance.font = "poppins";
  return appearance;
}
export function appearanceVariables(draft: Draft) {
  const a = formAppearance(draft);
  const fonts = {
    poppins: '"Poppins", system-ui, sans-serif',
    montserrat: '"Montserrat", system-ui, sans-serif',
    system:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    outfit: '"Outfit", system-ui, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  };
  return {
    "--form-bg": a.background,
    "--form-surface": a.surface,
    "--form-text": a.text,
    "--form-muted": a.muted,
    "--form-border": a.border,
    "--form-font": fonts[a.font],
    "--form-radius": `${a.radius}px`,
    "--form-size": `${a.fontSize}px`,
    "--form-align": a.align,
    "--form-accent": draft.accent,
    "--form-button-text": readableText(draft.button),
    "--form-button": draft.button,
  };
}
