# NextBizStudio — Architecture

**Status:** approved (technical discussion gate PASSED in-session with Joydip, Oct 13 2026)
**Derived from:** `technical-plan.md` (living copy) + Mira's package `~/prototypes/nextbizstudio/`
**Design source of truth is FROZEN:** `design-sheet.html` (tokens) + `<page>/wireframe.html` (layout) + `HANDOFF.md` (contracts). **Zero code/assets imported from `nextbiz-studio-clone`.**

## Stack (locked by approved plan)

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript + React 19 |
| Styling | Tailwind CSS 4 + `styles/tokens.css` CSS vars (design-sheet tokens = law, no inline hex) |
| DB | Postgres 16 (Docker) — leads, notes, page_sections. Added in S3/S4; S1 runs DB-free |
| Auth (S4) | Env credentials + HMAC-signed httpOnly cookie + middleware gate on `/admin/*` |
| Validation (S3) | zod at API boundary |
| Tests | Vitest (unit) + Playwright (e2e / fidelity screenshots at 375/768/1440) |
| Images | `next/image` + sharp; source photos per Mira's placeholder notes (NOT from clone repo) |
| Deploy | Docker compose on the shared VM behind `joyverse_nginx` (`conf.d/nextbiz.conf`), certbot SSL |

## One app, two surfaces

```
nextbizstudio.com ──nginx :443──► nextbiz-app:3000 (Docker, no host port)
  /            public 9 pages  — ISR; revalidatePath on admin save (S5)
  /admin/*     login-gated     — force-dynamic (S4+)
  /api/leads   POST → DB → Slack webhook fire-and-forget (S3)
  /api/auth/*  login/logout (S4)
  /api/config  page-config CRUD (S5)
        └─► Postgres (named volume)      [from S3]
```

## Page model (configurator-ready from day one)

Each public page = ordered list of **sections** resolved from a registry:

- `components/sections/<page>/<Section>.tsx` — 1:1 with wireframe `data-wf` blocks. Port, don't reinterpret.
- `components/sections/registry.ts` — `section_key → { component, contentSchema }`.
- `lib/seed/pages.json` — per-page default section list + default content (derived from wireframe copy). Render = seed ⊕ DB rows (deep-merge); empty/missing DB rows fall back to seed → page never breaks (checklist P1.8).
- S1: renders straight from seed (no DB yet). S5: admin edits write rows, `revalidatePath` refreshes.

## Token contract (from design-sheet.html · v1)

Canvas: `paper #F9F6F2` full-bleed (body IS paper; `desk #EAE7E4` retired behind shell — sheet §4), `max-width 1440px` centered. Ink `#090B0F`, primary `#07090C`, primary-fg `#FBFAF7`, soft `#EFEFF5`, muted `#656970`, line `#DDDAD5`, card `#FDFCF9`, slab `#1B1D21`. **Closed accents:** note-blue `#ABE4FF` (sticky note only, 1/page), star-gold `#F5A400` (stars only), live-green `#77D199` (Meta Proxy status only).

Type: Manrope 400–800 only (+ "Nothing You Could Do" for scribbles; Georgia once in partner marquee). Display: weight 400, clamp sizes, negative tracking (H1 −3px, H2 −2px). Padding `clamp(32px,6vw,100px)`. Breakpoints: ≤760 mobile / 761–1050 tablet / >1050 desktop. Buttons radius 3, min-height 48, 1px ink border, 12px/700 label. Images: asymmetric radius system (one big corner 60–96px), warm-grade, `saturate(.7–.85)` on grids.

Motion (ambient only): data-reveal translateY(24px)→0 .7s cubic-bezier(.22,.8,.32,1), stagger 70ms; wipe-fill buttons .35s; honors `prefers-reduced-motion`.

## Data model (final shape; DB lands in S3/S4)

```sql
leads(id uuid pk, name text, phone text, email text,
      service text, budget text, message text,
      status text default 'new',       -- new→replied→quoted→won|lost
      ip_hash text, created_at timestamptz default now());
lead_notes(id uuid pk, lead_id uuid→leads, body text, created_at timestamptz);
pages_config(page_key pk, title text, nav_order int);
page_sections(id uuid pk, page_key→pages_config, section_key text,
              sort_order float, enabled bool default true,
              content jsonb, updated_at timestamptz);
```

## Topbar/Footer chrome contract (HANDOFF §0 — Joydip's direction)

- Topbar 3 zones split by hairlines 82px: brand (logo `https://cdn.joyverse.fun/nextbiz-studio-dark.png`) / nav **Home · About Us · Services · Projects · Contact** / call block. Mobile ≤760: menu button.
- Footer two link columns: **Explore** (same 5) + **Legal** (Privacy Policy / Terms & Conditions / Refund & Cancellation / Cookie Policy). Identical on all 9 pages.
- Guarded rules from Mira's QC: reading grids pin `grid-column:2`; EVERY `<a>` gets `color:inherit; text-decoration:none` unless a real link style; selects open on neutral prompts.

## Known deviations / decisions taken

1. **Icons:** design sheet says "Lucide icons only"; HANDOFF maps icons to Phosphor CDN names. Resolution: follow the HANDOFF mapping where one exists (it is the newer, QA'd contract); where unmapped new icons are needed, use Lucide per the sheet and log for Mira review.
2. Nav "Contact" on homepage — approved by Joydip (the one frozen-homepage change, HANDOFF §known-items).
3. S1 renders Home only; other 8 nav links 404 until S2 — explicitly allowed in sprint-plan scope note.
4. Mira's wireframe images are gray placeholders with subject notes → S1 uses optimized neutral placeholders at correct aspect/radius; real photos land in S2/S6 (approval-gated).

## Repo layout

See `docs/technical-plan.md` §6 (identical). `.kira/` = execution scratch (tasks/backlog/log), removed at sprint end.
