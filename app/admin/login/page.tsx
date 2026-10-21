import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { ArrowLeft } from "@/components/admin/icons";

/**
 * S4 (P1.5) — admin login, ported from Mira's admin/login/wireframe.html:
 * top strip (brand back to the public site) + centered ledger-card on the
 * desk canvas + foot strip. NO sidebar — the gate renders alone.
 */
export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <>
      <div className="topstrip">
        <Link className="brand" href="/"><span className="logo-ph">NB</span> NextBiz Studio</Link>
        <Link className="back" href="/">← Back to site <ArrowLeft size={12} /></Link>
      </div>
      <main className="stage">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </main>
      <div className="footstrip">
        <span>© 2026 NextBiz Studio · Admin area</span>
        <Link href="/contact">Need help? Contact the owner</Link>
      </div>
    </>
  );
}
