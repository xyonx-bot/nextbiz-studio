import { countLeads } from "@/lib/db";
import { PAGES, PAGE_BY_KEY, getPageRows, seedContentFor } from "@/lib/config";
import { AdminShell } from "@/components/admin/shell";
import { PagesConfigurator } from "@/components/admin/pages-configurator";
import { ExternalLink, Plus } from "@/components/admin/icons";

/**
 * ADMIN PAGES CONFIGURATOR (S5) — ported 1:1 from Mira's wireframe:
 *   ~/workspaces/mira/prototypes/nextbizstudio/admin/pages/wireframe.html
 * Server side: resolve the selected page (?p=, default home), materialize
 * its rows on first touch, and hand the client everything it needs — the
 * full page inventory, the on-page rows (id + seed-merged content), and
 * the registry remainder. All mutations go through /api/config/*.
 */
export const dynamic = "force-dynamic";

export default async function PagesAdmin({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  const pageKey = p && PAGE_BY_KEY[p] ? p : "home";
  const inv = PAGE_BY_KEY[pageKey];
  const [leadCount, rows] = await Promise.all([countLeads(), getPageRows(pageKey)]);

  // on-page rows with seed-merged content (the editor saves wholesale —
  // editing the merged object and PATCHing it is the contract, technical-plan §3)
  const sections = rows.map((r) => {
    const merged = seedContentFor(pageKey, r.section_key, r.content);
    return {
      id: r.id,
      key: r.section_key,
      label: inv.sections.find((s) => s.key === r.section_key)?.label ?? r.section_key,
      sortOrder: r.sort_order,
      enabled: r.enabled,
      content: merged,
    };
  });

  const legalLocked = sections.length === 1 && sections[0].key === "doc";

  return (
    <AdminShell
      leadCount={leadCount}
      pageCount={PAGES.length}
      current="pages"
      crumb="Desk / Pages"
      title="Site pages"
      acts={
        <>
          <a
            className="ghost"
            href={PAGE_BY_KEY[pageKey].path}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink /> View site
          </a>
          {!legalLocked && (
            <button className="action" type="button" id="pages-add-act">
              <Plus /> Add section
            </button>
          )}
        </>
      }
    >
      <PagesConfigurator
        pages={PAGES.map((pg) => ({ key: pg.key, title: pg.title }))}
        pageKey={pageKey}
        pagePath={inv.path}
        inventory={inv.sections}
        sections={sections}
        legalLocked={legalLocked}
      />
    </AdminShell>
  );
}
