function escapeAttribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
export function widgetSnippet(
  origin: string,
  slug: string,
  options: {
    label: string;
    position: "left" | "right";
    color: string;
    kind?: "form" | "appointment";
  },
) {
  const url = new URL(origin);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw Error("Use an HTTP or HTTPS website URL.");
  if (!/^[\w-]{1,80}$/.test(slug)) throw Error("Invalid form link.");
  const color = /^#[a-fA-F0-9]{6}$/.test(options.color)
    ? options.color
    : "#176650";
  if (options.kind && !["form", "appointment"].includes(options.kind))
    throw Error("Invalid widget type.");
  return `<script defer src="${url.origin}/widget.js" ${options.kind === "appointment" ? "data-booking" : "data-form"}="${slug}" data-label="${escapeAttribute(options.label.slice(0, 60))}" data-position="${options.position === "left" ? "left" : "right"}" data-color="${color}"></script>`;
}
export function iframeSnippet(origin: string, slug: string) {
  return websiteEmbed(origin, "form", slug, 700).code;
}
export function websiteEmbed(
  origin: string,
  kind: "form" | "appointment",
  id: string,
  height = 900,
  options?: { sizing: "auto" | "fixed"; maxWidth: number },
) {
  const url = new URL(origin);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    !["form", "appointment"].includes(kind) ||
    !/^[\w-]{1,80}$/.test(id) ||
    !Number.isInteger(height) ||
    height < 500 ||
    height > 1400 ||
    (options &&
      (!["auto", "fixed"].includes(options.sizing) ||
        ![0, 480, 640, 800].includes(options.maxWidth)))
  )
    throw Error("Invalid website embed settings.");
  const auto = options?.sizing === "auto";
  const src = `${url.origin}/${kind === "form" ? "f" : "book"}/${id}?embed=1${auto ? "&resize=1" : ""}`;
  const title = kind === "form" ? "Customer form" : "Appointment booking";
  return {
    src,
    title,
    code: `${options ? `<div style="width:100%;max-width:${options.maxWidth ? options.maxWidth + "px" : "100%"};margin:0 auto">` : ""}<iframe ${auto ? `data-formchat-embed="${kind}:${id}" ` : ""}src="${src.replaceAll("&", "&amp;")}" title="${title}" width="100%" height="${auto ? 320 : height}" style="display:block;width:100%;border:0;border-radius:12px;max-width:100%" loading="lazy"></iframe>${options ? "</div>" : ""}${auto ? `\n<script defer src="${url.origin}/embed.js"></script>` : ""}`,
  };
}
