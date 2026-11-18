import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { isAuthenticated } from "@/lib/auth";
import { countLeads } from "@/lib/db";
import { STAGES, countUnreadForStudio, getClient, listProjects, unreadFor } from "@/lib/portal";
import { fmtRel } from "@/lib/format";
import { AdminShell } from "@/components/admin/shell";
import { AccessActions, ClientEditForm } from "@/components/admin/client-forms";
import { addProjectAction, setAccessAction } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Client — Studio Desk | NextBiz Studio" };

export default async function ClientPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { id } = await params;
  const c = await getClient(id);
  if (!c) notFound();
  const sp = await searchParams;
  const [projects, leads, unreadAll] = await Promise.all([listProjects(c.id), countLeads(), countUnreadForStudio()]);
  const unread = await Promise.all(projects.map((p) => unreadFor(p.id, "studio")));
  return (
    <AdminShell leadCount={leads} current="clients" clientUnread={unreadAll} crumb={`Clients · ${c.business ?? c.email}`} title={c.name}
      acts={<Link className="back" href="/admin/clients">← Clients</Link>}>
      <div className="content">
        {sp.created && <div className="ca-banner">Client created{c.invited_at ? ` and the invite was emailed to ${c.email}` : ""}. You can copy a login link below to send on WhatsApp too.</div>}
        <div className="ca-grid">
          <div className="ca-col">
            <section className="ca-card">
              <h2>Projects</h2>
              {projects.map((p, i) => (
                <Link key={p.id} className="ca-projrow" href={`/admin/clients/${c.id}/p/${p.id}`}>
                  <b>{p.title}</b><span>{STAGES.find((s) => s.id === p.stage)?.label}</span>
                  {unread[i] ? <span className="ca-tag new">{unread[i]} new</span> : <span />}
                  <span className="ca-go">Open →</span>
                </Link>
              ))}
              <form action={addProjectAction} className="ca-row ca-addproj">
                <input type="hidden" name="id" value={c.id} />
                <input name="title" placeholder="Another project, e.g. Instagram growth" required className="ca-in" />
                <button className="ca-btn" type="submit">+ Add project</button>
              </form>
            </section>
            <section className="ca-card"><h2>Details</h2><ClientEditForm c={c} /></section>
          </div>
          <div className="ca-col">
            <section className="ca-card">
              <h2>Portal access</h2>
              <ul className="ca-kv">
                <li><span>Status</span><b>{c.portal_enabled ? "On" : "Off"}</b></li>
                <li><span>Invited</span><b>{c.invited_at ? fmtRel(new Date(c.invited_at)) : "Not yet"}</b></li>
                <li><span>Last seen</span><b>{c.last_seen_at ? fmtRel(new Date(c.last_seen_at)) : "Never logged in"}</b></li>
                <li><span>Password</span><b>{c.has_password ? "Set by client" : "None (logs in with codes)"}</b></li>
                {c.lead_id && <li><span>From lead</span><b><Link href={`/admin/lead/${c.lead_id}`}>Open enquiry</Link></b></li>}
              </ul>
              {c.portal_enabled && <AccessActions id={c.id} phone={c.phone} />}
              <form action={setAccessAction}>
                <input type="hidden" name="id" value={c.id} /><input type="hidden" name="on" value={c.portal_enabled ? "0" : "1"} />
                <button className={`ca-btn${c.portal_enabled ? " danger" : " pri"}`} type="submit">{c.portal_enabled ? "Turn off portal access" : "Turn on portal access"}</button>
              </form>
              <p className="ca-sub">Turning access off logs the client out everywhere. Their projects and files stay.</p>
            </section>
            <section className="ca-card">
              <h2>How they log in</h2>
              <p className="ca-sub">At <b>/portal</b> with their email: we send a 6-digit code. They can also set a password in Account. If email isn&apos;t arriving, use <b>Get a login link</b> above and send it on WhatsApp.</p>
            </section>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
