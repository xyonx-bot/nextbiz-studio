import type { Metadata } from "next";
import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { Register } from "@/components/sections/projects";
import { LibrarySection, DmBand, Waitlist } from "@/components/sections/resources";
import type { ResourceEntry } from "@/components/sections/types";
import { getSections } from "@/lib/config";
import resourcesSeed from "@/lib/seed/resources.json";
import projectsSeed from "@/lib/seed/projects.json";

// seed ⊕ admin config; DB down/empty → seed fallback, page never breaks.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Free Resources — AI Prompts, Notion Templates & n8n Workflows — NextBiz Studio",
  description:
    "A free library of AI prompt packs, Notion templates, n8n workflows and automation guides from NextBiz Studio.",
};

export default async function ResourcesPage() {
  const sections = await getSections("resources");
  const by = (k: string) => sections.find((s) => s.key === k)?.content;

  return (
    <main className="shell" id="top">
      <Topbar current="/resources" />
      {sections.map((s) => {
        switch (s.key) {
          case "register": return <Register key={s.key} content={by("register") as typeof projectsSeed.register} />;
          case "entries": return <LibrarySection key={s.key} entries={s.content as ResourceEntry[]} />;
          case "dmBand": return <DmBand key={s.key} content={by("dmBand") as typeof resourcesSeed.dmBand} />;
          case "waitlist": return <Waitlist key={s.key} content={by("waitlist") as typeof resourcesSeed.waitlist} />;
          default: return null;
        }
      })}
      <Footer />
    </main>
  );
}
