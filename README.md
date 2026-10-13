# NextBizStudio

NextBizStudio's own marketing site + single-admin back office. 9 public pages (Mira's frozen design), lead capture → Slack, leads inbox + pipeline, page configurator. Client-quality — the site IS the demo.

- **Plan truth:** `~/../workspaces/nina/projects/nextbiz-studio/` (brief, backlog, checklist, sprint-plan). Copies live in `docs/`.
- **Design truth:** `~/prototypes/nextbizstudio/` (design sheet + wireframes + HANDOFF). Port, never reinterpret.
- **Architecture:** `docs/architecture.md` · **Technical plan:** `docs/technical-plan.md`

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind 4 · Postgres 16 (from S3) · Vitest + Playwright · Docker.

## Dev

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # unit
npm run test:e2e # playwright (needs dev server)
npm run build
```

Env: copy `.env.example` → `.env.local`. Secrets never committed.

## Conventions

- Branch per task (`feat/`, `fix/`, `chore/`, `docs/`) → tests green → self-merge to `main`.
- Design tokens only from `styles/tokens.css` (design sheet is law). No inline hex.
- `.kira/` is execution scratch — removed at sprint end.
