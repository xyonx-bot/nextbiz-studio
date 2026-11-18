import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import {
  Hero, Partners, About, ServicesSplit, Work, Industries, Testimonial, Team, ContactBand, PlanStart, IndustriesList,
} from "@/components/sections/home";
import { HomeLibrary, Waitlist } from "@/components/sections/resources";
import { getResourceEntries, getSections } from "@/lib/config";
import { getActiveDesign } from "@/lib/design";
import { AboutF, ContactBandF, HeroF, IndustriesF, PartnersF, ServicesF, WorkF } from "@/components/sections/home-floating";
import { PlanSentence } from "@/components/sections/plan-sentence";
import homeSeed from "@/lib/seed/home.json";

// S5: sections resolve as seed ⊕ admin config (dynamic — config edits must
// reflect without a redeploy). DB down/empty → seed fallback, page never breaks.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sections = await getSections("home");
  const by = (k: string) => sections.find((s) => s.key === k)?.content;
  const resources = sections.some((s) => s.key === "library") ? await getResourceEntries() : [];
  // Soft (floating) has its own layout for each section; Editorial (hairline) keeps the original components
  const design = (await getActiveDesign()).design;
  const soft = design.style === "soft";
  const sentence = !soft && design.editorial.planner === "sentence";

  return (
    <main className="shell">
      <Topbar current="/" />
      {sections.map((s) => {
        switch (s.key) {
          case "hero": return soft ? <HeroF key={s.key} content={by("hero") as typeof homeSeed.hero} /> : <Hero key={s.key} content={by("hero") as typeof homeSeed.hero} />;
          case "partners": return soft ? <PartnersF key={s.key} content={by("partners") as typeof homeSeed.partners} /> : <Partners key={s.key} content={by("partners") as typeof homeSeed.partners} />;
          case "about": return soft ? <AboutF key={s.key} content={by("about") as typeof homeSeed.about} /> : <About key={s.key} content={by("about") as typeof homeSeed.about} />;
          case "services": return soft ? <ServicesF key={s.key} content={by("services") as typeof homeSeed.services} /> : <ServicesSplit key={s.key} content={by("services") as typeof homeSeed.services} />;
          case "work": return soft ? <WorkF key={s.key} content={by("work") as typeof homeSeed.work} /> : <Work key={s.key} content={by("work") as typeof homeSeed.work} />;
          case "library": return <HomeLibrary key={s.key} content={by("library") as typeof homeSeed.library} entries={resources} />;
          case "waitlist": return <Waitlist key={s.key} content={by("waitlist") as typeof homeSeed.waitlist} />;
          case "planner": return sentence ? <PlanSentence key={s.key} content={by("planner") as typeof homeSeed.planner} /> : <PlanStart key={s.key} content={by("planner") as typeof homeSeed.planner} />;
          case "industries": return soft ? <IndustriesF key={s.key} content={by("industries") as typeof homeSeed.industries} /> : design.editorial.industries === "list" ? <IndustriesList key={s.key} content={by("industries") as typeof homeSeed.industries} /> : <Industries key={s.key} content={by("industries") as typeof homeSeed.industries} />;
          case "testimonial": return <Testimonial key={s.key} content={by("testimonial") as typeof homeSeed.testimonial} />;
          case "team": return <Team key={s.key} content={by("team") as typeof homeSeed.team} />;
          case "contactBand": return soft ? <ContactBandF key={s.key} content={by("contactBand") as typeof homeSeed.contactBand} /> : <ContactBand key={s.key} content={by("contactBand") as typeof homeSeed.contactBand} />;
          default: return null;
        }
      })}
      <Footer />
    </main>
  );
}
