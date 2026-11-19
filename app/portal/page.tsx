import Link from "next/link";
import { redirect } from "next/navigation";
import { STAGES, currentClient, listProjects, unreadFor } from "@/lib/portal";
import { countDue } from "@/lib/payments";
import { PortalShell } from "@/components/portal/shell";
import { CONTACT } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function PortalHome({ searchParams }: { searchParams: Promise<{ welcome?: string; all?: string }> }) {
  const c = await currentClient();
  if (!c) redirect("/portal/login");
  const projects = await listProjects(c.id);
  const sp = await searchParams;
  if (projects.length === 1 && !sp.welcome) redirect(`/portal/p/${projects[0].id}`);
  const first = c.name.split(/\s+/)[0];
  const [unread, due] = await Promise.all([Promise.all(projects.map((p) => unreadFor(p.id, "client"))), Promise.all(projects.map((p) => countDue(p.id)))]);

  return (
    <PortalShell client={c} projects={projects} current="home" crumb="Client portal" title={sp.welcome ? `You're in, ${first}.` : `Hi ${first}`}>
      <div className="content pui-content">
        {sp.welcome && (
          <section className="ca-card pui-hot">
            <h2>Welcome to your client portal</h2>
            <p className="ca-sub">Everything about your project lives here: where it stands, our updates, messages, files and payments.</p>
            <ul className="ca-kv">
              <li><span>Next time</span><b>nextbizstudio.com/portal</b></li>
              <li><span>Log in with</span><b>Your email · we send a 6-digit code to {c.email}</b></li>
              <li><span>Prefer a password?</span><b><Link href="/portal/account">Set one in Account</Link></b></li>
            </ul>
          </section>
        )}
        <section className="ca-card">
          <h2>{projects.length > 1 ? "Your projects" : "Your project"} {projects.length > 1 ? <em>{projects.length}</em> : null}</h2>
          {projects.length === 0 ? <p className="ca-sub">Your project is being set up. The studio adds it here shortly. Questions? WhatsApp {CONTACT.phoneDisplay}.</p> : (
            <div className="ca-tablewrap pay-wrap"><table className="ca-table">
              <thead><tr><th>Project</th><th>Stage</th><th>Activity</th><th /></tr></thead>
              <tbody>
                {projects.map((p, i) => {
                  const n = STAGES.findIndex((s) => s.id === p.stage);
                  return (
                    <tr key={p.id}>
                      <td><Link href={`/portal/p/${p.id}`}><b>{p.title}</b></Link></td>
                      <td>{String(n + 1).padStart(2, "0")} · {STAGES[n]?.label}</td>
                      <td>{unread[i] ? <span className="ca-tag new">{unread[i]} new message{unread[i] > 1 ? "s" : ""}</span> : null} {due[i] ? <span className="pay-st due">{due[i]} to pay</span> : null}{!unread[i] && !due[i] ? <small>Nothing new</small> : null}</td>
                      <td><Link className="ca-btn" href={`/portal/p/${p.id}`}>Open</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </section>
      </div>
    </PortalShell>
  );
}
