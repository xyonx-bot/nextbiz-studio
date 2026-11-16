import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { isAuthenticated } from "@/lib/auth";
import { countLeads } from "@/lib/db";
import { listRecentEmails, mailOn } from "@/lib/mail";
import { getEmailSettings } from "@/lib/settings";
import { fmtRel } from "@/lib/format";
import { AdminShell } from "@/components/admin/shell";
import { AutoReplySettings, KIND } from "@/components/admin/email-composer";

/** Email settings: auto thank-you on/off + its content, test inbox, and the send log. */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Email — Studio Desk | NextBiz Studio" };

export default async function EmailSettingsPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const [settings, total, log] = await Promise.all([
    getEmailSettings(), countLeads(), listRecentEmails(40).catch(() => []),
  ]);
  return (
    <AdminShell leadCount={total} current="email" crumb="Studio desk · Email" title="Email">
      <div className="emailpage">
        <AutoReplySettings initial={settings} enabled={mailOn()} />
        <div className="panel">
          <div className="phead"><span className="pt">Sent log · last {log.length}</span><span className="when">Every email the site sends</span></div>
          {log.length === 0 && <p className="ecomp-empty">Nothing sent yet.</p>}
          {log.map((e) => (
            <div className="erow" key={e.id}>
              <span className={`est est-${e.status}`}>{e.status}</span>
              <span className="esub">{e.subject}
                <small>{KIND[e.kind] ?? e.kind} · {e.to_email}{e.lead_id ? <> · <Link href={`/admin/lead/${e.lead_id}`}>{e.lead_name ?? "lead"}</Link></> : null}{e.error ? ` · ${e.error}` : ""}</small>
              </span>
              <time>{fmtRel(e.created_at)}</time>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
