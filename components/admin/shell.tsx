"use client";

import { useState } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import { Inbox, LayoutGrid, Settings, LogOut, Mail, Palette } from "./icons";

/**
 * Admin shell (Mira's inbox/lead wireframes): FIXED 216px sidebar + main.
 * Mobile ≤900: sidebar becomes the off-canvas drawer, scrim closes it.
 * Login does NOT use this shell (nothing to navigate to yet).
 *
 * `current` marks the active nav row (Pages activates on /admin/pages —
 * S5 pages wireframe). Settings stays a non-navigable placeholder.
 * Never a dead "#" link.
 */
export function AdminShell({
  leadCount,
  pageCount,
  current = "leads",
  clientUnread,
  crumb,
  title,
  acts,
  children,
}: {
  leadCount: number;
  pageCount?: number;
  current?: "leads" | "clients" | "pages" | "subscribers" | "email" | "design" | "planner";
  clientUnread?: number;
  crumb: string;
  title: React.ReactNode;
  acts?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={`scrim${open ? " open" : ""}`} onClick={() => setOpen(false)} />
      <div className="shell">
        <aside className={`side${open ? " open" : ""}`}>
          <div className="sbrand"><img className="logo-img" src="/brand/nb-logo-web.png" alt="" width={29} height={22} /> Studio Desk</div>
          <span className="slabel">Desk</span>
          <nav>
            <Link href="/admin" className={current === "leads" ? "on" : ""} onClick={() => setOpen(false)}>
              <Inbox /> Leads <span className="cnt" data-testid="lead-count">{leadCount}</span>
            </Link>
            <Link href="/admin/clients" className={current === "clients" ? "on" : ""} onClick={() => setOpen(false)} data-testid="nav-clients">
              <Mail /> Clients {clientUnread ? <span className="cnt new" title="Unread client messages">{clientUnread}</span> : null}
            </Link>
            <Link href="/admin/pages" className={current === "pages" ? "on" : ""} onClick={() => setOpen(false)}>
              <LayoutGrid /> Pages {pageCount !== undefined && <span className="cnt">{pageCount}</span>}
            </Link>
            <Link href="/admin/subscribers" className={current === "subscribers" ? "on" : ""} onClick={() => setOpen(false)}>
              <Mail /> Subscribers
            </Link>
            <Link href="/admin/design" className={current === "design" ? "on" : ""} onClick={() => setOpen(false)} data-testid="nav-design">
              <Palette /> Design
            </Link>
            <Link href="/admin/planner" className={current === "planner" ? "on" : ""} onClick={() => setOpen(false)} data-testid="nav-planner">
              <LayoutGrid /> Planner
            </Link>
            <Link href="/admin/email" className={current === "email" ? "on" : ""} onClick={() => setOpen(false)}>
              <Settings /> Email
            </Link>
          </nav>
          <span className="sgap" />
          <div className="sfoot">
            <div className="who"><span className="av">J</span> Joydip · Owner</div>
            <form action={logoutAction}>
              <button className="logout" type="submit">Sign out <LogOut /></button>
            </form>
          </div>
        </aside>
        <div className="main">
          <div className="topline">
            <div className="tl-left">
              <button className="mtoggle" aria-label="Menu" onClick={() => setOpen(!open)}><i /></button>
              <div>
                <span className="crumb">{crumb}</span>
                <h1>{title}</h1>
              </div>
            </div>
            {acts ? <div className="acts">{acts}</div> : null}
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
