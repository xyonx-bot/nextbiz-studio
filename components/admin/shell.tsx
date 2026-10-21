"use client";

import { useState } from "react";
import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import { Inbox, LayoutGrid, Settings, LogOut } from "./icons";

/**
 * Admin shell (Mira's inbox/lead wireframes): FIXED 216px sidebar + main.
 * Mobile ≤900: sidebar becomes the off-canvas drawer, scrim closes it.
 * Login does NOT use this shell (nothing to navigate to yet).
 *
 * Pages/Settings nav rows are rendered as non-navigable placeholders —
 * Pages arrives with the S5 configurator; Settings is not in scope.
 * Never a dead "#" link.
 */
export function AdminShell({
  leadCount,
  crumb,
  title,
  acts,
  children,
}: {
  leadCount: number;
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
          <div className="sbrand"><span className="logo-ph">NB</span> Studio Desk</div>
          <span className="slabel">Desk</span>
          <nav>
            <Link href="/admin" className="on" onClick={() => setOpen(false)}>
              <Inbox /> Leads <span className="cnt" data-testid="lead-count">{leadCount}</span>
            </Link>
            <span className="nnav" title="Pages — arrives with the content configurator (S5)">
              <LayoutGrid /> Pages
            </span>
            <span className="nnav" title="Settings — not in the current scope">
              <Settings /> Settings
            </span>
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
