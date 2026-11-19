import { redirect } from "next/navigation";
import { currentClient, listProjects } from "@/lib/portal";
import { PortalShell } from "@/components/portal/shell";
import { PasswordForm } from "@/components/portal/forms";
import { logoutClientAction } from "@/app/portal/actions";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const c = await currentClient();
  if (!c) redirect("/portal/login");
  const projects = await listProjects(c.id);
  return (
    <PortalShell client={c} projects={projects} current="account" crumb="Portal / Account" title="Your account">
      <div className="content pui-content">
        <div className="ca-grid">
          <div className="ca-col">
            <section className="ca-card">
              <h2>Your details</h2>
              <ul className="ca-kv">
                <li><span>Name</span><b>{c.name}</b></li>
                {c.business && <li><span>Business</span><b>{c.business}</b></li>}
                <li><span>Login email</span><b>{c.email}</b></li>
                {c.phone && <li><span>Phone</span><b>{c.phone}</b></li>}
                <li><span>Projects</span><b>{projects.length}</b></li>
              </ul>
              <p className="ca-sub">Something wrong here? Send us a message and we&apos;ll change it.</p>
            </section>
            <section className="ca-card">
              <div className="ca-row ca-between"><h2>{c.has_password ? "Change your password" : "Set a password"}</h2><span className="ca-sub">Optional</span></div>
              <PasswordForm hasPassword={c.has_password} />
            </section>
          </div>
          <div className="ca-col">
            <section className="ca-card">
              <h2>Ways to sign in</h2>
              <ul className="ca-kv">
                <li><span>Code by email<small className="pui-kvsub">A 6-digit code to {c.email}</small></span><b><span className="ca-tag ok">On</span></b></li>
                <li><span>Password<small className="pui-kvsub">Handy when email is slow</small></span><b><span className={`ca-tag${c.has_password ? " ok" : ""}`}>{c.has_password ? "On" : "Off"}</span></b></li>
                <li><span>Link from the studio<small className="pui-kvsub">Ask us on WhatsApp for a one-time link</small></span><b><span className="ca-tag ok">Any time</span></b></li>
              </ul>
            </section>
            <section className="ca-card">
              <h2>Log out</h2>
              <p className="ca-sub">On a shared computer? Log out when you&apos;re done. Your project stays exactly as it is.</p>
              <form action={logoutClientAction}><button type="submit" className="ca-btn danger">Log out of the portal</button></form>
            </section>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
