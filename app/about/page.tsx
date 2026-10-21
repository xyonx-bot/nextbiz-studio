import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import {
  AboutMasthead, ReadingGrid, Story, Defs, Method, People, AboutClose,
} from "@/components/sections/about";
import { getSections } from "@/lib/config";
import aboutSeed from "@/lib/seed/about.json";

// S5: seed ⊕ admin config; DB down/empty → seed fallback.
// ReadingGrid wrappers are structural chrome from Mira's wireframe —
// sections inside them stay configurable (content/enable); cross-grid
// reorder is fixed by that structure (configurator UI design pending).
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const sections = await getSections("about");
  const on = (k: string) => sections.some((s) => s.key === k);
  const by = (k: string) => sections.find((s) => s.key === k)?.content;

  return (
    <main className="shell" id="top">
      <Topbar current="/about" />
      {on("masthead") && <AboutMasthead content={by("masthead") as typeof aboutSeed.masthead} />}
      <ReadingGrid label="Our point of view" index="02 / ON THIS PAGE">
        {on("story") && <Story content={by("story") as typeof aboutSeed.story} />}
        {on("defs") && <Defs content={by("defs") as typeof aboutSeed.defs} />}
      </ReadingGrid>
      {on("method") && <Method content={by("method") as typeof aboutSeed.method} />}
      <ReadingGrid label="The people" index="05 / WHO DOES THE WORK">
        {on("people") && <People content={by("people") as typeof aboutSeed.people} />}
      </ReadingGrid>
      {on("close") && <AboutClose content={by("close") as typeof aboutSeed.close} />}
      <Footer />
    </main>
  );
}
