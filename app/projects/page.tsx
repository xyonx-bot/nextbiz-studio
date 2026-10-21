import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { Register, Entries, ProcessNotes, Compass } from "@/components/sections/projects";
import { getSections } from "@/lib/config";
import projectsSeed from "@/lib/seed/projects.json";

// S5: seed ⊕ admin config; DB down/empty → seed fallback, page never breaks.
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const sections = await getSections("projects");
  const by = (k: string) => sections.find((s) => s.key === k)?.content;

  return (
    <main className="shell" id="top">
      <Topbar current="/projects" />
      {sections.map((s) => {
        switch (s.key) {
          case "register": return <Register key={s.key} content={by("register") as typeof projectsSeed.register} />;
          case "entries": return <Entries key={s.key} content={by("entries") as typeof projectsSeed.entries} />;
          case "process": return <ProcessNotes key={s.key} content={by("process") as typeof projectsSeed.process} />;
          case "compass": return <Compass key={s.key} content={by("compass") as typeof projectsSeed.compass} />;
          default: return null;
        }
      })}
      <Footer />
    </main>
  );
}
