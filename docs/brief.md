# NextBizStudio — Project Brief

**Owner chain:** Nina (planning, coordination) → Kira (build, technical plan, deploy proposal) · Mira (design) · Tony (SEO/health post-launch)
**Kind:** client-quality — NextBizStudio's own marketing site + admin
**Design source of truth:** `~/prototypes/nextbizstudio/` (Mira's v2.1 package — frozen homepage + 8 inner pages, all wireframed, handoff at `HANDOFF.md`)
**Registry note:** old `nextbiz-studio-clone` (Lovable/TanStack) is retired — reference only, zero Lovable code carries over.

## What this is

NextBizStudio's public website (nextbizstudio.com) plus a single-admin back office. Public side renders the 9 pages Mira designed. Admin side captures leads from the contact form, tracks them through a simple pipeline, and lets the admin rearrange page sections without touching code.

This is the agency's own storefront — quality is the demo.

## Features (WHAT gets delivered)

| # | Feature |
|---|---|
| F1 | Public site — Home, About, Services, Projects, Contact + 4 legal pages (privacy/terms/refund/cookie), rendering Mira's frozen design, responsive 375–1440, no dead links, nav/footer consistent across all pages |
| F2 | Lead capture — contact form with validation → stored lead record + Slack notification to `#agent-org`; WhatsApp deep-link as an alternative contact option on the contact page |
| F3 | Admin auth — single admin, login-gated `/admin/*`, credentials from environment |
| F4 | Leads inbox — admin lists all captured leads, moves them through status pipeline (new → replied → quoted → won/lost), adds per-lead notes |
| F5 | Page configurator — admin controls which sections appear on which page, their order, enabled/disabled, and their content, without code changes |

## Specialists

| Who | Owns |
|---|---|
| Mira | design — package complete (`~/prototypes/nextbizstudio/`); future new-section designs come back to her |
| Kira | build + technical plan + deploy proposal; stack, architecture, data model, repo/folder layout are his to propose to Joydip after reading this brief + backlog |
| Tony | post-launch — domain/SSL verification, health checks, SEO |
| Nina | planning, coordination, approvals, follow-up |

**Stack note:** not locked here. Kira proposes architecture + stack + folder structure to Joydip after reading brief + backlog; Joydip confirms or overrides. My one-line opinion for Kira to consider (not a lock): a single Next.js App Router app fits this shape well.

## Acceptance — done means

1. All 9 public pages render matching Mira's wireframes at 375 / 768 / 1440 widths; no dead links; nav/footer consistent across pages
2. Contact form on mobile + desktop: submits → lead appears in admin inbox → Slack ping fires to `#agent-org`
3. `/admin` requires login; unauthenticated visitors are redirected; wrong password is rejected
4. Leads inbox: all leads listed, status changes persist, notes persist
5. Page configurator: add / remove / reorder / edit / disable a section on a page from admin; public page reflects the change
6. Deployed and reachable at nextbizstudio.com with SSL; verified live by Tony's checks

## Explicitly OUT

- Blog / CMS posts
- Instagram automation / social posting (stays with Meta Proxy product)
- Multi-user / roles (single admin only)
- Client portal / per-client workspaces
- Email marketing, newsletters
- In-admin analytics dashboard (Tony tracks externally)

## Open questions / risks

- Domain nextbizstudio.com does not yet resolve — DNS + hosting are part of Kira's deploy proposal
- Real content (phone number, team details, project write-ups, legal copy) is Joydip's — blocks go-live, not build
- Image pipeline for hero/gallery still needs Kira's decision (sourcing, sizing, optimization)
