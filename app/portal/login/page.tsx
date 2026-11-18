import { redirect } from "next/navigation";
import { currentClient } from "@/lib/portal";
import { LoginForm } from "@/components/portal/login-form";

export const dynamic = "force-dynamic";

export default async function PortalLogin({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  if (await currentClient()) redirect("/portal");
  const sp = await searchParams;
  return (
    <div className="pt-app pt-loginpage">
      <header className="pt-bar slim">
        <a className="pt-cell pt-brandcell" href="/" aria-label="NextBiz Studio — home">
          <img src="/brand/nb-logo-web.png" alt="" width={34} height={26} />
          <span><b>NextBiz Studio</b><small>Client portal</small></span>
        </a>
        <div className="pt-cell pt-projcell" />
        <a className="pt-cell pt-backcell" href="/">Back to the site →</a>
      </header>

      <main className="pt-wrap pt-login">
        <section className="pt-login-l">
          <span className="pt-micro">For NextBiz clients</span>
          <h1>Your project, <span className="pt-mark">always in view.</span></h1>
          <ol className="pt-promise">
            <li><span className="pt-railno">01</span><div><b>Where it stands</b><p>The current stage, what&apos;s next, and the dates we agreed.</p></div></li>
            <li><span className="pt-railno">02</span><div><b>Talk to the team</b><p>Message the people doing the work. No lost WhatsApp threads.</p></div></li>
            <li><span className="pt-railno">03</span><div><b>One shared folder</b><p>Designs, files and links from us, and everything you send.</p></div></li>
          </ol>
        </section>
        <section className="pt-login-r"><LoginForm expired={sp.link === "expired"} /></section>
      </main>
    </div>
  );
}
