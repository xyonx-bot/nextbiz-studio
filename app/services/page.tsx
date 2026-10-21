import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { Catalog, Dossiers, Spec, Compare, Arc, Route } from "@/components/sections/services";
import { getSections } from "@/lib/config";
import servicesSeed from "@/lib/seed/services.json";

// S5: seed ⊕ admin config; DB down/empty → seed fallback, page never breaks.
export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const sections = await getSections("services");
  const by = (k: string) => sections.find((s) => s.key === k)?.content;

  return (
    <main className="shell" id="top">
      <Topbar current="/services" />
      {sections.map((s) => {
        switch (s.key) {
          case "catalog": return <Catalog key={s.key} content={by("catalog") as typeof servicesSeed.catalog} />;
          case "dossiers": return <Dossiers key={s.key} content={by("dossiers") as typeof servicesSeed.dossiers} />;
          case "spec": return <Spec key={s.key} content={by("spec") as typeof servicesSeed.spec} />;
          case "compare": return <Compare key={s.key} content={by("compare") as typeof servicesSeed.compare} />;
          case "arc": return <Arc key={s.key} content={by("arc") as typeof servicesSeed.arc} />;
          case "route": return <Route key={s.key} content={by("route") as typeof servicesSeed.route} />;
          default: return null;
        }
      })}
      <Footer />
    </main>
  );
}
