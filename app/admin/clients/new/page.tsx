import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { isAuthenticated } from "@/lib/auth";
import { countLeads, getLead } from "@/lib/db";
import { countUnreadForStudio, getClientByLead } from "@/lib/portal";
import { AdminShell } from "@/components/admin/shell";
import { NewClientForm } from "@/components/admin/client-forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "New client — Studio Desk | NextBiz Studio" };

export default async function NewClientPage({ searchParams }: { searchParams: Promise<{ lead?: string }> }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const sp = await searchParams;
  const lead = sp.lead && /^[0-9a-f-]{36}$/i.test(sp.lead) ? await getLead(sp.lead) : null;
  if (lead) { const existing = await getClientByLead(lead.id); if (existing) redirect(`/admin/clients/${existing.id}`); }
  const [leads, unread] = await Promise.all([countLeads(), countUnreadForStudio()]);
  return (
    <AdminShell leadCount={leads} current="clients" clientUnread={unread} crumb={lead ? `Leads · ${lead.name} · Make client` : "Clients · New"} title={lead ? `Make ${lead.name} a client` : "New client"}
      acts={<Link className="back" href={lead ? `/admin/lead/${lead.id}` : "/admin/clients"}>← Back</Link>}>
      <div className="content">
        <div className="ca-card ca-narrow">
          <h2>{lead ? "From this lead" : "Add a client by hand"}</h2>
          <p className="ca-sub">{lead ? "Details are filled in from the enquiry. Check them, then create." : "For clients who came through WhatsApp, a call or a referral."}</p>
          <NewClientForm lead={lead ? { id: lead.id, name: lead.name, email: lead.email ?? "", phone: lead.phone ?? "", service: lead.service ?? "", hasPlan: Boolean((lead as unknown as { plan?: unknown }).plan) } : undefined} />
        </div>
      </div>
    </AdminShell>
  );
}
