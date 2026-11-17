"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useDesign } from "./Design";

/**
 * Light motion layer (Admin → Design → Animation). One IntersectionObserver marks sections as they come
 * into view (`.is-in`); styles/motion.css does the rest with transform/opacity only — no scroll listeners,
 * no layout work, nothing runs once a section has appeared. Off for "Animation: Off" and for anyone whose
 * device asks for reduced motion. Content is only ever hidden after this script has run (`html.mo-ready`).
 */
const TARGETS = "main.shell > section:not(.hero), main.shell > footer";

function countUp(el: HTMLElement) {
  const raw = el.textContent ?? "";
  const m = raw.match(/^(\D*)(\d[\d,]*)(.*)$/);
  if (!m || el.dataset.counted) return;
  el.dataset.counted = "1";
  const end = Number(m[2].replace(/,/g, "")); if (!end || end > 100000) return;
  const t0 = performance.now(), dur = 900;
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    el.textContent = `${m[1]}${Math.round(end * e).toLocaleString("en-IN")}${m[3]}`;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function Motion() {
  const d = useDesign();
  const path = usePathname();
  useEffect(() => {
    const html = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (d.motion === "off" || reduced || path.startsWith("/admin") || !("IntersectionObserver" in window)) { html.classList.remove("mo-ready"); return; }
    const els = [...document.querySelectorAll<HTMLElement>(TARGETS)];
    // anything already on screen shows at once — the first frame is never empty
    const vh = window.innerHeight;
    els.forEach((el) => { if (el.getBoundingClientRect().top < vh * 0.92) el.classList.add("is-in"); });
    html.classList.add("mo-ready");
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        el.classList.add("is-in");
        if (d.motion === "full") el.querySelectorAll<HTMLElement>(".stat strong").forEach(countUp);
        io.unobserve(el);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach((el) => { if (!el.classList.contains("is-in")) io.observe(el); });
    return () => io.disconnect();
  }, [d.motion, path]);
  return null;
}
