import { redirect } from "next/navigation";
import { currentClient } from "@/lib/portal";
import { LoginForm } from "@/components/portal/login-form";

export const dynamic = "force-dynamic";

export default async function PortalLogin({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  if (await currentClient()) redirect("/portal");
  const sp = await searchParams;
  return (
    <main className="pt-login">
      <aside className="pt-login-art">
        <a className="pt-brand" href="/"><img src="/brand/nb-logo-light-web.png" alt="" width={30} height={23} /> NextBiz Studio</a>
        <h2>Your project,<br /><em>always in view.</em></h2>
        <ul>
          <li>See where your project is, every day</li>
          <li>Message the person doing the work</li>
          <li>All your files and resources in one place</li>
        </ul>
      </aside>
      <section className="pt-login-main"><LoginForm expired={sp.link === "expired"} /></section>
    </main>
  );
}
