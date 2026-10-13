import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

/** S2 evidence: all 9 pages × 3 widths → docs/screenshots/s2/ */
const PAGES = [
  { route: "/", name: "home" },
  { route: "/about", name: "about" },
  { route: "/services", name: "services" },
  { route: "/projects", name: "projects" },
  { route: "/contact", name: "contact" },
  { route: "/legal/privacy", name: "legal-privacy" },
  { route: "/legal/terms", name: "legal-terms" },
  { route: "/legal/refund", name: "legal-refund" },
  { route: "/legal/cookie", name: "legal-cookie" },
];

const WIDTHS = [
  { w: 375, h: 812 },
  { w: 768, h: 1024 },
  { w: 1440, h: 900 },
];

const b = await chromium.launch();
for (const p of PAGES) {
  for (const { w, h } of WIDTHS) {
    const page = await b.newPage({ viewport: { width: w, height: h } });
    await page.goto(`http://localhost:3000${p.route}`, { waitUntil: "networkidle" });
    await page.screenshot({
      path: `docs/screenshots/s2/${p.name}-${w}.png`,
      fullPage: true,
    });
    await page.close();
  }
  console.log(`${p.name} ✓`);
}
await b.close();
console.log("all s2 screenshots done");
