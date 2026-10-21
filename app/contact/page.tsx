import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { Desk, ResponseLedger, Faq, QClose } from "@/components/sections/contact";

export const metadata = { title: "Contact — NextBiz Studio" };

export default function ContactPage() {
  // v5 (Oct 20 bundle): the brief form is embedded inside Desk Section A —
  // no separate DeskForm section anymore.
  return (
    <main className="shell" id="top">
      <Topbar current="/contact" />
      <Desk />
      <ResponseLedger />
      <Faq />
      <QClose />
      <Footer />
    </main>
  );
}
