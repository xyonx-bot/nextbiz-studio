# .kira/tasks.md — Sprint 1 (M1: Scaffold + Home)

Packet: joyverse `requests/r-nbs-s1`. Gate AFTER: Joydip visual sign-off on Home at 375/768/1440.

| # | Task | Branch | Status |
|---|---|---|---|
| S1-1 | Repo scaffold: git, .kira/, docs import, architecture.md, README, .gitignore, .env.example | chore/scaffold | done (1a972a1) |
| S1-2 | Next.js 15 + TS + Tailwind4 tooling, app dir, base build green | chore/tooling | done (06ea2be) |
| S1-3 | tokens.css + tailwind theme from design-sheet.html (spot-test 3 hex) | feat/tokens | done (3293299) |
| S1-4 | Topbar + Footer per HANDOFF (nav 5, Explore+Legal×4, CDN logo) | feat/chrome | done (06719a1) |
| S1-5 | Home sections 1:1 port from wireframe (registry pattern), page.tsx compose | feat/home-sections | done (bd4f358) |
| S1-6 | lib/seed/home.json — home content seed (configurator-ready shape) | feat/content-seed | done (bd4f358, same slice) |
| S1-7 | Dockerfile, docker-compose.yml (standalone, joyverse_main_network, no host ports) | chore/docker | done (f3e5696) |
| S1-8 | Playwright e2e: 375/768/1440 screenshots, no-overflow, no broken imgs | test/e2e-home | done (9ca429c, 12/12 pass) |

Cleanup: debug script find-overflow.mjs accidentally committed → removed (cb3d662).

## S1-FIX (design update, r-nbs-s1fix) — nav chrome redesign
| # | Task | Branch | Status |
|---|---|---|---|
| F-1 | burger + .mobilenav CSS port (wireframe lines 37-59 verbatim) + breakpoints ≤1050 !important | feat/nav-chrome | done (ba12dcb) |
| F-2 | Topbar client component: burger in header, drawer sibling, .on/.last/.mn-call | feat/nav-chrome | done (ba12dcb) |
| F-3 | e2e nav.spec.ts: burger 375/768 visible, 1440 hidden, drawer opens, links resolve | feat/nav-chrome | done (21/21) |
| F-4 | Screenshots → docs/screenshots/s1fix/ + push + handoff | — | done (087355f, joyverse answered) |

## S2 (r-nbs-s2) — remaining 8 pages + draft seed content
| # | Task | Branch | Status |
|---|---|---|---|
| S2-1 | Page infra: 8 routes, per-page CSS, legal shared layout, current/.on wiring | feat/s2-pages | done (88097f0) |
| S2-2 | About — editorial doc (masthead+ghost, story drop-cap, defs, method, facts, roster, close) | feat/s2-pages | done |
| S2-3 | Services — catalog, 3 dossiers, Meta Proxy spec sheet, compare, arc, route | feat/s2-pages | done |
| S2-4 | Projects — register, 3 case entries, process notes, compass | feat/s2-pages | done |
| S2-5 | Contact — desk, channels, paper form (UI-only), response ledger, FAQ, qclose | feat/s2-pages | done |
| S2-6 | Legal ×4 — shared doc pattern + 4 seeds | feat/s2-pages | done |
| S2-7 | E2E: 9 pages × 3 widths + link resolution + chrome identity + element-spill test + screenshots s2/ | feat/s2-pages | done (174/174, 27 shots) |

S2 extras (Joydip/Mira mid-sprint): rich footer sitewide (minimal variant removed); Mira's contact 760-block re-sync (18:54); 11 mobile spill fixes — wireframe ≤760 gaps (channels/rrow/faq-head/desk-head/close/catalog-intro/register-head/reg-cols) + grid min-width traps (services/svc-list, spec-body, sheet-row dd) + contact band minmax fix.

## S3 (r-nbs-s3) — contact form live + WhatsApp
| # | Task | Branch | Status |
|---|---|---|---|
| S3-1 | Postgres 16 in compose + leads migration + lib/db.ts | feat/s3-leads | done (14dc755) |
| S3-2 | POST /api/leads: zod, honeypot fake-ok, per-IP rate limit (5/hr, env bypass for ops), DB insert, Slack fire-and-forget | feat/s3-leads | done |
| S3-3 | Form wiring: client submit, inline errors, success panel | feat/s3-leads | done |
| S3-4 | WhatsApp deep-link (env-driven, wa.me prefilled) | feat/s3-leads | done |
| S3-5 | Tests: unit 19 + e2e contact-form (real-submit once + mocked elsewhere) | feat/s3-leads | done (193 pass / 0 fail) |
| S3-6 | Handoff + proof | — | Slack ping LIVE in #agent-org (Joydip Test lead, 05:41Z); awaiting Joydip's own phone test (gate) |

S3 bugs found+fixed: empty-select 422 (zod enum vs neutral prompt — preprocess ""→undefined; every untouched-dropdown user would have failed!), honeypot 422→fake-ok, footer newsletter input name clash in e2e, playwright multi-project rate-limit collision (real submit once + mocked elsewhere).
Bonus: DB backup pipeline LIVE — scripts/db-backup.py → joyverse-user-data/backups/nextbiz-db/ daily 03:30 IST (hermes cron 6ed9d89386c0), restore drill passed.



## S-DESIGNFIX (r-nbs-design-fix-oct20 + r-nbs-head-favicon-link) — Oct 20 design-fix bundle
| # | Task | Branch | Status |
|---|---|---|---|
| DF-1 | tokens.css L14: --soft #EFEFF5 -> #F2EEE4 warm sand | fix/design-bundle-oct20 | done (e12fa17) |
| DF-2 | contact.css mobile: .rrow padding 16px 0 -> 16px 18px | fix/design-bundle-oct20 | done |
| DF-3 | Contact opener -> v5 two-section (intro|form top; photo+text|channels below) | fix/design-bundle-oct20 | done |
| DF-4 | Favicon links in root layout metadata (r-nbs-head-favicon-link) | fix/design-bundle-oct20 | done |
| DF-5 | Tests: --soft unit guard + design-fix-oct20 e2e (12 checks) | fix/design-bundle-oct20 | done (223/0/14-skip) |
| DF-6 | Merge + push -> auto-deploy (bc8a2ae) + live verify | — | done (CI green 39572665237; live: v5 live, f2eee4 live, favicons 200) |

## S4 (r-nbs-s4) — admin auth + leads inbox + pipeline + notes
| # | Task | Branch | Status |
|---|---|---|---|
| S4-1 | migration 002: leads_status_check constraint + lead_notes table | feat/admin-inbox | done |
| S4-2 | lib/auth.ts: env creds + timing-safe compare + HMAC cookie session | feat/admin-inbox | done |
| S4-3 | middleware.ts: /admin + /admin/* gate (fail-closed, ?next kept) | feat/admin-inbox | done |
| S4-4 | login page + useActionState form + rate-limit (10/15min) | feat/admin-inbox | done |
| S4-5 | inbox page + rows: name/contact/preview/timestamp newest-first | feat/admin-inbox | done |
| S4-6 | status select (new→replied→quoted→won/lost) + notes per lead | feat/admin-inbox | done |
| S4-7 | server actions re-check session; revalidatePath | feat/admin-inbox | done |
| S4-8 | tests: unit 6 (auth) + e2e 27 (all 15 checklist lines) | feat/admin-inbox | done (250 e2e green) |
| S4-9 | merge → auto-deploy → live verify + Nina handoff | — | in flight |

## S4-REDESIGN (post-S4 design-fidelity fix, Oct 21) — Mira admin package port
| # | Task | Branch | Status |
|---|---|---|---|
| R-1 | admin.css — 1:1 port from 3 admin wireframes, .adminui-scoped | fix/admin-mira-redesign | done (8e8dbe8) |
| R-2 | Login port (topstrip, ledger-card, inline errmsg, footstrip) | fix/admin-mira-redesign | done |
| R-3 | AdminShell component (fixed 216px sidebar, off-canvas ≤900, scrim) | fix/admin-mira-redesign | done |
| R-4 | Inbox port (filter pills, 6-col ledger, chips, empty state, CSV, row→detail) | fix/admin-mira-redesign | done |
| R-5 | Lead detail page NEW /admin/lead/[id] (brief + notes ledger + stepper + quick actions + meta) | fix/admin-mira-redesign | done |
| R-6 | Migration 003 (kind column) + status/capture ledger entries + countLeads | fix/admin-mira-redesign | done |
| R-7 | Tests: admin.spec rewrite (fidelity + checklist) + csv unit; 242 e2e / 29 unit green | fix/admin-mira-redesign | done |
| R-8 | Merge → auto-deploy 70f69e6 → live verify | — | CI 39650669222 in flight |

## S5 (r-nbs-s5) — page configurator (P1.8 + P1.9)
| # | Task | Branch | Status |
|---|---|---|---|
| A0 | Login autofill override (r-nbs-admin-design-fix item 4/5) | fix/admin-autofill | done (2033a7d) |
| S5-1 | Migration 004: pages_config + page_sections | feat/s5-configurator-foundation | done (b61548e) |
| S5-2 | lib/seed/pages.json — 9-page inventory + admin labels | feat/s5-configurator-foundation | done |
| S5-3 | lib/config.ts — getSections merge/fallback, ensurePageRows, CRUD fns | feat/s5-configurator-foundation | done |
| S5-4 | 32 section components accept content prop (seed fallback) | feat/s5-configurator-foundation | done |
| S5-5 | 9 public pages compose via getSections (force-dynamic) | feat/s5-configurator-foundation | done |
| S5-6 | /api/config CRUD routes (self-gated 401) + revalidatePath | feat/s5-configurator-foundation | done |
| S5-7 | E2E config spec (8 checks, self-cleaning) + unit 40 | feat/s5-configurator-foundation | done (251 e2e fresh-DB) |
| S5-8 | Admin Pages UI — 1:1 port of Mira's pages wireframe (chip bar, ledger, schema editor, structure card, registry+sheet, legal lock, soft-remove 005) | feat/s5-admin-pages-ui | done (2ecb1fa→fac6e1b) |
| S5-9 | Ship foundation → deploy e3e6bd8 → verify live | — | done (CI success, live-verified) |
| S5-10 | Foundation gap: image uploads (R2/CDN route + image field type) — editor shows read-only controls until then | — | backlog |
