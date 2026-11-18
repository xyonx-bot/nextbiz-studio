import { redirect } from "next/navigation";
import { currentClient, listProjects } from "@/lib/portal";
import { PortalHead, PortalShell } from "@/components/portal/shell";
import { PasswordForm } from "@/components/portal/forms";
import { logoutClientAction } from "@/app/portal/actions";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const c = await currentClient();
  if (!c) redirect("/portal/login");
  const projects = await listProjects(c.id);
  return (
    <PortalShell client={c} projects={projects}>
      <PortalHead compact micro="Account" title="Your account" sub="How you sign in, and the details we have for you." />

      <div className="pt-split even">
        <section className="pt-sec" aria-labelledby="h-det">
          <div className="pt-sechead"><span className="pt-no">01</span><h2 id="h-det">Your details</h2></div>
          <dl className="pt-facts big">
            <div><dt>Name</dt><dd>{c.name}</dd></div>
            {c.business && <div><dt>Business</dt><dd>{c.business}</dd></div>}
            <div><dt>Login email</dt><dd>{c.email}</dd></div>
            {c.phone && <div><dt>Phone</dt><dd>{c.phone}</dd></div>}
            <div><dt>Projects</dt><dd>{projects.length}</dd></div>
          </dl>
          <p className="pt-small">Something wrong here? Send us a message and we&apos;ll change it.</p>
          <form action={logoutClientAction} className="pt-logout"><button type="submit" className="pt-btn ink">Log out of the portal</button></form>
        </section>

        <section className="pt-sec" aria-labelledby="h-in">
          <div className="pt-sechead"><span className="pt-no">02</span><h2 id="h-in">Ways to sign in</h2></div>
          <ul className="pt-methods">
            <li className="on"><b>Code by email</b><span>A 6-digit code sent to {c.email}. Always on.</span><em>On</em></li>
            <li className={c.has_password ? "on" : ""}><b>Password</b><span>Handy when email is slow to arrive.</span><em>{c.has_password ? "On" : "Off"}</em></li>
            <li className="on"><b>Link from the studio</b><span>Ask us on WhatsApp for a one-time login link.</span><em>Any time</em></li>
          </ul>
        </section>
      </div>

      <section className="pt-sec" aria-labelledby="h-pw">
        <div className="pt-sechead"><span className="pt-no">03</span><h2 id="h-pw">{c.has_password ? "Change your password" : "Set a password"}</h2><span className="pt-aside">Optional</span></div>
        <PasswordForm hasPassword={c.has_password} />
      </section>
    </PortalShell>
  );
}
