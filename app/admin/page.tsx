import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthenticated, isLeadStatus } from "@/lib/auth";
import { listLeads } from "@/lib/db";
import { fmtRel, fmtAbs } from "@/lib/format";
import { AdminShell } from "@/components/admin/shell";
import { Download, ArrowRight, Mail } from "@/components/admin/icons";

/**
 * S4 (P1.6) — leads inbox, ported from Mira's admin/inbox/wireframe.html:
 * sidebar shell + pinned filter-pill bar (live per-status counts) +
 * 6-column leads ledger, rows link to the lead detail page. Server-side
 * filtering via ?status= — data never leaves the server until rendered.
 * Defense in depth: middleware is the gate, this page re-checks too.
 */
export const dynamic = "force-dynamic";

const STATUSES = ["new", "replied", "quoted", "won", "lost"] as const;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default async function AdminInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const sp = await searchParams;
  const filter = isLeadStatus(sp.status ?? "") ? (sp.status as string) : null;
  const leads = await listLeads();

  const counts: Record<string, number> = { all: leads.length };
  for (const s of STATUSES) counts[s] = leads.filter((l) => l.status === s).length;
  const shown = filter ? leads.filter((l) => l.status === filter) : leads;

  return (
    <AdminShell
      leadCount={leads.length}
      crumb="Studio desk · Leads"
      title="Leads inbox"
      acts={
        <>
          <a className="qadd" href="/admin/export" data-testid="export-csv">
            <Download size={12} /> Export CSV
          </a>
          {leads.length > 0 && (
            <Link className="action" href={`/admin/lead/${leads[0].id}`}>
              Open lead <ArrowRight size={12} />
            </Link>
          )}
        </>
      }
    >
      <div className="fbar" data-testid="fbar">
        <Link className={`fpill${!filter ? " on" : ""}`} href="/admin">All · {counts.all}</Link>
        {STATUSES.map((s) => (
          <Link key={s} className={`fpill${filter === s ? " on" : ""}`} href={`/admin?status=${s}`}>
            {cap(s)} · {counts[s]}
          </Link>
        ))}
        <span className="count">Newest first</span>
      </div>

      <div className="content">
        {leads.length === 0 ? (
          <div className="empty">
            <span className="eic"><Mail size={18} /></span>
            <b>No leads yet</b>
            <p>Leads from the contact form and WhatsApp land here — newest first. Submit a test lead from the contact page to see it appear.</p>
          </div>
        ) : (
          <div className="ledger" data-testid="ledger">
            <div className="lhead">
              <span>Name</span><span>Contact</span><span>Message</span><span>Service</span><span>Received</span><span>Status</span>
            </div>
            {shown.map((l) => (
              <Link
                key={l.id}
                className="lrow"
                href={`/admin/lead/${l.id}`}
                data-lead-id={l.id}
                data-status={l.status}
                data-created-at={l.created_at.toISOString()}
              >
                <span className="nm">{l.name}<small>via contact form</small></span>
                <span className="ct"><b>{l.phone || "—"}</b>{l.email || "—"}</span>
                <span className="msg">{l.message}</span>
                <span className="svc">{l.service || "—"}</span>
                <span className="ts"><b>{fmtRel(l.created_at)}</b>{fmtAbs(l.created_at)}</span>
                <span className={`st st-${l.status}`}><i />{l.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
