/**
 * Project planner — pure model (server + client).
 * Never one price: every plan is three options (Lean · Recommended · Premium), each "from ₹X", and the
 * recommendation follows the visitor's budget. Every number is editable in Admin → Planner; the defaults
 * below are PLACEHOLDERS until the owner sets real prices.
 */

export type TierId = "lean" | "rec" | "premium";
export const TIERS: { id: TierId; name: string; tag: string }[] = [
  { id: "lean", name: "Lean", tag: "Get started" },
  { id: "rec", name: "Recommended", tag: "Most pick this" },
  { id: "premium", name: "Premium", tag: "Go all in" },
];

export type Feature = { id: string; label: string; hint: string; price: number; weeks: number };
/** A sizing question with one answer (pages, products, users…). The chosen answer's price/weeks apply to all three options. */
export type ScopeOpt = { id: string; label: string; price: number; weeks: number };
export type Scope = { id: string; q: string; opts: ScopeOpt[] };
export type Tier = { price: number; weeks: number; includes: string[] };
export type ProjectType = {
  id: "website" | "store" | "whatsapp" | "instagram" | "custom";
  label: string; blurb: string; monthly?: boolean;
  tiers: Record<TierId, Tier>;
  scope: Scope[];
  features: Feature[];
};
export type Pricing = { types: ProjectType[]; rushPct: number; showPrices: boolean; placeholder: boolean };

const f = (id: string, label: string, hint: string, price: number, weeks = 0): Feature => ({ id, label, hint, price, weeks });
const q = (id: string, question: string, ...opts: [string, string, number, number?][]): Scope => ({ id, q: question, opts: opts.map(([oid, label, price, weeks = 0]) => ({ id: oid, label, price, weeks })) });

export const PRICING_DEFAULTS: Pricing = {
  rushPct: 20,
  showPrices: true,
  placeholder: true,
  types: [
    {
      id: "website", label: "Website", blurb: "A site that brings enquiries",
      tiers: {
        lean: { price: 15000, weeks: 1, includes: ["wa"] },
        rec: { price: 45000, weeks: 3, includes: ["wa", "form", "seo"] },
        premium: { price: 120000, weeks: 6, includes: ["wa", "form", "seo", "anim", "cms", "blog"] },
      },
      scope: [
        q("pages", "How many pages?", ["p1", "1–3 (one-page / landing)", 0], ["p2", "4–8 pages", 12000, 1], ["p3", "9–15 pages", 30000, 2], ["p4", "15+ pages", 60000, 3]),
        q("design", "What kind of design?", ["d1", "Clean, from a proven layout", 0], ["d2", "Custom design for your brand", 15000, 1], ["d3", "Premium custom with illustrations", 40000, 2]),
        q("content", "Who writes the words and photos?", ["c1", "I have them ready", 0], ["c2", "Help me write the words", 8000], ["c3", "Words plus a photo shoot", 25000, 1]),
      ],
      features: [
        f("wa", "WhatsApp button", "Chat with you in one tap", 0), f("form", "Enquiry form", "Leads straight to your inbox", 5000),
        f("booking", "Bookings", "Customers pick a slot", 12000, 1), f("pay", "Online payments", "UPI, cards via Razorpay", 10000, 1),
        f("blog", "Blog", "Post updates and guides", 8000), f("seo", "Google-ready SEO", "Show up in local search", 10000),
        f("lang", "Two languages", "e.g. English + Hindi", 12000, 1), f("anim", "Animations", "Motion that feels premium", 15000, 1),
        f("cms", "Edit it yourself", "Change text and photos anytime", 12000, 1),
        f("gallery", "Gallery / portfolio", "Show your work beautifully", 6000), f("reviewsw", "Testimonials & Google reviews", "Proof right on the page", 5000),
        f("aichat", "AI chat assistant", "Answers visitors 24/7", 20000, 1), f("maps", "Maps & Google Business profile", "Be found nearby", 4000),
        f("news", "Newsletter signup", "Grow your email list", 4000), f("analytics", "Visitor analytics", "See what people do", 4000),
        f("domain", "Domain, hosting & email", "We set it all up", 5000),
      ],
    },
    {
      id: "store", label: "Online store", blurb: "Sell online, take payments",
      tiers: {
        lean: { price: 35000, weeks: 2, includes: ["pay", "wa"] },
        rec: { price: 90000, weeks: 4, includes: ["pay", "wa", "inv", "coupons", "track"] },
        premium: { price: 250000, weeks: 8, includes: ["pay", "wa", "inv", "coupons", "track", "reviews", "anim", "app"] },
      },
      scope: [
        q("products", "How many products?", ["n1", "Up to 50", 0], ["n2", "50–300", 15000], ["n3", "300–1,000", 35000, 1], ["n4", "1,000+", 70000, 2]),
        q("payments", "How will customers pay?", ["y1", "UPI + cards (Razorpay)", 0], ["y2", "Add cash on delivery", 3000], ["y3", "Add international cards & currencies", 15000, 1]),
        q("shipping", "How will you ship?", ["s1", "I'll handle shipping", 0], ["s2", "Connect Shiprocket / Delhivery", 12000, 1], ["s3", "Local delivery slots + courier", 18000, 1]),
        q("upload", "Who adds the products?", ["u1", "I'll add them", 0], ["u2", "You add them for me", 10000], ["u3", "You add them, with product photos", 30000, 1]),
      ],
      features: [
        f("pay", "Payments", "UPI, cards, COD", 0), f("wa", "WhatsApp orders", "Order updates on WhatsApp", 6000),
        f("inv", "Stock tracking", "Never sell what you don't have", 12000, 1), f("coupons", "Coupons", "Discounts and offers", 6000),
        f("track", "Order tracking", "Customers see where it is", 10000, 1), f("reviews", "Reviews", "Ratings on every product", 8000),
        f("anim", "Animations", "A store that feels premium", 15000, 1), f("app", "Owner app view", "Manage orders from your phone", 30000, 2),
        f("variants", "Sizes & colours", "Variants with their own stock", 6000), f("accounts", "Wishlist & accounts", "Customers save and reorder", 8000),
        f("gst", "GST invoices", "Proper bills, automatically", 6000), f("cart", "Abandoned-cart reminders", "WhatsApp/email nudges", 8000),
        f("feed", "Google & Instagram shopping", "Products in their shops", 8000), f("bulk", "Wholesale pricing", "Bulk rates for B2B buyers", 12000, 1),
      ],
    },
    {
      id: "whatsapp", label: "WhatsApp automation", blurb: "Instant replies, broadcasts",
      tiers: {
        lean: { price: 10000, weeks: 1, includes: ["auto"] },
        rec: { price: 30000, weeks: 2, includes: ["auto", "bcast", "catalog"] },
        premium: { price: 75000, weeks: 4, includes: ["auto", "bcast", "catalog", "ai", "crm"] },
      },
      scope: [
        q("volume", "Chats a month?", ["v1", "Up to 1,000", 0], ["v2", "1,000–10,000", 8000], ["v3", "10,000+", 20000, 1]),
        q("team", "Who answers chats?", ["t1", "Just me", 0], ["t2", "2–5 people, shared inbox", 10000], ["t3", "A bigger team with roles", 25000, 1]),
        q("langs", "Reply languages", ["l1", "One language", 0], ["l2", "Two languages", 6000], ["l3", "Three or more", 12000]),
      ],
      features: [
        f("auto", "Auto-replies", "Welcome, away, keyword answers", 0), f("bcast", "Broadcasts", "Offers to opted-in customers", 8000),
        f("catalog", "Product catalogue", "Browse and order in chat", 10000, 1), f("ai", "AI replies", "Answers trained on your business", 20000, 1),
        f("crm", "Lead sheet / CRM", "Every chat logged automatically", 12000, 1), f("ads", "Click-to-WhatsApp ads", "Ads that open a chat", 10000),
        f("bookwa", "Bookings in chat", "Customers pick a slot on WhatsApp", 12000, 1), f("paylink", "Payment links", "Get paid inside the chat", 6000),
        f("status", "Order & delivery updates", "Automatic status messages", 8000), f("menu", "Menu flows", "Tap-through options, no typing", 6000),
      ],
    },
    {
      id: "instagram", label: "Instagram growth", blurb: "Content, reels, DMs", monthly: true,
      tiers: {
        lean: { price: 12000, weeks: 1, includes: ["posts"] },
        rec: { price: 30000, weeks: 1, includes: ["posts", "reels", "dm"] },
        premium: { price: 60000, weeks: 2, includes: ["posts", "reels", "dm", "ads", "shoot"] },
      },
      scope: [
        q("accounts", "How many accounts?", ["a1", "One brand account", 0], ["a2", "Two accounts", 10000], ["a3", "Three or more", 20000]),
        q("platforms", "Where else should posts go?", ["f1", "Instagram only", 0], ["f2", "Add Facebook", 4000], ["f3", "Add Facebook + LinkedIn", 9000]),
        q("cadence", "How often?", ["c1", "12 posts a month", 0], ["c2", "20 posts a month", 8000], ["c3", "30 posts a month", 16000]),
      ],
      features: [
        f("posts", "Posts, designed & captioned", "Designed and captioned", 0), f("reels", "Reels", "4–8 short videos a month", 10000),
        f("dm", "Comment → DM automation", "“Comment PRICE” answers itself", 6000), f("ads", "Ads management", "Budget spent wisely", 10000),
        f("shoot", "Monthly shoot", "Fresh photos and video", 15000),
        f("profile", "Profile & highlights design", "A grid that looks like a brand", 5000), f("report", "Monthly report", "What worked, in plain words", 3000),
        f("collab", "Creator collaborations", "Find and brief local creators", 12000), f("community", "Comment & DM replies", "We answer your audience", 8000),
      ],
    },
    {
      id: "custom", label: "Something custom", blurb: "A tool, portal or app",
      tiers: {
        lean: { price: 50000, weeks: 3, includes: ["login"] },
        rec: { price: 150000, weeks: 6, includes: ["login", "admin", "notify"] },
        premium: { price: 400000, weeks: 10, includes: ["login", "admin", "notify", "pay", "app", "ai"] },
      },
      scope: [
        q("users", "Who uses it?", ["w1", "Just our team", 0], ["w2", "Our customers", 30000, 1], ["w3", "Both", 50000, 2]),
        q("scale", "How many users?", ["x1", "Up to 50", 0], ["x2", "50–1,000", 20000, 1], ["x3", "1,000+", 60000, 2]),
        q("integr", "Connect to other tools?", ["i1", "No", 0], ["i2", "1–2 (Sheets, Tally, a CRM)", 25000, 1], ["i3", "3 or more", 60000, 2]),
      ],
      features: [
        f("login", "Logins", "Accounts for your users", 0), f("admin", "Admin panel", "Run it without us", 25000, 1),
        f("notify", "Email / WhatsApp alerts", "Automatic updates", 12000, 1), f("pay", "Payments", "Subscriptions or one-off", 20000, 1),
        f("app", "Mobile app", "Android + iPhone", 120000, 4), f("ai", "AI features", "Smart search, summaries, chat", 40000, 2),
        f("reports", "Reports & dashboards", "Numbers at a glance", 20000, 1), f("roles", "Roles & permissions", "Who can see and do what", 15000, 1),
        f("files", "Files & documents", "Upload, share, sign off", 15000, 1), f("multi", "Multiple languages", "For every user", 15000, 1),
      ],
    },
  ],
};

export const BUDGETS = [
  { id: "u25", label: "Under ₹25k", max: 25000 },
  { id: "25-75", label: "₹25k – ₹75k", max: 75000 },
  { id: "75-2l", label: "₹75k – ₹2L", max: 200000 },
  { id: "2l+", label: "₹2L+", max: Infinity },
  { id: "unsure", label: "Not sure yet", max: null as number | null },
] as const;
export const SIZES = [{ id: "solo", label: "Just me" }, { id: "small", label: "Small team" }, { id: "growing", label: "Growing company" }] as const;
export const WHEN = [{ id: "relaxed", label: "No rush" }, { id: "normal", label: "In a month or two" }, { id: "asap", label: "ASAP" }] as const;

export type Answers = { type: ProjectType["id"]; industry: string; size: string; features: string[]; when: string; budget: string; scope?: Record<string, string> };

/** The visitor's sizing answers for a type (first answer when unset), and what they add. */
export function scopeOf(type: ProjectType, picked: Record<string, string> = {}) {
  const chosen = type.scope.map((g) => ({ group: g, opt: g.opts.find((o) => o.id === picked[g.id]) ?? g.opts[0] }));
  return { chosen, price: chosen.reduce((s, c) => s + c.opt.price, 0), weeks: chosen.reduce((s, c) => s + c.opt.weeks, 0) };
}
export type Option = { tier: TierId; name: string; tag: string; price: number; weeks: number; features: Feature[]; extras: Feature[]; later: Feature[] };
/** tight: even the smallest version is over the stated budget — `alt` is a cheaper way in that fits. */
export type Plan = { options: Option[]; recommended: TierId; phased: boolean; tight: boolean; alt: { id: ProjectType["id"]; label: string; price: number } | null; core: number; type: ProjectType };

export const roundPrice = (n: number) => (n >= 100000 ? Math.round(n / 5000) * 5000 : Math.round(n / 1000) * 1000);
export const inr = (n: number) => n >= 100000 ? `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L` : `₹${Math.round(n / 1000)}k`;

/** The three options for these answers, and which one to recommend. */
export function buildPlan(p: Pricing, a: Answers): Plan {
  const type = p.types.find((t) => t.id === a.type) ?? p.types[0];
  const rush = a.when === "asap" ? 1 + p.rushPct / 100 : 1;
  const weeksOf = (raw: number) => Math.max(1, Math.round(a.when === "asap" ? raw * 0.75 : raw));
  const sc = scopeOf(type, a.scope);
  const options: Option[] = TIERS.map(({ id, name, tag }) => {
    const t = type.tiers[id];
    const incl = type.features.filter((x) => t.includes.includes(x.id));
    // anything the visitor asked for that this option doesn't include is added on top
    const extras = type.features.filter((x) => a.features.includes(x.id) && !t.includes.includes(x.id));
    return { tier: id, name, tag, price: roundPrice((t.price + sc.price + extras.reduce((s, x) => s + x.price, 0)) * rush),
      weeks: weeksOf(t.weeks + sc.weeks + extras.reduce((s, x) => s + x.weeks, 0)), features: incl, extras, later: [] };
  });
  const core = roundPrice((type.tiers.lean.price + sc.price) * rush);
  const b = BUDGETS.find((x) => x.id === a.budget);
  let recommended: TierId = "rec", phased = false, tight = false;
  let alt: Plan["alt"] = null;
  if (b && b.max !== null) {
    const max = b.max;
    const lean = options[0];
    // over budget with the extras? keep the smallest version to its core and move the extras to phase 2
    if (lean.price > max && lean.extras.length) {
      lean.later = lean.extras; lean.extras = [];
      lean.price = core; lean.weeks = weeksOf(type.tiers.lean.weeks + sc.weeks);
      phased = true;
    }
    const fits = options.filter((o) => o.price <= max);
    recommended = fits.length ? fits[fits.length - 1].tier : "lean";
    if (lean.price > max) {
      // even the core is over budget: say so, and point to the cheapest thing that fits
      tight = true;
      const c = p.types.filter((t) => t.id !== type.id).map((t) => ({ id: t.id, label: t.label, price: roundPrice(t.tiers.lean.price * rush) }))
        .filter((t) => t.price <= max).sort((x, y) => x.price - y.price)[0];
      alt = c ?? null;
    }
  } else if (a.size === "solo") recommended = "lean";
  else if (a.size === "growing") recommended = "premium";
  return { options, recommended, phased, tight, alt, core, type };
}

/** A plain-text summary (WhatsApp message, the lead's message in admin). */
export function planText(p: Plan, a: Answers, showPrices: boolean) {
  const rec = p.options.find((o) => o.tier === p.recommended)!;
  const lines = [
    `Project plan — ${p.type.label}${a.industry ? ` for ${a.industry}` : ""}`,
    `Size: ${SIZES.find((s) => s.id === a.size)?.label ?? "—"} · Timing: ${WHEN.find((w) => w.id === a.when)?.label ?? "—"} · Budget: ${BUDGETS.find((x) => x.id === a.budget)?.label ?? "—"}`,
    ...(p.type.scope.length ? [`Scope: ${scopeOf(p.type, a.scope).chosen.map((c) => `${c.group.q.replace(/\?$/, "")}: ${c.opt.label}`).join(" · ")}`] : []),
    `Must-haves: ${p.type.features.filter((x) => a.features.includes(x.id)).map((x) => x.label).join(", ") || "none picked"}`,
    `Recommended: ${rec.name} — ${rec.weeks} week${rec.weeks > 1 ? "s" : ""}${showPrices ? `, from ${inr(rec.price)}${p.type.monthly ? "/month" : ""}` : ""}`,
    ...(p.phased ? [`Phase 2 (later): ${p.options[0].later.map((x) => x.label).join(", ")}`] : []),
    ...(p.tight ? [`Budget is tight for this — smallest version starts from ${inr(p.core)}${p.alt ? `; suggested way in: ${p.alt.label} from ${inr(p.alt.price)}` : ""}.`] : []),
  ];
  return lines.join("\n");
}

/** Validate stored/posted pricing; anything odd falls back to the defaults. */
export function normalizePricing(raw: unknown): Pricing {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Pricing>;
  const num = (v: unknown, d: number, max = 5_000_000) => (typeof v === "number" && isFinite(v) && v >= 0 && v <= max ? Math.round(v) : d);
  return {
    rushPct: num(r.rushPct, PRICING_DEFAULTS.rushPct, 200),
    showPrices: typeof r.showPrices === "boolean" ? r.showPrices : PRICING_DEFAULTS.showPrices,
    placeholder: typeof r.placeholder === "boolean" ? r.placeholder : PRICING_DEFAULTS.placeholder,
    types: PRICING_DEFAULTS.types.map((def) => {
      const s = Array.isArray(r.types) ? r.types.find((t) => t?.id === def.id) : undefined;
      return {
        ...def,
        tiers: Object.fromEntries(TIERS.map(({ id }) => [id, { ...def.tiers[id], price: num(s?.tiers?.[id]?.price, def.tiers[id].price), weeks: num(s?.tiers?.[id]?.weeks, def.tiers[id].weeks, 104) || 1 }])) as Record<TierId, Tier>,
        features: def.features.map((ft) => { const sf = s?.features?.find((x) => x?.id === ft.id); return { ...ft, price: num(sf?.price, ft.price), weeks: num(sf?.weeks, ft.weeks, 52) }; }),
        scope: def.scope.map((g) => { const sg = s?.scope?.find((x) => x?.id === g.id); return { ...g, opts: g.opts.map((o) => { const so = sg?.opts?.find((x) => x?.id === o.id); return { ...o, price: num(so?.price, o.price), weeks: num(so?.weeks, o.weeks, 52) }; }) }; }),
      };
    }),
  };
}
