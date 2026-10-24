(function () {
  "use strict";
  var script = document.currentScript;
  if (!script) return;
  var booking = script.getAttribute("data-booking");
  var kind = booking ? "appointment" : "form";
  var slug = booking || script.getAttribute("data-form") || "";
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(slug)) return;
  var service;
  try {
    service = new URL(script.src).origin;
    if (!/^https?:\/\//.test(service)) return;
  } catch {
    return;
  }
  var label = (
    script.getAttribute("data-label") ||
    (booking ? "Book an appointment" : "Contact us")
  ).slice(0, 60);
  var identity = kind + ":" + slug;
  var path = (booking ? "/book/" : "/f/") + encodeURIComponent(slug);
  var side = script.getAttribute("data-position") === "left" ? "left" : "right";
  var color = script.getAttribute("data-color") || "#176650";
  if (!/^#[\da-fA-F]{6}$/.test(color)) color = "#176650";
  var rgb = [1, 3, 5].map(function (i) {
    var v = parseInt(color.slice(i, i + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  var ink =
    0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] > 0.179
      ? "#111111"
      : "#ffffff";
  function boot() {
    if (document.querySelector('[data-formchat-widget="' + identity + '"]'))
      return;
    var host = document.createElement("div");
    host.setAttribute("data-formchat-widget", identity);
    host.style.cssText = "all:initial;position:relative;z-index:2147483000";
    var root = host.attachShadow({ mode: "open" });
    var style = document.createElement("style");
    style.textContent =
      ":host{all:initial;font-family:system-ui,sans-serif}*{box-sizing:border-box}.launcher{position:fixed;bottom:20px;" +
      side +
      ":20px;display:flex;align-items:center;gap:9px;padding:14px 18px;max-width:calc(100vw - 40px);border:0;border-radius:30px;background:" +
      color +
      ";color:" +
      ink +
      ";font:600 14px system-ui,sans-serif;box-shadow:0 6px 22px #0003;cursor:pointer;z-index:2147483000}.launcher svg{flex-shrink:0}.launcher span{overflow-wrap:anywhere}.launcher:focus-visible,.close:focus-visible{outline:3px solid #94b5ff;outline-offset:4px}dialog{position:fixed;inset:auto;bottom:86px;" +
      side +
      ":20px;margin:0;padding:0;width:min(420px,calc(100vw - 32px));height:min(680px,calc(100dvh - 112px));max-width:none;max-height:none;border:1px solid #ddd;border-radius:16px;background:#fff;box-shadow:0 16px 60px #0003;overflow:hidden}dialog::backdrop{background:#0003}.bar{height:49px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 14px;border-bottom:1px solid #eee;color:#27303f;font:600 13px system-ui,sans-serif}.bar a{color:#5c6470;font-weight:400;font-size:11px}.close{border:0;background:#f1f3f5;color:#333;border-radius:50%;width:30px;height:30px;cursor:pointer;font-size:20px;line-height:1}iframe{width:100%;height:calc(100% - 49px);border:0;display:block;background:#fff}@media(max-width:480px){dialog{bottom:12px;left:12px;right:12px;width:calc(100vw - 24px);height:calc(100dvh - 24px)}.launcher{bottom:16px;max-width:calc(100vw - 32px)}}@media print{.launcher,dialog{display:none!important}}";
    style.textContent +=
      "dialog{width:min(440px,calc(100vw - 32px))}.bar{height:56px;display:grid;grid-template-columns:minmax(0,1fr) auto 36px;gap:12px;line-height:1.4}.bar>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bar a{white-space:nowrap;padding:8px 0;font-size:12px}.bar a:focus-visible{outline:2px solid #176650;outline-offset:3px}.close{width:36px;height:36px;display:grid;place-items:center;font-size:22px}iframe{height:calc(100% - 56px)}.launcher{min-height:48px;line-height:1.5}.launcher span{min-width:0;word-break:break-word}@media(max-width:480px){dialog{width:calc(100vw - 24px)}}";
    root.appendChild(style);
    var launcher = document.createElement("button");
    launcher.type = "button";
    launcher.className = "launcher";
    launcher.setAttribute("aria-haspopup", "dialog");
    launcher.setAttribute("aria-expanded", "false");
    launcher.innerHTML =
      '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/></svg>';
    var caption = document.createElement("span");
    if (booking)
      launcher.innerHTML =
        '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>';
    caption.textContent = label;
    launcher.appendChild(caption);
    var dialog = document.createElement("dialog");
    dialog.setAttribute("aria-label", label);
    dialog.setAttribute("aria-modal", "true");
    var bar = document.createElement("div");
    bar.className = "bar";
    var title = document.createElement("span");
    title.textContent = label;
    title.title = label;
    bar.appendChild(title);
    var fallback = document.createElement("a");
    fallback.href = service + path;
    fallback.target = "_blank";
    fallback.rel = "noopener noreferrer";
    fallback.textContent = booking ? "Open booking ↗" : "Open form ↗";
    fallback.setAttribute(
      "aria-label",
      booking ? "Open booking page in a new tab" : "Open form in a new tab",
    );
    bar.appendChild(fallback);
    var close = document.createElement("button");
    close.type = "button";
    close.className = "close";
    close.setAttribute(
      "aria-label",
      booking ? "Close booking widget" : "Close form",
    );
    close.textContent = "×";
    bar.appendChild(close);
    dialog.appendChild(bar);
    root.appendChild(launcher);
    root.appendChild(dialog);
    document.body.appendChild(host);
    var iframe;
    var previousOverflow;
    function shut() {
      dialog.close();
      if (previousOverflow) {
        if (previousOverflow.value)
          document.documentElement.style.setProperty(
            "overflow",
            previousOverflow.value,
            previousOverflow.priority,
          );
        else document.documentElement.style.removeProperty("overflow");
        previousOverflow = undefined;
      }
      launcher.setAttribute("aria-expanded", "false");
      launcher.focus();
    }
    launcher.addEventListener("click", function () {
      if (dialog.open) {
        shut();
        return;
      }
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.title =
          label + (booking ? " — appointment booking" : " — customer form");
        iframe.referrerPolicy = "no-referrer";
        iframe.src = service + path + "?embed=1";
        iframe.setAttribute(
          "sandbox",
          "allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox",
        );
        dialog.appendChild(iframe);
      }
      if (typeof dialog.showModal !== "function") {
        window.open(fallback.href, "_blank", "noopener,noreferrer");
        return;
      }
      dialog.showModal();
      previousOverflow = {
        value: document.documentElement.style.getPropertyValue("overflow"),
        priority:
          document.documentElement.style.getPropertyPriority("overflow"),
      };
      document.documentElement.style.setProperty(
        "overflow",
        "hidden",
        "important",
      );
      launcher.setAttribute("aria-expanded", "true");
      close.focus();
    });
    close.addEventListener("click", shut);
    window.addEventListener("message", function (event) {
      if (
        iframe &&
        dialog.open &&
        event.origin === service &&
        event.source === iframe.contentWindow &&
        event.data &&
        event.data.type === "formchat:close" &&
        event.data.slug === slug
      )
        shut();
    });
    dialog.addEventListener("cancel", function (e) {
      e.preventDefault();
      shut();
    });
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) {
        var r = dialog.getBoundingClientRect();
        if (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        )
          shut();
      }
    });
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
