import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { listLeads } from "@/lib/db";
import { Inbox } from "./inbox";
import { logoutAction } from "./actions";

/**
 * S4 (P1.6 + P1.7) — leads inbox. Server component: data lives server-side,
 * only the rendered table ships to the client. Defense in depth — middleware
 * is the gate, but the page re-checks the session itself (a broken matcher
 * must not leak leads).
 */
export const dynamic = "force-dynamic";

export default async function AdminInboxPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const leads = await listLeads();

  return (
    <main className="admin-shell">
      <header className="admin-top">
        <div>
          <p className="admin-micro">NextBiz Studio</p>
          <h1>Leads inbox</h1>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="admin-logout">
            Log out
          </button>
        </form>
      </header>

      <p className="admin-count" data-testid="lead-count">
        {leads.length} lead{leads.length === 1 ? "" : "s"} captured
      </p>

      <Inbox leads={leads} />
    </main>
  );
}
