import { redirect } from "next/navigation";
import { currentClient, listProjects } from "@/lib/portal";
import { PortalShell } from "@/components/portal/shell";
import { PasswordForm } from "@/components/portal/forms";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const c = await currentClient();
  if (!c) redirect("/portal/login");
  const projects = await listProjects(c.id);
  return (
    <PortalShell client={c} projects={projects}>
      <div className="pt-top"><div><span className="pt-micro">Account</span><h1>Your account</h1></div></div>
      <div className="pt-grid2">
        <section className="pt-card">
          <h3>Your details</h3>
          <ul className="pt-kv"><li><span>Name</span><b>{c.name}</b></li>{c.business && <li><span>Business</span><b>{c.business}</b></li>}<li><span>Login email</span><b>{c.email}</b></li>{c.phone && <li><span>Phone</span><b>{c.phone}</b></li>}</ul>
          <p className="pt-small">Need to change these? Message the studio and we&apos;ll update them.</p>
        </section>
        <section className="pt-card">
          <h3>{c.has_password ? "Your password" : "Set a password (optional)"}</h3>
          <p className="pt-small">You can always log in with a code sent to your email. A password lets you log in even when email is slow.</p>
          <PasswordForm hasPassword={c.has_password} />
        </section>
      </div>
    </PortalShell>
  );
}
