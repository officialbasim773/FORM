(function () {
  "use strict";
  var script = document.currentScript,
    service;
  try {
    service = new URL(script.src).origin;
    if (!/^https?:\/\//.test(service)) return;
  } catch (_) {
    return;
  }
  var loaders =
    window.__formchatEmbedLoaders ||
    (window.__formchatEmbedLoaders = Object.create(null));
  if (loaders[service]) {
    loaders[service].scan();
    return;
  }
  var frames = [];
  function request(meta) {
    if (meta.frame.contentWindow)
      meta.frame.contentWindow.postMessage(
        { type: "formchat:measure", kind: meta.kind, id: meta.id },
        service,
      );
  }
  function scan() {
    frames = frames.filter(function (m) {
      return m.frame.isConnected;
    });
    document
      .querySelectorAll("iframe[data-formchat-embed]")
      .forEach(function (frame) {
        if (
          frames.some(function (m) {
            return m.frame === frame;
          })
        )
          return;
        var url;
        try {
          url = new URL(frame.getAttribute("src"), location.href);
        } catch (_) {
          return;
        }
        var match = url.pathname.match(/^\/(f|book)\/([\w-]{1,80})$/);
        if (
          url.origin !== service ||
          !match ||
          url.searchParams.get("resize") !== "1"
        )
          return;
        var meta = {
          frame: frame,
          kind: match[1] === "f" ? "form" : "appointment",
          id: match[2],
          height: 0,
        };
        frames.push(meta);
        frame.addEventListener("load", function () {
          request(meta);
        });
        request(meta);
      });
  }
  window.addEventListener("message", function (e) {
    if (e.origin !== service || !e.data || typeof e.data !== "object") return;
    var meta = frames.find(function (m) {
      return (
        m.frame.isConnected &&
        m.frame.contentWindow === e.source &&
        m.kind === e.data.kind &&
        m.id === e.data.id
      );
    });
    if (!meta) return;
    if (e.data.type === "formchat:ready") {
      request(meta);
      return;
    }
    var height = e.data.height;
    if (
      e.data.type !== "formchat:resize" ||
      typeof height !== "number" ||
      !Number.isFinite(height) ||
      height < 80 ||
      height > 20000
    )
      return;
    height = Math.ceil(height);
    if (meta.height === height) return;
    meta.height = height;
    meta.frame.style.setProperty("height", height + "px", "important");
    meta.frame.setAttribute("height", String(height));
  });
  loaders[service] = { scan: scan };
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", scan, { once: true });
  else scan();
  new MutationObserver(scan).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
