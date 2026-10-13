import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 375, height: 812 } });
await p.goto("http://localhost:3000", { waitUntil: "networkidle" });
const bad = await p.evaluate(() => {
  const out = [];
  const vw = window.innerWidth;
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      out.push({ cls: el.className?.toString?.().slice(0,60), tag: el.tagName, right: Math.round(r.right), left: Math.round(r.left), w: Math.round(r.width) });
    }
  }
  return { vw, docScrollW: document.documentElement.scrollWidth, flagged: out.slice(0,15) };
});
console.log(JSON.stringify(bad, null, 1));
await b.close();
