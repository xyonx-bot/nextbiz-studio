import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import {
  AboutMasthead, ReadingGrid, Story, Defs, Method, People, AboutClose,
} from "@/components/sections/about";

export default function AboutPage() {
  return (
    <main className="shell" id="top">
      <Topbar current="/about" />
      <AboutMasthead />
      <ReadingGrid label="Our point of view" index="02 / ON THIS PAGE">
        <Story />
        <Defs />
      </ReadingGrid>
      <Method />
      <ReadingGrid label="The people" index="05 / WHO DOES THE WORK">
        <People />
      </ReadingGrid>
      <AboutClose />
      <Footer />
    </main>
  );
}
