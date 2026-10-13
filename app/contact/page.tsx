import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { Desk, DeskForm, ResponseLedger, Faq, QClose } from "@/components/sections/contact";

export default function ContactPage() {
  return (
    <main className="shell" id="top">
      <Topbar current="/contact" />
      <Desk />
      <DeskForm />
      <ResponseLedger />
      <Faq />
      <QClose />
      <Footer />
    </main>
  );
}
