# NextBizStudio — Product Backlog

WHAT gets built, priority-ordered. Each item is independently verifiable — Kira can pick any one and ship it. No build order, no stack, no HOW — that's Kira's technical plan.

Priority meaning here: **P1 = ships in the initial build**, **P2 = after the initial build**, **P3 = someday / not a commitment**. There is no v1/v2 — when P1 items are all done, the project is functionally done and deploys.

## P1 — Initial build (must all be done for the project to be considered built)

### P1.1 — Public site renders all 9 pages
All 9 pages (Home, About, Services, Projects, Contact + privacy / terms / refund / cookie) render from a section-driven composition matching Mira's wireframes.
**Done when:** at 375, 768, 1440 widths, every page matches its wireframe; no dead links; nav and footer identical across all pages.

### P1.2 — Static content is in place
Real text for hero, services offerings, about copy, projects entries, contact details (phone, email), and legal copy populated.
**Done when:** every page shows real content rather than placeholder; Joydip has seen and approved each page's text.

### P1.3 — Contact form captures leads
Contact form on the contact page validates input, persists the lead, and notifies the team.
**Done when:** a test submission from mobile and desktop stores the lead AND a Slack message lands in `#agent-org` within seconds.

### P1.4 — WhatsApp deep-link contact option
Contact page exposes a WhatsApp click-to-chat option alongside the form.
**Done when:** tapping it on mobile opens WhatsApp with a prefilled message to the business number.

### P1.5 — Admin authentication
Single admin account; `/admin` and all sub-routes are gated.
**Done when:** unauthenticated visit to `/admin` redirects to login; correct credentials log in; wrong credentials are rejected; session persists across refresh.

### P1.6 — Leads inbox
Admin lists all captured leads, newest first, with key fields visible.
**Done when:** every test lead from P1.3 appears in the inbox with name / contact / message / timestamp.

### P1.7 — Lead status pipeline + notes
Each lead can be moved through new → replied → quoted → won / lost; admin can add timestamped notes per lead.
**Done when:** status change persists after reload; notes persist after reload; both are visible in the inbox row and detail view.

### P1.8 — Page configurator: sections as data
Admin can view each page's section list and edit per-section content.
**Done when:** changing a section's content field in admin and saving makes the change visible on the public page.

### P1.9 — Page configurator: add / remove / reorder / enable-disable
Admin can add a section from the registry to a page, remove one, change the order, toggle enabled/disabled.
**Done when:** each of the four operations works from admin and the public page reflects the change without a redeploy.

### P1.10 — Deployed and verified live
Site is reachable at nextbizstudio.com with valid SSL; Tony's health checks pass.
**Done when:** `https://nextbizstudio.com` loads all 9 pages with HTTP 200 and no broken assets; Tony confirms.

## P2 — After the initial build (deferred — scope Joydip said later or it wasn't requested)

| # | Item | Why deferred |
|---|---|---|
| P2.1 | Blog / CMS posts | Was listed as OUT. Adds scope not asked for. |
| P2.2 | Multi-user / role-based admin (e.g. editor vs admin) | Single admin is enough for launch; not asked for. |
| P2.3 | Client portal | Was listed as OUT. |
| P2.4 | In-admin analytics dashboard | Tony tracks site analytics externally; not asked for in admin. |
| P2.5 | Email notifications on new lead (in addition to Slack) | Slack is the primary channel; email is a nice-to-have. |
| P2.6 | WhatsApp template / WABA integration inside admin | Rani's WABA surface lives in Meta Proxy, not here. |
| P2.7 | Image CDN / hero A-B testing | Optimization beyond launch quality. |

## Notes

- Items within P1 have no prescribed order — Kira picks what unblocks what. P1.1 and P1.5 naturally go early because later items verify against them.
- A feature marked done is verified by Nina (or Tony for deploy) against the Done-when clause, not Kira's say-so.
- Anything new that arrives while P1 is running lands in P2 unless Joydip pulls it in.
