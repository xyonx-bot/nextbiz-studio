import { expect, test } from "@playwright/test";

/**
 * S2 — all 9 pages: render + no-overflow + no broken images at 3 widths,
 * every nav/footer link resolves (no 404, no "#"), chrome identical,
 * current-page .on states correct per page.
 */
const PAGES = [
  { route: "/", current: "Home", h1: /Your Digital Team/ },
  { route: "/about", current: "About Us", h1: /A studio built/ },
  { route: "/services", current: "Services", h1: /Three ways in/ },
  { route: "/projects", current: "Projects", h1: /Work in/ },
  { route: "/contact", current: "Contact", h1: /Tell us what/ },
  { route: "/legal/privacy", current: null, h1: /Privacy/ },
  { route: "/legal/terms", current: null, h1: /Terms &/ },
  { route: "/legal/refund", current: null, h1: /Refund &/ },
  { route: "/legal/cookie", current: null, h1: /Cookie/ },
] as const;

const WIDTHS = [375, 768, 1440] as const;

for (const p of PAGES) {
  test.describe(`page ${p.route}`, () => {
    for (const w of WIDTHS) {
      test(`renders + no overflow + no broken imgs @${w}`, async ({ page }) => {
        await page.setViewportSize({ width: w, height: w === 375 ? 812 : 900 });
        const res = await page.goto(p.route);
        expect(res?.status()).toBe(200);
        await expect(page.locator("h1").first()).toContainText(p.h1);
        await page.waitForLoadState("networkidle");

        // no horizontal overflow (Mira's rule)
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(over).toBeLessThanOrEqual(0);

        // no element spills past the viewport (scrollWidth can be masked by
        // .shell overflow:hidden — vision QC caught 232px spill @375 contact).
        // .scribble* excluded: rotated handwritten annotations intentionally
        // peek past the canvas — .shell overflow:hidden clips them BY DESIGN
        // (design sheet §3 "scribbles float over corners").
        const spill = await page.evaluate(() => {
          const vw = window.innerWidth;
          const bad: string[] = [];
          for (const el of document.querySelectorAll<HTMLElement>("main *, main")) {
            if (el.closest(".scribble") || el.classList.contains("scribble")) continue;
            // scrollable carousels (wireframe design: .proj-grid overflow-x:auto
            // with fixed 260px cards, .team-photo 700px strip) may legally extend
            // past the viewport — their content is scrolled, not clipped
            if (el.closest(".proj-grid, .team-photo")) continue;
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.right > vw + 1) {
              bad.push(`${el.tagName}.${(el.className || "").toString().slice(0, 30)}@${Math.round(r.right)}`);
              if (bad.length >= 5) break;
            }
          }
          return bad;
        });
        expect(spill, JSON.stringify(spill)).toEqual([]);

        // no broken images
        const broken = await page.$$eval("img", (imgs) =>
          imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src),
        );
        expect(broken).toEqual([]);
      });
    }

    test("every nav + footer link resolves (no 404, no #)", async ({ request, page }) => {
      await page.goto(p.route);
      const links = await page.$$eval("a", (as) =>
        as.map((a) => a.getAttribute("href")).filter((h): h is string => !!h),
      );
      const internal = [...new Set(links.filter((h) => h.startsWith("/")))];
      expect(internal.length).toBeGreaterThan(0);
      for (const href of internal) {
        const res = await request.get(href);
        expect.soft(res.status(), `link ${href}`).toBe(200);
      }
      // no raw # placeholders left in chrome
      const hashes = links.filter((h) => h === "#");
      expect(hashes).toEqual([]);
    });

    test("nav count + footer legal identical across pages", async ({ page }) => {
      await page.goto(p.route);
      await expect(page.locator(".topnav a")).toHaveCount(5);
      // footer legal column: all 4 present
      for (const label of ["Privacy Policy", "Terms & Conditions", "Refund & Cancellation", "Cookie Policy"]) {
        await expect(page.locator("footer").getByText(label).first()).toBeVisible();
      }
    });

    test("current-page .on state", async ({ page }) => {
      test.skip(p.current === null, "legal pages: no topnav .on (by design)");
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(p.route);
      await expect(page.locator(".topnav a.on")).toHaveText(new RegExp(`^${p.current}$`));
    });
  });
}

test("chrome identical across all 9 pages", async ({ page }) => {
  const sigs: string[] = [];
  for (const p of PAGES) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(p.route);
    const sig = await page.evaluate(() => {
      const nav = [...document.querySelectorAll(".topnav a")].map((a) => a.textContent?.trim()).join("|");
      const foot = [...document.querySelectorAll("footer a")].map((a) => (a.textContent ?? "").trim()).join("|");
      return `${nav}##${foot}`;
    });
    sigs.push(sig);
  }
  // nav identical everywhere
  const navs = sigs.map((s) => s.split("##")[0]);
  expect(new Set(navs).size).toBe(1);
  // footer: single rich variant on all 9 pages now (Joydip's call, Mira re-synced wireframes)
  const foots = sigs.map((s) => s.split("##")[1]);
  expect(new Set(foots).size).toBe(1);
});
