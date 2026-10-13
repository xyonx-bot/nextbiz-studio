import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { Catalog, Dossiers, Spec, Compare, Arc, Route } from "@/components/sections/services";

export default function ServicesPage() {
  return (
    <main className="shell" id="top">
      <Topbar current="/services" />
      <Catalog />
      <Dossiers />
      <Spec />
      <Compare />
      <Arc />
      <Route />
      <Footer />
    </main>
  );
}
