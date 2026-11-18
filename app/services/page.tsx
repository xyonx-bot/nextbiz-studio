import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { Catalog, Dossiers, Spec, Compare, Arc, Route } from "@/components/sections/services";
import { getSections } from "@/lib/config";
import { getActiveDesign } from "@/lib/design";
import { CatalogF, DossiersF, SpecF, CompareF, ArcF, RouteF } from "@/components/sections/pages-floating";
import servicesSeed from "@/lib/seed/services.json";

// S5: seed ⊕ admin config; DB down/empty → seed fallback, page never breaks.
export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const sections = await getSections("services");
  const by = (k: string) => sections.find((s) => s.key === k)?.content;
  const soft = (await getActiveDesign()).design.style === "soft";

  return (
    <main className="shell" id="top">
      <Topbar current="/services" />
      {sections.map((s) => {
        switch (s.key) {
          case "catalog": return soft ? <CatalogF key={s.key} content={by("catalog") as typeof servicesSeed.catalog} /> : <Catalog key={s.key} content={by("catalog") as typeof servicesSeed.catalog} />;
          case "dossiers": return soft ? <DossiersF key={s.key} content={by("dossiers") as typeof servicesSeed.dossiers} /> : <Dossiers key={s.key} content={by("dossiers") as typeof servicesSeed.dossiers} />;
          case "spec": return soft ? <SpecF key={s.key} content={by("spec") as typeof servicesSeed.spec} /> : <Spec key={s.key} content={by("spec") as typeof servicesSeed.spec} />;
          case "compare": return soft ? <CompareF key={s.key} content={by("compare") as typeof servicesSeed.compare} /> : <Compare key={s.key} content={by("compare") as typeof servicesSeed.compare} />;
          case "arc": return soft ? <ArcF key={s.key} content={by("arc") as typeof servicesSeed.arc} /> : <Arc key={s.key} content={by("arc") as typeof servicesSeed.arc} />;
          case "route": return soft ? <RouteF key={s.key} content={by("route") as typeof servicesSeed.route} /> : <Route key={s.key} content={by("route") as typeof servicesSeed.route} />;
          default: return null;
        }
      })}
      <Footer />
    </main>
  );
}
