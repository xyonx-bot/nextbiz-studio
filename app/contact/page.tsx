import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { Desk, ResponseLedger, Faq, QClose } from "@/components/sections/contact";
import { DeskForm } from "@/components/sections/contact-form";

export const metadata = { title: "Contact — NextBiz Studio" };

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
