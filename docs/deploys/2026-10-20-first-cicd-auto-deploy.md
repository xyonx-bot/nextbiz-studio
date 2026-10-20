# Deploy — 2026-10-20 05:39Z — First CI/CD auto-deploy (pipeline armed)

- **Project:** nextbiz-studio (https://nextbizstudio.com)
- **From:** live image built 2026-10-16T06:04Z (a2c232d-era, S3-complete — served via nginx since Oct 19 gate)
- **To sha:** `a4b51e9` (app content = `ce27c02`; a4b51e9 + bcb5733 are deploy/CI fixes)
- **Reason:** Arm auto-deploy: Kira's CI/CD pipeline (run ce27c02, Oct 19) had the deploy job gated on 3 `DEPLOY_SSH_*` repo secrets. Tony set secrets + fixed two deploy-path bugs; this run is the first push-triggered automated prod deploy.
- **Trigger:** push to main (`a4b51e9`), run [39375719862](https://github.com/xyonx-bot/nextbiz-studio/actions/runs/39375719862)

## Infra armed (Tony, this session)

- Dedicated ed25519 deploy keypair `~/.ssh/id_ed25519_nbs_deploy` (VM) — private key only in GitHub secret `DEPLOY_SSH_KEY`, never in repo/chat
- `authorized_keys` entry restricted: `no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty`
- Secrets set: `DEPLOY_SSH_HOST` (VM public IP), `DEPLOY_SSH_USER` (ubuntu), `DEPLOY_SSH_KEY`
- GitHub token: fine-grained PAT with secrets:write (Joydip-issued, in Tony profile env)

## Issues hit (both fixed this session)

1. **Runner has no `~/.ssh`** → `install -m 600` died ("No such file or directory"). Fix `bcb5733`: `install -D -m 600` (creates leading dirs). Found on manual dispatch run 39374323089.
2. **`git archive` drops untracked `public/`** (empty dir, not in git) → Dockerfile `COPY /app/public` failed the image build. Fix `a4b51e9`: deploy.sh recreates `public/` in the stage export — same trap ci-cd.yml already guards for in e2e. Found on run 39375070411.

## Steps

1. quality (lint+typecheck) ✓ 2. unit (vitest) ✓ 3. e2e (Playwright + real Postgres) ✓
4. deploy ✓ — fetch → stage-export → build (60s) → migrations (`001-leads.sql`, ON_ERROR_STOP) → `up --wait` → nginx reload → health gate
5. verify ✓ — direct `/`,`/contact` → 200; public `/`,/contact` → 200 (via Cloudflare); runner post-deploy re-check 200

## Rollback pin

- App-equivalent previous good: `ce27c02`. **Rollback = `git revert <bad-sha>` on main + push → pipeline auto-redeploys.** No manual steps.
- Live container: image created 2026-10-20T05:39:03Z, `nextbiz_app` on `joyverse_main_network`, no host ports (nginx-only exposure).

## Post-deploy soak

- 6+ min green: `/` and `/contact` public 200, title `NextBiz Studio — Your Digital Team, When You Need It`, `_next` assets resolve, SSL valid to Dec 16 2026, **0 errors** in `docker logs nextbiz_app` since deploy.
- Canonical checkout untouched (still `ce27c02`); stage export at `~/deploy-stage/nextbiz-studio` with `.env` chmod 600.

— Tony (deploy log per tony-deploy runbook; pipeline: `.github/workflows/ci-cd.yml` → `scripts/deploy.sh`)
