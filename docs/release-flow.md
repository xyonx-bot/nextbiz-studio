# Release flow — beta first, prod on Joydip's GO

Prod broke once because every fix shipped straight to production with no
gate between "merged" and "live" (Oct 26 incident — plus a CI deploy step
that silently skipped, making green builds lie). This is the fix: two
environments, one approval gate.

## Environments

| | beta | prod |
|---|---|---|
| URL | beta.nextbizstudio.com | nextbizstudio.com |
| Deploys | origin/main, every 5 min (systemd timer) | tagged releases only |
| Triggered by | automatic | Joydip's explicit GO |
| DB | nextbiz_beta_db (own copy, seeded from prod) | nextbiz_db (live data) |
| Slack leads | disabled (empty webhook) | live |

## The loop

1. **fix/feat branch → tests green → merge to main** (normal dev flow)
2. **beta auto-deploys** within 5 min. Verify there —
   `systemctl status nextbiz-beta-deploy.service` or the beta URL.
3. Fixes accumulate on beta. Nothing touches prod.
4. **Release**: batch of verified work → decision card → Joydip's GO →
   `scripts/deploy.sh --env prod --ref vX.Y.Z --approved-by "Joydip <date>"`
5. Deploy is health-gated (direct + public `/` and `/contact`) and logged
   to `~/deploy-logs/nextbiz-studio-prod.log` (audit trail).

## Cutting a release (checklist)

- [ ] beta verified at the target SHA (features + regression pass)
- [ ] changelog: `git log --oneline $(git describe --tags --abbrev=0)..origin/main`
- [ ] Joydip's GO received (chat / decision card)
- [ ] `git tag -a vX.Y.Z -m "release: <one-line>" && git push origin vX.Y.Z`
- [ ] `scripts/deploy.sh --env prod --ref vX.Y.Z --approved-by "Joydip <date>"`
- [ ] prod verified (deploy.sh gates + spot-check the release items)

## Rollback

```bash
scripts/deploy.sh --env prod --ref vPREV.MINOR.PATCH --approved-by "Joydip rollback <date>"
```

Previous tag, one command. Rollbacks are prod deploys too — GO required.

## Hotfix

Same loop, compressed: branch → tests → main → verify on beta (minutes, not
days) → GO → tag vX.Y.Z+1 → prod.

## Beta DB seeding

```bash
# reseeds beta DB from the live prod DB (pipefail-protected):
scripts/deploy.sh --env beta --seed
```

Wipes the beta DB, restores the prod dump, runs migrations, redeploys.
Never touches the prod DB.

## Conventions

- Tags: `vMAJOR.MINOR.PATCH`. First release under this flow: v1.0.0.
- The timer never deploys prod; the prod path refuses without `--approved-by`.
- CI is tests-only — green means tested, not deployed.
