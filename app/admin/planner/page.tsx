import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { isAuthenticated } from "@/lib/auth";
import { countLeads } from "@/lib/db";
import { getPricing } from "@/lib/planner";
import { AdminShell } from "@/components/admin/shell";
import { PlannerPricing } from "@/components/admin/planner-pricing";

/** Admin → Planner: the prices and timelines behind /plan. */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Planner — Studio Desk | NextBiz Studio" };

export default async function PlannerAdminPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const [pricing, total] = await Promise.all([getPricing(), countLeads()]);
  return (
    <AdminShell leadCount={total} current="planner" crumb="Studio desk · Planner" title="Project planner">
      <PlannerPricing initial={pricing} />
    </AdminShell>
  );
}
