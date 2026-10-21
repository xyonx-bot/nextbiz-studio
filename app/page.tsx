import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import {
  Hero, Partners, About, ServicesSplit, Work, Industries, Testimonial, Team, ContactBand,
} from "@/components/sections/home";
import { getSections } from "@/lib/config";
import homeSeed from "@/lib/seed/home.json";

// S5: sections resolve as seed ⊕ admin config (dynamic — config edits must
// reflect without a redeploy). DB down/empty → seed fallback, page never breaks.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sections = await getSections("home");
  const by = (k: string) => sections.find((s) => s.key === k)?.content;

  return (
    <main className="shell">
      <Topbar current="/" />
      {sections.map((s) => {
        switch (s.key) {
          case "hero": return <Hero key={s.key} content={by("hero") as typeof homeSeed.hero} />;
          case "partners": return <Partners key={s.key} content={by("partners") as typeof homeSeed.partners} />;
          case "about": return <About key={s.key} content={by("about") as typeof homeSeed.about} />;
          case "services": return <ServicesSplit key={s.key} content={by("services") as typeof homeSeed.services} />;
          case "work": return <Work key={s.key} content={by("work") as typeof homeSeed.work} />;
          case "industries": return <Industries key={s.key} content={by("industries") as typeof homeSeed.industries} />;
          case "testimonial": return <Testimonial key={s.key} content={by("testimonial") as typeof homeSeed.testimonial} />;
          case "team": return <Team key={s.key} content={by("team") as typeof homeSeed.team} />;
          case "contactBand": return <ContactBand key={s.key} content={by("contactBand") as typeof homeSeed.contactBand} />;
          default: return null;
        }
      })}
      <Footer />
    </main>
  );
}
