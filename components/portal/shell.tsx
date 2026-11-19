"use client";

import { useState } from "react";
import Link from "next/link";
import { logoutClientAction } from "@/app/portal/actions";

export type Tab = "overview" | "messages" | "payments" | "files" | "updates";
type Nav = Tab | "account" | "home";

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

const I = {
  overview: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>,
  messages: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  payments: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></svg>,
  files: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>,
  updates: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>,
  account: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>,
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>,
  out: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>,
};

/**
 * Client portal frame — the same work-tool shell as the Studio Desk (admin): fixed sidebar + topline + content.
 * Sidebar: project (switcher when there are several) · Overview / Messages / Payments / Files / Updates · Account · Log out.
 * Phones: the sidebar becomes a drawer behind the ≡ button (admin.css .side/.scrim rules).
 */
export function PortalShell({ client, projects, project, current, counts, crumb, title, acts, children }: {
  client: { name: string; business: string | null };
  projects: { id: string; title: string }[];
  project?: { id: string; title: string };
  current: Nav;
  counts?: { unread?: number; due?: number };
  crumb: string;
  title: React.ReactNode;
  acts?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const href = (t: Tab) => `/portal/p/${project!.id}${t === "overview" ? "" : `?tab=${t}`}`;
  const tabs: [Tab, string, number | undefined][] = [
    ["overview", "Overview", undefined], ["messages", "Messages", counts?.unread], ["payments", "Payments", counts?.due],
    ["files", "Files", undefined], ["updates", "Updates", undefined],
  ];

  return (
    <div className="adminui pui">
      <div className={`scrim${open ? " open" : ""}`} onClick={close} />
      <div className="shell">
        <aside className={`side${open ? " open" : ""}`}>
          <Link className="sbrand" href="/portal" onClick={close}><img className="logo-img" src="/brand/nb-logo-web.png" alt="" width={29} height={22} /> Client Portal</Link>

          <span className="slabel">{projects.length > 1 ? `Projects · ${projects.length}` : "Project"}</span>
          <div className="pui-projects">
            {projects.map((p) => (
              <Link key={p.id} href={`/portal/p/${p.id}`} onClick={close} className={project?.id === p.id ? "on" : ""} aria-current={project?.id === p.id ? "true" : undefined}>
                <i aria-hidden />{p.title}
              </Link>
            ))}
            {projects.length === 0 && <span className="pui-none">No projects yet</span>}
          </div>

          {project && (<>
            <span className="slabel">This project</span>
            <nav>
              {tabs.map(([t, label, n]) => (
                <Link key={t} href={href(t)} onClick={close} className={current === t ? "on" : ""} aria-current={current === t ? "page" : undefined}>
                  {I[t]} {label} {n ? <span className={`cnt${t === "payments" ? " due" : " new"}`} aria-label={t === "payments" ? `${n} to pay` : `${n} new`}>{n}</span> : null}
                </Link>
              ))}
            </nav>
          </>)}

          <span className="slabel">You</span>
          <nav>
            {!project && <Link href="/portal" onClick={close} className={current === "home" ? "on" : ""}>{I.home} All projects</Link>}
            <Link href="/portal/account" onClick={close} className={current === "account" ? "on" : ""}>{I.account} Account</Link>
          </nav>

          <span className="sgap" />
          <div className="sfoot">
            <div className="who"><span className="av">{initials(client.name)}</span> <span className="pui-who"><b>{client.name}</b>{client.business ? <small>{client.business}</small> : null}</span></div>
            <form action={logoutClientAction}><button className="logout" type="submit">Log out {I.out}</button></form>
          </div>
        </aside>

        <div className="main">
          <div className="topline">
            <div className="tl-left">
              <button className="mtoggle" aria-label="Menu" onClick={() => setOpen(!open)}><i /></button>
              <div><span className="crumb">{crumb}</span><h1>{title}</h1></div>
            </div>
            {acts ? <div className="acts">{acts}</div> : null}
          </div>
          {project && (
            <nav className="pui-mtabs" aria-label="Project sections">
              {tabs.map(([t, label, n]) => (
                <Link key={t} href={href(t)} className={current === t ? "on" : ""} aria-current={current === t ? "page" : undefined}>{label}{n ? <span className={t === "payments" ? "due" : "new"}>{n}</span> : null}</Link>
              ))}
            </nav>
          )}
          {children}
          <footer className="pui-foot">
            <span>Only you and the studio can see this.</span>
            <a href="https://wa.me/919883608843" target="_blank" rel="noreferrer">Stuck? WhatsApp +91 98836 08843</a>
            <a href="/">nextbizstudio.com ↗</a>
          </footer>
        </div>
      </div>
    </div>
  );
}
