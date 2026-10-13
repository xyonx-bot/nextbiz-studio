# NextBizStudio — Technical Plan (Kira)

**Owner:** Kira (build) · Joydip (approvals) · Mira (design source of truth) · Nina (coordination) · Tony (post-launch)
**Status:** PROPOSED — awaiting go-ahead to scaffold
**Source docs:** `../brief.md`, `../backlog.md`, `../checklist.md` and Mira's package `~/prototypes/nextbizstudio/`

---

## 1. Design-source-of-truth contract (IMPORTANT — no clone repo)

- **Zero code/assets are imported from `nextbiz-studio-clone`** (Joydip, Oct 13). It was a Lovable UI reference only.
- Build authority = Mira's package:
  - `design-sheet.html` → tokens (colors/type/spacing/radius) become `styles/tokens.css` + Tailwind theme. The sheet's hex values are law; code never hardcodes colors inline.
  - `<page>/wireframe.html` (incl. `legal/{privacy,terms,refund,cookie}`) → section tree (`data-wf` sections) maps 1:1 to React components. Port, don't reinterpret.
  - `HANDOFF.md` → contracts: Phosphor icon names (`cdn.joyverse.fun/mira-assets/phosphor/…`), full nav list, full footer (Explore + Legal ×4), legal cross-links, reading-grid pin rule (`grid-column:2`), ink-link rule (`color:inherit; text-decoration:none` on every `<a>`), neutral-select rule, accent-photo rule, honest-voice rule.
  - Gray-box placeholders: per Mira's subject/crop/radius notes. Real photos sourced at build per those notes (NOT from the clone repo).
  - Logo: `https://cdn.joyverse.fun/nextbiz-studio-dark.png` (CDN, per Nina).
- Uncovered states (loading/empty/error) built from tokens and logged for Mira review — design problems go BACK to Mira, never silently fixed in code.

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 15, App Router, TypeScript** | Single app serving public + admin + leads API; ISR for public, dynamic for admin. Nina's suggested shape; fits perfectly. |
| Styling | **Tailwind + CSS vars** | Design-sheet tokens → `tokens.css` vars + tailwind theme mapping; no hardcoded hex in components. |
| DB | **Postgres 16** (Docker) | Leads, notes, page-section config. Relations suit the pipeline; volume-per-project per infra conventions. |
| Auth | **Env credentials + signed httpOnly session cookie + middleware** | Single admin; no auth lib needed. Constant-time compare, HMAC-signed cookie, `Secure; HttpOnly; SameSite=Strict`. |
| Validation | **zod** at API boundary | Contact form fields match Mira's wireframe spec. |
| Slack | Incoming-waterfall webhook → `#agent-org` (fire-and-forget, lead never lost if Slack fails) | `SLACK_WEBHOOK_URL` env. |
| Images | Source photos → `sharp` optimize (webp, ≤1600w, q82, responsive srcset) into `public/assets` | R2 CDN optional later (P2.7). |
| Deploy | **Docker compose on the VM, behind `joyverse_nginx`** (conf.d/nextbiz.conf, existing pattern) | No host port bindings; certbot SSL. |

Explicitly OUT (per brief): blog/CMS posts, multi-user admin, client portal, in-admin analytics, email marketing, Instagram automation. P2 list in backlog remains deferred.

## 3. Architecture

```
nextbizstudio.com (nginx :443, SSL) ──proxy──► nextbiz-app:3000
  /              public 9 pages (ISR; revalidate on admin save)
  /admin/**      login-gated dashboard (force-dynamic)
  /api/auth/**   login/logout
  /api/leads     POST create lead → DB → Slack notify
  /api/config/** admin page-config CRUD
                    │
                    ▼
              Postgres (nextbiz volume)
```

Public render: for each page, `SELECT page_sections WHERE enabled ORDER BY sort_order` → resolve component from `components/sections` registry → content = seed-default ⊕ row.content (deep merge). DB empty/missing rows → seed fallback → page always renders (checklist P1.8: invalid/empty config must not break the page).

Admin saves → `revalidatePath('/<page>')` → public reflects without redeploy (P1.9).

## 4. Data model

```sql
leads(
  id uuid pk, name text, phone text, email text,
  service text,            -- Mira's enum: new-website / marketing-social / whatsapp-meta / meta-proxy / not-sure
  budget  text,            -- under-25k / 25k-75k / 75k-2l / not-sure
  message text,            -- required (honest-voice rule)
  status text default 'new',   -- new → replied → quoted → won | lost
  created_at timestamptz default now(),
  ip_hash text             -- rate-limit evidence, not for display
);
lead_notes(id uuid pk, lead_id uuid→leads, body text, created_at timestamptz);

pages_config(page_key pk, title text, nav_order int);
page_sections(
  id uuid pk, page_key references pages_config,
  section_key text,        -- registry key e.g. 'about.masthead'
  sort_order float,        -- cheap reorder
  enabled bool default true,
  content jsonb,           -- typed per section_key; seed-default merged at render
  updated_at timestamptz
);
```

Config tables seed from `lib/seed/pages.json` at first migrate — the seed IS Mira's section inventory derived from wireframes' `data-wf` blocks.

## 5. Contact form ↔ DB mapping (from Mira's wireframe)

| Wireframe field | DB | Validation |
|---|---|---|
| Full name | `name` | required |
| Phone placeholder `+91 …` | `phone` | E.164-ish; phone OR email required |
| Email | `email` | valid email if present |
| Select "Choose the closest…" (5 opts) | `service` | enum; neutral prompt, no prefill |
| Select "Choose a range…" (4 opts) | `budget` | enum; neutral prompt (ranges draft pending Joydip — config array, easy swap) |
| Textarea honest-lines | `message` | required, min length |
| Hidden terms checkbox | — | not per wireframe; skipped |

Success panel + friendly error per spec; failure never leaks raw error page.

## 6. Folder structure

```
~/nextbiz-studio/                     ← repo (proposed location)
├── app/
│   ├── layout.tsx, globals.css, tokens via styles/tokens.css
│   ├── (public)/
│   │   ├── page.tsx                  ← Home (frozen design, rebuilt from home/wireframe.html)
│   │   ├── about/page.tsx · services/page.tsx · projects/page.tsx · contact/page.tsx
│   │   └── legal/{privacy,terms,refund,cookie}/page.tsx
│   ├── admin/
│   │   ├── layout.tsx (auth shell) · login/page.tsx
│   │   ├── leads/page.tsx · leads/[id]/page.tsx
│   │   └── pages/page.tsx · pages/[key]/page.tsx   ← configurator
│   └── api/
│       ├── auth/{login,logout}/route.ts
│       ├── leads/route.ts
│       └── config/pages/[key]/route.ts
├── components/
│   ├── chrome/{Topbar,Footer}.tsx    ← exact HANDOFF spec, shared by all 9 pages
│   ├── sections/<page>/<Section>.tsx ← 1:1 with wireframe data-wf sections
│   └── sections/registry.ts          ← section_key → component + content schema
├── lib/{db,auth,slack,seed,content}.ts
├── styles/tokens.css                 ← design-sheet tokens (single source)
├── docs/                             ← brief.md, backlog.md, checklist.md, architecture.md, technical-plan.md
├── .kira/   (scratch: tasks.md, backlog.md, log.md — removed at sprint end)
├── scripts/ (migrate, seed, optimize-images)
├── tests/
├── docker-compose.yml · Dockerfile · .env.example · middleware.ts
└── next.config.ts, tailwind.config.ts, drizzle.config.ts
```

## 7. Security & ops

- Credentials/env only: `ADMIN_USER`, `ADMIN_PASS`, `SLACK_WEBHOOK_URL`, `DATABASE_URL`, `SESSION_SECRET`. Never committed.
- Spam guard: honeypot field + per-IP rate limit on `/api/leads`.
- Sessions: 7-day signed cookie, logout clears.
- Docker: compose with `nextbiz-app` + `nextbiz-db`, named volume, `joyverse_main_network`, no host port for the app (nginx proxy only). After recreate → nginx reload (known VM pitfall).

## 8. Deploy proposal (P1.10)

1. Joydip points `nextbizstudio.com` (and `www`) DNS A-record → VM public IP. **Currently no DNS exists — blocker until done.**
2. nginx: `conf.d/nextbiz.conf` (existing pattern): 80 → ACME + 301→443; 443 SSL (certbot `--nginx`) + HSTS; proxy `nextbiz-app:3000`.
3. Compose up (build from repo branch); smoke: HTTP 200 on all 9 pages, assets no 404, live lead → Slack ping, admin login works.
4. Tony runs health checks; Joydip signs off. Then cleanup/certs auto-renew verify.

## 9. Milestones → backlog mapping

| # | Slice | Verifies backlog items |
|---|---|---|
| M1 | Scaffold, tokens.css from design sheet, chrome (topbar/footer), Home port | P1.1 (home), base for all |
| M2 | About, Services, Projects, Contact + legal ×4 ports; content draft seed (realistic, pending Joydip approval) | P1.1, P1.2 |
| M3 | Contact form → validate → DB + Slack; WhatsApp deep link | P1.3, P1.4 |
| M4 | Admin auth + leads inbox + status pipeline + notes | P1.5, P1.6, P1.7 |
| M5 | Page configurator: sections as data, edit/add/remove/reorder/enable-disable, ISR revalidate | P1.8, P1.9 |
| M6 | Deploy + SSL + verification with Tony | P1.10 |

Each milestone = its own feature branch(es) → tests → merge (no PRs; direct merges per convention). No feature spans two milestones' branches.

## 10. Testing

- Unit: validators, content-merge logic, auth cookie sign/verify.
- Integration: POST lead → DB row + Slack called; admin config save → public page revalidates.
- Fidelity self-check per kira-frontend-implementation: rendered vs wireframe zone-by-zone at 375 / 768 / 1440 (playwright or manual check script; screenshots attached to milestone changelog).
- Suite red = no merge, no exceptions.

## 11. Open decisions for Joydip (blocks content, not build)

1. Real contact details (phone/email/WhatsApp number) and budget ranges — or drop budget field (Mira marked DRAFT).
2. Legal copy for 4 pages (Mira's wireframes carry outline/placeholder text; ideally legal pass).
3. Real projects roster + imagery for Projects page (Mira's 3 placeholder figures need real assets).
4. DNS: domain registrar access to point nextbizstudio.com at the VM.

Build can proceed on seeds/placeholders; production launch needs 1–3 + DNS.

## 12. Out-of-scope ideas captured (NOT being built)

- Per-section "reset to design default" button in configurator (cheap revert safety; backlog P3 idea).
- R2/CDN for images + A/B hero testing (P2.7).
- Email notification in addition to Slack (P2.5).

---

*Written by Kira, Oct 13 2026. Triggers scaffold only on Joydip's/Nina's go.*
