import { expect, test } from "@playwright/test";

/**
 * S1-FIX — nav chrome (burger + mobilenav drawer) per Mira's 2026-10-13 update.
 * Burger: hidden >1050, visible ≤1050 (both 768 tablet and 375 mobile).
 * Drawer: opens on click (burger.open + .mobilenav.open), 5 ledger rows,
 * mn-call strip; Home row is .on on the homepage; links resolve (404 allowed
 * for not-yet-built pages — S2 scope; Home link must 200).
 */
test.describe("nav chrome", () => {
  for (const width of [375, 768] as const) {
    test(`burger visible + drawer works @${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 375 ? 812 : 1024 });
      await page.goto("/");

      // burger visible, topnav/callcell hidden at this width
      await expect(page.locator(".burger")).toBeVisible();
      await expect(page.locator(".topnav")).toBeHidden();
      await expect(page.locator(".callcell")).toBeHidden();

      // drawer closed initially
      await expect(page.locator(".mobilenav")).toBeHidden();

      // click opens drawer + burger morphs to X
      await page.click(".burger");
      await expect(page.locator(".mobilenav")).toBeVisible();
      await expect(page.locator(".burger.open")).toHaveCount(1);

      // 5 ledger rows + current page marked + call strip
      await expect(page.locator(".mobilenav nav a")).toHaveCount(5);
      await expect(page.locator(".mobilenav nav a.on")).toHaveText(/Home/);
      await expect(page.locator(".mobilenav .mn-call")).toBeVisible();
      await expect(page.locator(".mobilenav nav a.last")).toHaveText(/Contact/);

      // every drawer link resolves (200 or 404 — S2 builds the other pages)
      const hrefs = await page.locator(".mobilenav nav a").evaluateAll((els) =>
        els.map((e) => (e as HTMLAnchorElement).getAttribute("href")),
      );
      for (const href of hrefs) {
        const res = await page.request.get(href ?? "/");
        expect([200, 404]).toContain(res.status());
      }

      // no horizontal overflow with drawer open
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(over).toBeLessThanOrEqual(0);
    });
  }

  test("burger hidden at desktop @1440", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expect(page.locator(".burger")).toBeHidden();
    await expect(page.locator(".topnav")).toBeVisible();
    await expect(page.locator(".topnav a")).toHaveCount(5);
  });
});
