import { expect, test } from "@playwright/test";

/**
 * Oct 20 design-fix bundle (r-nbs-design-fix-oct20 + r-nbs-head-favicon-link):
 * 1. --soft token = warm sand #F2EEE4 on every soft band surface
 * 2. response-ledger rows keep 18px side padding when stacked @375
 * 3. v5 two-section contact opener: form promoted into Section A;
 *    channels + photo live in Section B below the divider
 * 4. favicon links declared in <head>
 */

test("fix 1: --soft renders warm sand (#F2EEE4) on soft bands", async ({ page }) => {
  await page.goto("/contact");
  await expect(page.locator(".response").first()).toBeVisible();
  const bg = await page.locator(".response").evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe("rgb(242, 238, 228)");
});

test("fix 2: stacked rrow keeps 18px side padding at 375", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/contact");
  const row = page.locator(".rrow").first();
  await expect(row).toBeVisible();
  const pad = await row.evaluate((el) => getComputedStyle(el).paddingLeft);
  expect(pad).toBe("18px");
});

test.describe("fix 3: v5 two-section opener structure", () => {
  test("form sits inside Section A (desk-top), right of the intro", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/contact");
    const form = page.locator(".desk-top .form-sheet");
    await expect(form).toBeVisible();
    const intro = page.locator(".desk-top .desk-intro");
    await expect(intro).toBeVisible();
    // form right of intro at desktop
    const [ix, fx] = await Promise.all([
      intro.boundingBox().then((b) => b!.x),
      form.boundingBox().then((b) => b!.x),
    ]);
    expect(fx).toBeGreaterThan(ix);
  });

  test("channels ledger lives in Section B (desk-lower), below the form", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/contact");
    const channels = page.locator(".desk-lower .channels");
    await expect(channels).toBeVisible();
    const form = page.locator(".desk-top .form-sheet");
    const [fy, cy] = await Promise.all([
      form.boundingBox().then((b) => b!.y),
      channels.boundingBox().then((b) => b!.y),
    ]);
    expect(cy).toBeGreaterThan(fy);
    // photo (reassurance) is in Section B left, side-ask in Section B right
    await expect(page.locator(".desk-lower .form-photo")).toBeVisible();
    await expect(page.locator(".desk-lower .side-ask")).toBeVisible();
  });

  test("stacked order at 375: intro → form → photo → channels", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/contact");
    const y = async (sel: string) =>
      page.locator(sel).first().boundingBox().then((b) => b!.y);
    const intro = await y(".desk-intro");
    const form = await y(".form-sheet");
    const photo = await y(".desk-lower .form-photo");
    const channels = await y(".desk-lower .channels");
    expect(intro).toBeLessThan(form);
    expect(form).toBeLessThan(photo);
    expect(photo).toBeLessThan(channels);
  });

  test("old separate desk-form section is gone", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("section.desk-form")).toHaveCount(0);
  });

  for (const w of [375, 768, 1440]) {
    test(`v5 opener keeps 6 f-rows + no overflow @${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: w === 375 ? 812 : 900 });
      await page.goto("/contact");
      await expect(page.locator(".form-sheet .f-row")).toHaveCount(6);
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(over).toBeLessThanOrEqual(0);
    });
  }
});

test("fix 4: favicon links declared in head", async ({ page }) => {
  await page.goto("/contact");
  const links = await page.$$eval('link[rel="icon"], link[rel="apple-touch-icon"]', (ls) =>
    ls.map((l) => ({ rel: l.getAttribute("rel"), href: l.getAttribute("href") })),
  );
  expect(links).toContainEqual({ rel: "icon", href: "/favicon.ico" });
  expect(links.some((l) => l.rel === "apple-touch-icon" && l.href === "/favicons/apple-touch-icon.png")).toBe(true);
});
