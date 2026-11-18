import type { Metadata } from "next";
import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { Register, Entries, ProcessNotes, Compass } from "@/components/sections/projects";
import type { ProjectEntry } from "@/components/sections/types";
import { getSections } from "@/lib/config";
import { getActiveDesign } from "@/lib/design";
import { RegisterF, EntriesF, ProcessF, CloseF } from "@/components/sections/pages-floating";
import projectsSeed from "@/lib/seed/projects.json";

// S5: seed ⊕ admin config; DB down/empty → seed fallback, page never breaks.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projects — NextBiz Studio",
  description: "Selected work from NextBiz Studio — live projects, each with its own case study.",
};

export default async function ProjectsPage() {
  const sections = await getSections("projects");
  const by = (k: string) => sections.find((s) => s.key === k)?.content;
  const register = by("register") as typeof projectsSeed.register | undefined;
  const soft = (await getActiveDesign()).design.style === "soft";

  return (
    <main className="shell" id="top">
      <Topbar current="/projects" />
      {sections.map((s) => {
        switch (s.key) {
          case "register": return soft ? <RegisterF key={s.key} content={register} /> : <Register key={s.key} content={register} />;
          case "entries": return soft ? <EntriesF key={s.key} content={s.content as ProjectEntry[]} note={register?.note} /> : <Entries key={s.key} content={s.content as ProjectEntry[]} note={register?.note} />;
          case "process": return soft ? <ProcessF key={s.key} content={by("process") as typeof projectsSeed.process} /> : <ProcessNotes key={s.key} content={by("process") as typeof projectsSeed.process} />;
          case "compass": if (soft) { const c = (by("compass") as typeof projectsSeed.compass | undefined) ?? projectsSeed.compass; return <CloseF key={s.key} micro={c.micro} ask={<>{c.ask[0]} {c.ask[1]}</>} aside={c.aside} cta={c.cta} href="/contact" />; } return <Compass key={s.key} content={by("compass") as typeof projectsSeed.compass} />;
          default: return null;
        }
      })}
      <Footer />
    </main>
  );
}
