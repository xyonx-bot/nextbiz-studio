# NextBizStudio — Sprint Plan

Sprint = dispatch unit. One sprint at a time to Kira (work lease — he never holds two). Each sprint below carries (a) the backlog items **verbatim** from `backlog.md`, and (b) the exact checklist lines from `checklist.md` for those items. A sprint is **done only when every checklist line under it is ticked** — nothing else counts.

Flow per sprint: Nina dispatches → Kira task-splits and shows Joydip the list before code → build + test → Kira handoff with evidence → **Nina verifies each checklist line herself** (no line ticks on Kira's say-so) → gate review where marked → next sprint dispatches.

---

## Sprint 1 — Scaffold + Home (M1)

### Backlog carried (verbatim from backlog.md)

> **P1.1 — Public site renders all 9 pages** *(this sprint: Home only)*
> All 9 pages (Home, About, Services, Projects, Contact + privacy / terms / refund / cookie) render from a section-driven composition matching Mira's wireframes.
> **Done when:** at 375, 768, 1440 widths, every page matches its wireframe; no dead links; nav and footer identical across all pages.

**Scope note:** Home only. Nav links to the other 8 pages may 404 until S2 — acceptable in S1, resolved in S2.

### Checklist Kira must make tickable (from checklist.md, P1.1 Home subset)

- [ ] Home renders
- [ ] At 375px width: Home matches its wireframe, nothing overflows, nothing overlaps
- [ ] At 768px width: same check
- [ ] At 1440px width: same check
- [ ] Images on Home load (no broken-image icons)

**S1 foundation extras (later sprints verify against these):**
- [ ] `tokens.css` derived from Mira's `design-sheet.html` (spot-check any 3 hex values match)
- [ ] Topbar/Footer components match HANDOFF.md (full nav list, Explore + Legal×4 footer, logo CDN URL)
- [ ] Repo scaffolded per technical-plan.md §6 (compose, Dockerfile, .env.example, .kira/ scratch)

### Gate before S2 dispatches

**Joydip visual sign-off: Home at 375 / 768 / 1440.** Frozen design — if Home is wrong, everything downstream is wrong. Cheapest moment to catch it.

---

## Sprint 2 — Remaining 8 pages + seed content (M2)

### Backlog carried (verbatim)

> **P1.1 — Public site renders all 9 pages** *(this sprint: the remaining 8)*
> **Done when:** at 375, 768, 1440 widths, every page matches its wireframe; no dead links; nav and footer identical across all pages.

> **P1.2 — Static content is in place** *(this sprint: draft seeds only; real copy lands in S6)*
> Real text for hero, services offerings, about copy, projects entries, contact details (phone, email), and legal copy populated.
> **Done when:** every page shows real content rather than placeholder; Joydip has seen and approved each page's text.

### Checklist Kira must make tickable (from checklist.md)

- [ ] About, Services, Projects, Contact each render
- [ ] privacy / terms / refund / cookie each render as real pages
- [ ] At 375px: all 9 pages match wireframes, no overflow, no overlap
- [ ] At 768px: same check
- [ ] At 1440px: same check
- [ ] Every nav link on every page resolves (no 404, no `#` placeholder)
- [ ] Every footer link on every page resolves
- [ ] Nav and footer are identical across all 9 pages
- [ ] Images load on every page

*(P1.2 "real content" lines intentionally NOT in this sprint — draft seeds here; final copy is S6's job.)*

### Gate

Nina verification + digest to `#nina`. Joydip review optional.

---

## Sprint 3 — Contact form + Slack + WhatsApp (M3)

### Backlog carried (verbatim)

> **P1.3 — Contact form captures leads**
> Contact form on the contact page validates input, persists the lead, and notifies the team.
> **Done when:** a test submission from mobile and desktop stores the lead AND a Slack message lands in `#agent-org` within seconds.

> **P1.4 — WhatsApp deep-link contact option**
> Contact page exposes a WhatsApp click-to-chat option alongside the form.
> **Done when:** tapping it on mobile opens WhatsApp with a prefilled message to the business number.

### Checklist Kira must make tickable (from checklist.md, P1.3 + P1.4 in full)

- [ ] Empty submit is blocked with visible validation messages
- [ ] Invalid email / phone format is blocked
- [ ] Valid submit from desktop stores the lead
- [ ] Valid submit from mobile stores the lead
- [ ] Slack notification appears in `#agent-org` within seconds of a valid submit
- [ ] Failure shows a friendly error, never a raw error page
- [ ] Contact page shows a WhatsApp option next to the form
- [ ] Tapping it on mobile opens WhatsApp with a prefilled message
- [ ] The link is usable on desktop too (opens web.whatsapp.com)

### Gate before S4 dispatches

**Joydip submits a real test lead from his phone and sees the Slack ping himself.** First live behavior — he should feel it.

---

## Sprint 4 — Admin auth + leads inbox + pipeline (M4)

### Backlog carried (verbatim)

> **P1.5 — Admin authentication**
> Single admin account; `/admin` and all sub-routes are gated.
> **Done when:** unauthenticated visit to `/admin` redirects to login; correct credentials log in; wrong credentials are rejected; session persists across refresh.

> **P1.6 — Leads inbox**
> Admin lists all captured leads, newest first, with key fields visible.
> **Done when:** every test lead from P1.3 appears in the inbox with name / contact / message / timestamp.

> **P1.7 — Lead status pipeline + notes**
> Each lead can be moved through new → replied → quoted → won / lost; admin can add timestamped notes per lead.
> **Done when:** status change persists after reload; notes persist after reload; both are visible in the inbox row and detail view.

### Checklist Kira must make tickable (from checklist.md, P1.5 + P1.6 + P1.7 in full)

- [ ] Visiting `/admin` unauthenticated redirects to login
- [ ] Visiting any `/admin/*` sub-route unauthenticated redirects to login
- [ ] Correct credentials log in and land somewhere useful
- [ ] Wrong credentials show an error, no login
- [ ] Refresh keeps the session alive
- [ ] Logout works — `/admin` gated again after
- [ ] Credentials come from environment, not committed code
- [ ] Inbox lists every test lead from P1.3
- [ ] Each row shows name, contact, message preview, timestamp
- [ ] Newest lead appears first
- [ ] List survives reload (persisted, not in-memory)
- [ ] Status changeable: new → replied → quoted → won / lost
- [ ] Status change persists across reload
- [ ] Notes persist across reload
- [ ] Status and notes visible in inbox (row or detail view)

### Gate

Nina verification (she logs in with the env credentials, walks every line personally). Joydip review optional.

---

## Sprint 5 — Page configurator (M5)

### Backlog carried (verbatim)

> **P1.8 — Page configurator: sections as data**
> Admin can view each page's section list and edit per-section content.
> **Done when:** changing a section's content field in admin and saving makes the change visible on the public page.

> **P1.9 — Page configurator: add / remove / reorder / enable-disable**
> Admin can add a section from the registry to a page, remove one, change the order, toggle enabled/disabled.
> **Done when:** each of the four operations works from admin and the public page reflects the change without a redeploy.

### Checklist Kira must make tickable (from checklist.md, P1.8 + P1.9 in full)

- [ ] Admin shows each page's section list
- [ ] Editing a section's content field and saving reflects on the public page
- [ ] Invalid / empty config does not take the page down (fallback or validation)
- [ ] Add a section from the registry → appears on the public page
- [ ] Remove a section → disappears from the public page
- [ ] Reorder two sections → public page order changes
- [ ] Disable a section → hidden publicly, still listed in admin
- [ ] All four operations work without a redeploy

### Gate before S6 dispatches

**Joydip uses the configurator once himself** — edits one section's text, sees it change live on the public page.

---

## Sprint 6 — Real content + deploy + Tony verify (M6)

### Backlog carried (verbatim)

> **P1.2 — Static content is in place** *(final: real copy, not seeds)*
> **Done when:** every page shows real content rather than placeholder; Joydip has seen and approved each page's text.

> **P1.10 — Deployed and verified live**
> Site is reachable at nextbizstudio.com with valid SSL; Tony's health checks pass.
> **Done when:** `https://nextbizstudio.com` loads all 9 pages with HTTP 200 and no broken assets; Tony confirms.

### Checklist Kira must make tickable (from checklist.md, P1.2 + P1.10 in full)

- [ ] Home hero copy is final (Joydip approved)
- [ ] Services list is final, each service has real copy
- [ ] About page copy is final
- [ ] Projects entries are real projects with real write-ups
- [ ] Contact page shows real phone, email, WhatsApp number
- [ ] All 4 legal pages have reviewed text (not lorem, not stubs)
- [ ] `https://nextbizstudio.com` resolves and serves over valid SSL
- [ ] All 9 pages return HTTP 200
- [ ] No broken images/assets on any page (live, not localhost)
- [ ] Contact form works end-to-end on live domain (lead + Slack ping)
- [ ] Admin login works on live domain
- [ ] Tony's health checks pass and he confirms in `#nina`

### Blockers S6 depends on (Joydip owns — from technical-plan §11)

1. Real contact details (phone / email / WhatsApp) + budget ranges
2. Legal copy for the 4 pages
3. Real projects roster + imagery
4. DNS: point nextbizstudio.com at the VM

Nina starts nudging at S3 if these aren't in.

### Gate

**Joydip clicks through the live site himself and says "done."** Project then moves to Tony's ongoing maintenance.

---

## Project sign-off (all sprints closed)

- [ ] Every P1 section in checklist.md ticked
- [ ] Joydip has clicked the live site himself and said "done"
- [ ] P2 list reviewed with Joydip — anything pulled forward becomes a backlog revision

## Sprint protocol (every sprint)

1. **Dispatch** — Nina writes joyverse `requests`: `{kind: sprint, sprint: S#, milestone: M#, items: [...], lease: kira, heartbeat: now}` + digest to `#nina`
2. **Task split** — Kira breaks items into technical tasks, shows Joydip the list **before code** (30-sec misread check, not an approval)
3. **Build + test** — technical-plan §10 rules; tests red = no merge
4. **Handoff** — Kira writes joyverse `requests`: `{kind: handoff, sprint: S#, status: done, evidence: {commits, tests, screenshots}}`
5. **Verify** — Nina ticks each checklist line herself, in the running app
6. **Gate** — where marked, Joydip confirms; elsewhere Nina's verification advances the project

**Work lease: one sprint at a time.** Kira never holds S(n+1) while S(n) is open. New requests arriving mid-flight go to the P2 list unless Joydip pulls them forward.
