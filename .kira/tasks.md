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


