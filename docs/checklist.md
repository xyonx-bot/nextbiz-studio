# NextBizStudio — Checklist

The verification sheet. One section per backlog item; each line is observable — anyone can check it without reading code. Tick a line only when it's seen working, not when it's reported working. A P1 item is done only when every line under it ticks.

Mirrors `backlog.md` numbering. Derived from the brief's acceptance section.

## P1.1 — Public site renders all 9 pages

- [ ] Home, About, Services, Projects, Contact each render
- [ ] privacy / terms / refund / cookie each render as real pages
- [ ] At 375px width: all 9 pages match their wireframes, nothing overflows, nothing overlaps
- [ ] At 768px width: same check
- [ ] At 1440px width: same check
- [ ] Every nav link on every page resolves (no 404, no # placeholder)
- [ ] Every footer link on every page resolves
- [ ] Nav and footer are identical across all 9 pages
- [ ] Images load (no broken-image icons) on every page

## P1.2 — Static content is in place

- [ ] Home hero copy is final (Joydip approved)
- [ ] Services list is final, each service has real copy
- [ ] About page copy is final
- [ ] Projects entries are real projects with real write-ups
- [ ] Contact page shows real phone, email, WhatsApp number
- [ ] All 4 legal pages have reviewed text (not lorem, not template stubs)

## P1.3 — Contact form captures leads

- [ ] Empty submit is blocked with visible validation messages
- [ ] Invalid email / phone format is blocked
- [ ] Valid submit from desktop stores the lead
- [ ] Valid submit from mobile stores the lead
- [ ] A Slack notification appears in `#agent-org` within seconds of a valid submit
- [ ] Submitting does not expose a raw error page on failure — user sees a friendly error

## P1.4 — WhatsApp deep-link contact option

- [ ] Contact page shows a WhatsApp option next to the form
- [ ] Tapping it on mobile opens WhatsApp with a prefilled message to the business number
- [ ] The link is visibly usable on desktop too (opens web.whatsapp.com)

## P1.5 — Admin authentication

- [ ] Visiting `/admin` unauthenticated redirects to the login page
- [ ] Visiting any `/admin/*` sub-route unauthenticated redirects to login
- [ ] Correct credentials log in and land somewhere useful
- [ ] Wrong credentials show an error, no login
- [ ] Refreshing the browser keeps the session alive
- [ ] Logging out works — after logout, `/admin` is gated again
- [ ] Credentials come from environment, not committed code

## P1.6 — Leads inbox

- [ ] Inbox lists every test lead submitted in P1.3
- [ ] Each row shows name, contact, message preview, timestamp
- [ ] Newest lead appears first
- [ ] List survives reload (data persisted, not in-memory)

## P1.7 — Lead status pipeline + notes

- [ ] A lead's status can be changed through: new → replied → quoted → won / lost
- [ ] Status change persists across reload
- [ ] Notes can be added to a lead and persist across reload
- [ ] Status and notes are visible in the inbox (row or detail view)

## P1.8 — Page configurator: sections as data

- [ ] Admin shows each page's section list
- [ ] Editing a section's content field and saving reflects on the public page
- [ ] Invalid / empty config does not take the page down (fallback or validation)

## P1.9 — Page configurator: add / remove / reorder / enable-disable

- [ ] Add a section from the registry to a page → appears on the public page
- [ ] Remove a section → disappears from the public page
- [ ] Reorder two sections → public page order changes
- [ ] Disable a section → hidden publicly but still listed in admin
- [ ] All four work without a redeploy

## P1.10 — Deployed and verified live

- [ ] `https://nextbizstudio.com` resolves and serves the site over valid SSL
- [ ] All 9 pages return HTTP 200
- [ ] No broken images or assets on any page (checked live, not localhost)
- [ ] Contact form works end-to-end on the live domain (lead + Slack ping)
- [ ] Admin login works on the live domain
- [ ] Tony's health checks pass and he confirms in `#nina`

## Sign-off

- [ ] All P1 sections above ticked
- [ ] Joydip has clicked through the live site himself and said "done"
- [ ] P2 items reviewed with Joydip — anything pulled forward becomes a fresh backlog revision
