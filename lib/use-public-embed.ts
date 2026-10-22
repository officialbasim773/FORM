"use client";
import { useEffect, useState } from "react";

export function usePublicEmbed(kind: "form" | "appointment", id: string) {
  const [mode, setMode] = useState({ embedded: false, inline: false });
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setMode({
      embedded: q.get("embed") === "1",
      inline: q.get("embed") === "1" && q.get("resize") === "1",
    });
  }, []);
  useEffect(() => {
    if (!mode.embedded || window.parent === window) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented && !mode.inline)
        window.parent.postMessage(
          { type: "formchat:close", slug: id, kind },
          "*",
        );
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [mode.embedded, mode.inline, kind, id]);
  useEffect(() => {
    if (!mode.inline || window.parent === window) return;
    const root = document.querySelector("main");
    if (!root) return;
    let target = "",
      frame = 0,
      last = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const height = Math.min(
          20000,
          Math.max(80, Math.ceil(root.getBoundingClientRect().height) + 4),
        );
        if (target && height !== last) {
          last = height;
          window.parent.postMessage(
            { type: "formchat:resize", kind, id, height },
            target,
          );
        }
      });
    };
    const receive = (e: MessageEvent) => {
      if (
        e.source !== window.parent ||
        !/^https?:\/\//.test(e.origin) ||
        e.data?.type !== "formchat:measure" ||
        e.data.kind !== kind ||
        e.data.id !== id
      )
        return;
      target = e.origin;
      last = 0;
      measure();
    };
    window.addEventListener("message", receive);
    window.addEventListener("resize", measure);
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    window.parent.postMessage({ type: "formchat:ready", kind, id }, "*");
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("message", receive);
      window.removeEventListener("resize", measure);
    };
  }, [mode.inline, kind, id]);
  return mode;
}
