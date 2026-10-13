import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { Register, Entries, ProcessNotes, Compass } from "@/components/sections/projects";

export default function ProjectsPage() {
  return (
    <main className="shell" id="top">
      <Topbar current="/projects" />
      <Register />
      <Entries />
      <ProcessNotes />
      <Compass />
      <Footer />
    </main>
  );
}
