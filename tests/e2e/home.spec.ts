import { expect, test } from "@playwright/test";

/**
 * S1-8 — Home fidelity checks at the three acceptance widths (Mira's rule:
 * scrollWidth ≤ innerWidth → nothing overflows) + no broken images.
 */
for (const route of ["/"]) {
  test.describe(`home ${route}`, () => {
    test("renders h1 + topbar + footer", async ({ page }) => {
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toContainText("Your Digital Team");
      await expect(page.locator(".topbar")).toBeVisible();
      await expect(page.locator(".footer")).toBeVisible();
      // nav: 5 links per HANDOFF
      await expect(page.locator(".topnav a")).toHaveCount(5);
      // footer legal column: all 4 legal links present
      for (const label of ["Privacy Policy", "Terms & Conditions", "Refund & Cancellation", "Cookie Policy"]) {
        await expect(page.locator(".footer").getByText(label, { exact: false }).first()).toBeVisible();
      }
    });

    test("no horizontal overflow (scrollWidth ≤ innerWidth)", async ({ page }) => {
      await page.goto(route);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(over).toBeLessThanOrEqual(0);
    });

    test("no broken images", async ({ page }) => {
      const res = await page.goto(route);
      expect(res?.status()).toBe(200);
      await page.waitForLoadState("networkidle");
      const broken = await page.$$eval("img", (imgs) =>
        imgs.filter((i) => i.complete && i.naturalWidth === 0 && !i.src.endsWith(".svg")).map((i) => i.src),
      );
      expect(broken).toEqual([]);
    });

    test("screenshot", async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const w = page.viewportSize()?.width ?? 0;
      await page.screenshot({ path: `test-results/home-${w}.png`, fullPage: true });
    });
  });
}
