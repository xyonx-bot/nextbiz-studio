import Link from "next/link";
import { redirect } from "next/navigation";
import { currentClient, listProjects } from "@/lib/portal";
import { PortalShell } from "@/components/portal/shell";

export const dynamic = "force-dynamic";

export default async function PortalHome({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const c = await currentClient();
  if (!c) redirect("/portal/login");
  const projects = await listProjects(c.id);
  const sp = await searchParams;
  if (projects.length === 1 && !sp.welcome) redirect(`/portal/p/${projects[0].id}`);
  return (
    <PortalShell client={c} projects={projects}>
      <div className="pt-top"><div><span className="pt-micro">Welcome</span><h1>Hi {c.name.split(/\s+/)[0]}.</h1></div></div>
      {sp.welcome && (
        <div className="pt-card pt-welcome">
          <h3>You&apos;re in. Welcome to your client portal.</h3>
          <p>Next time, log in at <b>nextbizstudio.com/portal</b> with your email. We&apos;ll send a 6-digit code. If you&apos;d rather use a password, you can <Link href="/portal/account">set one in Account</Link>.</p>
          {projects[0] && <Link className="pt-btn" href={`/portal/p/${projects[0].id}`}>Open my project →</Link>}
        </div>
      )}
      {projects.length === 0 ? (
        <div className="pt-card"><h3>Your project is being set up.</h3><p>The studio will add it here shortly. Questions? WhatsApp +91 98836 08843.</p></div>
      ) : !sp.welcome && (
        <div className="pt-grid2">{projects.map((p) => <Link key={p.id} className="pt-card pt-projcard" href={`/portal/p/${p.id}`}><span className="pt-micro">{p.stage}</span><h3>{p.title}</h3><span className="pt-small">Open →</span></Link>)}</div>
      )}
    </PortalShell>
  );
}
