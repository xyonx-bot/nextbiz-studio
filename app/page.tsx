import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import {
  Hero, Partners, About, ServicesSplit, Work, Industries, Testimonial, Team, ContactBand,
} from "@/components/sections/home";

export default function HomePage() {
  return (
    <main className="shell">
      <Topbar />
      <Hero />
      <Partners />
      <About />
      <ServicesSplit />
      <Work />
      <Industries />
      <Testimonial />
      <Team />
      <ContactBand />
      <Footer />
    </main>
  );
}
