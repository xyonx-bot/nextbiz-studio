import { expect, test } from "@playwright/test";

/**
 * r-nbs-contact-v5-geofix — mira live re-verify Oct 24 gaps, fixed to
 * wireframe v5 spec (~/workspaces/mira/prototypes/nextbizstudio/contact/wireframe.html):
 * 1. .response band padding 88/92 desktop+tablet (72/72 ≤760); head margin-bottom 48 (28 ≤760)
 * 2. .response-lede present: 13px muted, margin-top 18px, max-width 46ch
 * 3. .rrow desktop padding 20px 26px (16px 18px stacked)
 * 4. .pad at ≤760 computes 22px per side (specificity fix — base .pad{var(--pad-x)}
 *    in globals.css must not win the cascade over the chrome.css override)
 * 5. Section B photo: real still-life renders (1408×912, crop cover, height 220px,
 *    radius 14/14/14/60, saturate .85)
 */

test.describe("geofix 1: response band spacing per wireframe v5", () => {
  test("@1440 band 88/92 + head 48 + rrow 20/26", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/contact");
    const cs = await page.locator(".response").first().evaluate((el) => {
      const s = getComputedStyle(el);
      const head = getComputedStyle(el.querySelector(".response-head")!);
      const row = getComputedStyle(el.querySelector(".rrow")!);
      return { pt: s.paddingTop, pb: s.paddingBottom, headMb: head.marginBottom, rpt: row.paddingTop, rpl: row.paddingLeft };
    });
    expect(cs.pt).toBe("88px");
    expect(cs.pb).toBe("92px");
    expect(cs.headMb).toBe("48px");
    expect(cs.rpt).toBe("20px");
    expect(cs.rpl).toBe("26px");
  });

  test("@768 band 88/92 + head 48 + rrow 16/18 (wireframe ≤1050 stacked rows)", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto("/contact");
    const cs = await page.locator(".response").first().evaluate((el) => {
      const s = getComputedStyle(el);
      const head = getComputedStyle(el.querySelector(".response-head")!);
      const row = getComputedStyle(el.querySelector(".rrow")!);
      return { pt: s.paddingTop, pb: s.paddingBottom, headMb: head.marginBottom, rpt: row.paddingTop, rpl: row.paddingLeft };
    });
    expect(cs.pt).toBe("88px");
    expect(cs.pb).toBe("92px");
    expect(cs.headMb).toBe("48px");
    expect(cs.rpt).toBe("16px");
    expect(cs.rpl).toBe("18px");
  });

  test("@375 band 72/72 + head 28 + rrow 16/18 (mobile spec unchanged)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/contact");
    const cs = await page.locator(".response").first().evaluate((el) => {
      const s = getComputedStyle(el);
      const head = getComputedStyle(el.querySelector(".response-head")!);
      const row = getComputedStyle(el.querySelector(".rrow")!);
      return { pt: s.paddingTop, pb: s.paddingBottom, headMb: head.marginBottom, rpt: row.paddingTop, rpl: row.paddingLeft };
    });
    expect(cs.pt).toBe("72px");
    expect(cs.pb).toBe("72px");
    expect(cs.headMb).toBe("28px");
    expect(cs.rpt).toBe("16px");
    expect(cs.rpl).toBe("18px");
  });
});

test("geofix 2: response-lede renders with wireframe copy + metrics", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/contact");
  const lede = page.locator(".response-head .response-lede");
  await expect(lede).toBeVisible();
  await expect(lede).toHaveText("You'll always know who's handling your enquiry — and what happens next.");
  const cs = await lede.evaluate((el) => {
    const s = getComputedStyle(el);
    return { fs: s.fontSize, mt: s.marginTop, color: s.color, mw: s.maxWidth };
  });
  expect(cs.fs).toBe("13px");
  expect(cs.mt).toBe("18px");
  // muted token --muted #656970
  expect(cs.color).toBe("rgb(101, 105, 112)");
});

test("geofix 3+4: .pad computes 22px per side at 375 on every padded section", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/contact");
  const pads = await page.$$eval(".pad", (els) =>
    els.map((el) => {
      const s = getComputedStyle(el);
      return `${s.paddingLeft}/${s.paddingRight}`;
    }),
  );
  expect(pads.length).toBeGreaterThanOrEqual(3); // desk + response + faq + qclose
  for (const p of pads) expect(p).toBe("22px/22px");
  // desktop pad still uses the clamp token: clamp(32px, 6vw, 100px) at 1440 → 86.4px
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/contact");
  const deskPad = await page.locator(".desk.pad").first().evaluate((el) => getComputedStyle(el).paddingLeft);
  expect(deskPad).toBe("86.4px");
});

test("geofix 5: Section B real still-life photo (1408×912, 220px box, radius, saturate .85)", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/contact");
  const box = page.locator(".desk-lower .form-photo .imgph").first();
  const img = box.locator("img");
  await expect(img).toBeVisible();
  await expect(img).toHaveAttribute("src", "/img/nextbiz-studio-stilllife.jpg");
  // image actually loads (not a broken icon)
  const meta = await img.evaluate((el) => {
    const e = el as HTMLImageElement;
    return {
      nw: e.naturalWidth,
      nh: e.naturalHeight,
      complete: e.complete,
      boxH: getComputedStyle(e.parentElement!).height,
      radius: getComputedStyle(e.parentElement!.parentElement!).borderRadius,
      filter: getComputedStyle(e).filter,
      fit: getComputedStyle(e).objectFit,
    };
  });
  expect(meta.complete).toBe(true);
  expect(meta.nw).toBe(1408);
  expect(meta.nh).toBe(912);
  expect(meta.boxH).toBe("220px");
  expect(meta.radius).toBe("14px 14px 14px 60px");
  expect(meta.filter).toBe("saturate(0.85)");
  expect(meta.fit).toBe("cover");
  // placeholder spec text must be gone
  await expect(box).not.toContainText("STUDIO STILL-LIFE");
});

for (const w of [375, 768, 1440]) {
  test(`no horizontal overflow @${w} after pad fix`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: w === 375 ? 812 : 900 });
    await page.goto("/contact");
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(over).toBeLessThanOrEqual(0);
  });
}
