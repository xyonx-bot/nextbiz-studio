import Link from "next/link";
import { redirect } from "next/navigation";
import { STAGES, currentClient, listProjects } from "@/lib/portal";
import { PortalHead, PortalShell } from "@/components/portal/shell";
import { CONTACT } from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function PortalHome({ searchParams }: { searchParams: Promise<{ welcome?: string; all?: string }> }) {
  const c = await currentClient();
  if (!c) redirect("/portal/login");
  const projects = await listProjects(c.id);
  const sp = await searchParams;
  if (projects.length === 1 && !sp.welcome) redirect(`/portal/p/${projects[0].id}`);
  const first = c.name.split(/\s+/)[0];
  const stageNo = (s: string) => STAGES.findIndex((x) => x.id === s) + 1;

  return (
    <PortalShell client={c} projects={projects}>
      <PortalHead micro={sp.welcome ? "Welcome" : "Your projects"} title={sp.welcome ? <>You&apos;re in, {first}.</> : <>Hi {first}.</>}
        sub={sp.welcome ? "This is your client portal. Everything about your project lives here: where it stands, our updates, messages and files." : "Pick a project to open it."} />

      {sp.welcome && (
        <section className="pt-sec" aria-labelledby="h-next">
          <div className="pt-sechead"><span className="pt-no">01</span><h2 id="h-next">Next time you visit</h2></div>
          <ol className="pt-steps">
            <li><span className="pt-railno">01</span><b>Go to nextbizstudio.com/portal</b><p>Bookmark it. It works on your phone too.</p></li>
            <li><span className="pt-railno">02</span><b>Enter your email</b><p>We send a 6-digit code to {c.email}. No password needed.</p></li>
            <li><span className="pt-railno">03</span><b>Prefer a password?</b><p>Set one in <Link href="/portal/account">Account</Link>. Codes keep working too.</p></li>
          </ol>
        </section>
      )}

      {projects.length === 0 ? (
        <section className="pt-sec"><p className="pt-quiet">Your project is being set up. The studio adds it here shortly. Questions? WhatsApp {CONTACT.phoneDisplay}.</p></section>
      ) : (
        <section className="pt-sec" aria-labelledby="h-proj">
          <div className="pt-sechead"><span className="pt-no">{sp.welcome ? "02" : "01"}</span><h2 id="h-proj">{projects.length > 1 ? "Your projects" : "Your project"}</h2></div>
          <ul className="pt-projlist">
            {projects.map((p, i) => (
              <li key={p.id}>
                <Link href={`/portal/p/${p.id}`}>
                  <span className="pt-railno">{String(i + 1).padStart(2, "0")}</span>
                  <b>{p.title}</b>
                  <span className="pt-stagetag">{String(stageNo(p.stage)).padStart(2, "0")} · {STAGES[stageNo(p.stage) - 1]?.label ?? p.stage}</span>
                  <span className="pt-arrow">Open →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PortalShell>
  );
}
