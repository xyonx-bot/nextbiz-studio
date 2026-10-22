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

test("v5.1 input affordance: boxed controls, ghost placeholders, red error boxes", async ({ page }) => {
  await page.goto("/contact");

  const cs = await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('.f-row input[name="name"]');
    const select = document.querySelector<HTMLSelectElement>('.f-row select[name="service"]');
    const textarea = document.querySelector<HTMLTextAreaElement>('.f-row textarea[name="brief"]');
    if (!input || !select || !textarea) return null;
    const i = getComputedStyle(input);
    return {
      inputBorder: `${i.borderTopWidth} ${i.borderTopStyle}`,
      inputBg: i.backgroundColor,
      inputRadius: i.borderRadius,
      inputPad: i.padding,
      placeholder: getComputedStyle(input, "::placeholder").color,
      selectBgImage: getComputedStyle(select).backgroundImage.includes("svg") || getComputedStyle(select).backgroundImage.includes("data:"),
      selectGhost: getComputedStyle(select).color,
      textareaMinH: getComputedStyle(textarea).minHeight,
      selectPadRight: getComputedStyle(select).paddingRight,
      fieldMinH: getComputedStyle(input.closest(".field")!).minHeight,
    };
  });
  expect(cs).not.toBeNull();
  // boxed control: card bg + visible 1px border + 3px radius, cell min-height 48
  expect(cs!.inputBorder).toBe("1px solid");
  expect(cs!.inputBg).toBe("rgb(253, 252, 249)");
  expect(cs!.inputRadius).toBe("3px");
  // the 48px field-cell height is desktop geometry — the ≤1050 block
  // collapses the cell; the box itself stays identical
  if ((page.viewportSize()?.width ?? 1440) >= 1050) {
    expect(cs!.fieldMinH).toBe("48px");
  }
  expect(cs!.inputPad).toBe("9px 10px");
  // placeholders read as ghost example text — never as entered values
  expect(cs!.placeholder).toBe("rgb(168, 163, 154)");
  // selects: boxed too, with the ink chevron + prompt in ghost color
  expect(cs!.selectBgImage).toBe(true);
  expect(cs!.selectGhost).toBe("rgb(168, 163, 154)");
  expect(cs!.selectPadRight).toBe("30px");
  expect(cs!.textareaMinH).toBe("72px");

  // empty submit → red label + red box border + inline message
  await page.click(".f-submit");
  await expect(page.locator(".f-error").first()).toBeVisible();
  const errBox = await page.evaluate(() => {
    const row = document.querySelector(".f-row.err");
    const input = row?.querySelector("input");
    const lab = row?.querySelector(".lab");
    if (!row || !input || !lab) return null;
    return {
      inputBorder: getComputedStyle(input).borderTopColor,
      labColor: getComputedStyle(lab).color,
    };
  });
  expect(errBox).not.toBeNull();
  expect(errBox!.inputBorder).toBe("rgb(179, 38, 30)");
  expect(errBox!.labColor).toBe("rgb(179, 38, 30)");

  // focus is unmistakable: ink border + inset underline
  // (on a NON-errored field — error boxes keep their red border by design)
  const focusStyle = await page.evaluate(() => {
    // phone+email both carry the 'one way to reach you' error on empty
    // submit, so prove focus on a clean control: the service select
    const sel = document.querySelector<HTMLSelectElement>('.f-row:not(.err) select')!;
    sel.focus();
    const i = getComputedStyle(sel);
    return { border: i.borderTopColor, shadow: i.boxShadow };
  });
  expect(focusStyle.border).toBe("rgb(9, 11, 15)");
  expect(focusStyle.shadow).toContain("inset");
});
