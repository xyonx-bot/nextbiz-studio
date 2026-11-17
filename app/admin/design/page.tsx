import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { isAuthenticated } from "@/lib/auth";
import { countLeads } from "@/lib/db";
import { getDesignHistory, getDraftDesign, getPublishedDesign } from "@/lib/design";
import { AdminShell } from "@/components/admin/shell";
import { DesignStudio } from "@/components/admin/design-studio";

/** Admin → Design: accent colour, badges, buttons, corners, headline highlight, announcement bar. */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Design — Studio Desk | NextBiz Studio" };

export default async function DesignPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const [draft, published, history, total] = await Promise.all([getDraftDesign(), getPublishedDesign(), getDesignHistory(), countLeads()]);
  return (
    <AdminShell leadCount={total} current="design" crumb="Studio desk · Design" title="Design">
      <DesignStudio draft={draft} published={published} history={history} />
    </AdminShell>
  );
}
