import { redirect } from "next/navigation";
import { currentClient } from "@/lib/portal";
import { LoginForm } from "@/components/portal/login-form";

export const dynamic = "force-dynamic";

/** Client login — the same gate as the Studio Desk login: top strip, one centered card, foot strip. */
export default async function PortalLogin({ searchParams }: { searchParams: Promise<{ link?: string }> }) {
  if (await currentClient()) redirect("/portal");
  const sp = await searchParams;
  return (
    <div className="adminui pui-loginpage">
      <div className="topstrip">
        <a className="brand" href="/"><img className="logo-img" src="/brand/nb-logo-web.png" alt="" width={21} height={16} /> NextBiz Studio <small>Client portal</small></a>
        <a className="back" href="/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M11 19l-7-7 7-7" /></svg> Back to site</a>
      </div>
      <main className="stage"><LoginForm expired={sp.link === "expired"} /></main>
      <div className="footstrip">
        <span>© 2026 NextBiz Studio · Client portal</span>
        <a href="https://wa.me/919883608843" target="_blank" rel="noreferrer">Need help? WhatsApp +91 98836 08843</a>
      </div>
    </div>
  );
}
