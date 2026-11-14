import { test, expect } from "@playwright/test";

/** Portfolio (Nov 14): /projects index → /projects/[slug] case study. */
test.describe("projects portfolio", () => {
  test("index: featured project links to its case study; placeholders don't link", async ({ page }) => {
    await page.goto("/projects");
    const feat = page.locator("main a.feat");
    await expect(feat).toHaveAttribute("href", "/projects/beautify-interior");
    await expect(feat.locator("h2")).toHaveText("Beautify Interior");
    await expect(page.locator("main .card.soon")).toHaveCount(2);
    await expect(page.locator("main .card.soon a")).toHaveCount(0);
    // no horizontal spill at any viewport
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("case study: renders title, live link, gallery; no horizontal spill", async ({ page }) => {
    await page.goto("/projects");
    await page.click("main a.feat");
    await expect(page).toHaveURL(/\/projects\/beautify-interior$/);
    await expect(page.locator("h1")).toHaveText("Beautify Interior");
    await expect(page.locator(".case-title a.action")).toHaveAttribute("href", /beautifyinterior/);
    await expect(page.locator(".case-gallery figure")).toHaveCount(4);
    await expect(page.locator("section.compass")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.click(".case-head .back");
    await expect(page).toHaveURL(/\/projects$/);
  });

  test("unknown slug → 404", async ({ page }) => {
    const res = await page.goto("/projects/does-not-exist");
    expect(res?.status()).toBe(404);
  });
});
