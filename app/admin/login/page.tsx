import { Suspense } from "react";
import { LoginForm } from "./login-form";

/**
 * S4 (P1.5) — admin login. Standalone route (no layout chrome): the gate
 * itself must render even when everything else is locked.
 */
export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  return (
    <main className="admin-login">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
