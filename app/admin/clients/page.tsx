import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { isAuthenticated } from "@/lib/auth";
import { countLeads } from "@/lib/db";
import { countUnreadForStudio, listClients, STAGES } from "@/lib/portal";
import { fmtRel } from "@/lib/format";
import { AdminShell } from "@/components/admin/shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Clients — Studio Desk | NextBiz Studio" };

export default async function ClientsPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const [clients, leads, unread] = await Promise.all([listClients(), countLeads(), countUnreadForStudio()]);
  return (
    <AdminShell leadCount={leads} current="clients" clientUnread={unread} crumb="Studio desk · Client portal" title="Clients"
      acts={<Link className="action" href="/admin/clients/new">+ New client</Link>}>
      <div className="content">
        {clients.length === 0 ? (
          <div className="ca-card ca-empty">
            <h2>No clients yet</h2>
            <p className="ca-sub">Turn a lead into a client with <b>Make client</b> on the lead page, or add one by hand. Each client gets a private portal to follow their project, message you and share files.</p>
            <Link className="ca-btn pri" href="/admin/clients/new">+ New client</Link>
          </div>
        ) : (
          <div className="ca-card ca-tablewrap">
            <table className="ca-table">
              <thead><tr><th>Client</th><th>Stage</th><th>Projects</th><th>Portal</th><th>Last seen</th><th></th></tr></thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td><Link href={`/admin/clients/${c.id}`}><b>{c.name}</b></Link><small>{c.business ?? c.email}</small></td>
                    <td>{c.stage ? STAGES.find((s) => s.id === c.stage)?.label : "—"}</td>
                    <td>{c.projects}</td>
                    <td>{c.portal_enabled ? (c.last_seen_at ? <span className="ca-tag ok">Active</span> : c.invited_at ? <span className="ca-tag">Invited</span> : <span className="ca-tag">Not invited</span>) : <span className="ca-tag off">Off</span>}</td>
                    <td>{c.last_seen_at ? fmtRel(new Date(c.last_seen_at)) : "—"}</td>
                    <td>{c.unread ? <Link className="ca-tag new" href={`/admin/clients/${c.id}`}>{c.unread} new message{c.unread > 1 ? "s" : ""}</Link> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
