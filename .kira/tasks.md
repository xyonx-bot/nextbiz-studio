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

