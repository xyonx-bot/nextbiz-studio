import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { isAuthenticated } from "@/lib/auth";
import { listLeads, listSubscribers, type SubscriberRow } from "@/lib/db";
import { fmtRel, fmtAbs } from "@/lib/format";
import { AdminShell } from "@/components/admin/shell";
import { Download, Mail } from "@/components/admin/icons";

/** Subscribers — emails from library unlocks, NextBiz One waitlist and the
 *  footer newsletter (/api/subscribe). Same ledger look as the leads inbox. */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Subscribers — Studio Desk | NextBiz Studio" };

const LISTS = [
  { key: "resource", label: "Library unlocks" },
  { key: "nextbiz-one", label: "NextBiz One waitlist" },
  { key: "newsletter", label: "Newsletter" },
] as const;
const labelOf = (k: string) => LISTS.find((l) => l.key === k)?.label ?? k;

export default async function SubscribersPage({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const sp = await searchParams;
  const filter = LISTS.some((l) => l.key === sp.list) ? sp.list! : null;

  let rows: SubscriberRow[] = [];
  try { rows = await listSubscribers(); } catch { rows = []; }
  const leads = await listLeads().catch(() => []);
  const shown = filter ? rows.filter((r) => r.list === filter) : rows;
  const unique = new Set(rows.map((r) => r.email.toLowerCase())).size;

  return (
    <AdminShell
      leadCount={leads.length}
      current="subscribers"
      crumb="Studio desk · Subscribers"
      title="Subscribers"
      acts={
        <a className="qadd" href={`/admin/subscribers/export${filter ? `?list=${filter}` : ""}`}>
          <Download size={12} /> Export CSV
        </a>
      }
    >
      <div className="fbar">
        <Link className={`fpill${!filter ? " on" : ""}`} href="/admin/subscribers">All · {rows.length}</Link>
        {LISTS.map((l) => (
          <Link key={l.key} className={`fpill${filter === l.key ? " on" : ""}`} href={`/admin/subscribers?list=${l.key}`}>
            {l.label} · {rows.filter((r) => r.list === l.key).length}
          </Link>
        ))}
        <span className="count">{unique} unique emails</span>
      </div>
      <div className="content">
        {shown.length === 0 ? (
          <div className="empty">
            <span className="eic"><Mail size={18} /></span>
            <b>No subscribers yet</b>
            <p>Emails from resource unlocks, the NextBiz One waitlist and the footer newsletter land here.</p>
          </div>
        ) : (
          <div className="ledger">
            <div className="lhead">
              <span>Email</span><span>List</span><span>Source</span><span>First seen</span><span>Last seen</span><span></span>
            </div>
            {shown.map((r) => (
              <div className="lrow" key={r.id}>
                <span className="nm">{r.email}</span>
                <span className="svc">{labelOf(r.list)}</span>
                <span className="msg">{r.source || "—"}</span>
                <span className="ts"><b>{fmtRel(r.created_at)}</b>{fmtAbs(r.created_at)}</span>
                <span className="ts"><b>{fmtRel(r.last_seen_at)}</b>{fmtAbs(r.last_seen_at)}</span>
                <span />
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
