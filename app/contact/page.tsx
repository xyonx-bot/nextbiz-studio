import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { Desk, ResponseLedger, Faq, QClose } from "@/components/sections/contact";
import { getSections } from "@/lib/config";
import contactSeed from "@/lib/seed/contact.json";

export const metadata = { title: "Contact — NextBiz Studio" };

// S5: seed ⊕ admin config; DB down/empty → seed fallback, page never breaks.
// v5 layout: the brief form is embedded inside the Desk opener — the
// deskForm section drives its content; disabled → the form column stays empty.
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const sections = await getSections("contact");
  const by = (k: string) => sections.find((s) => s.key === k)?.content;
  const formSection = sections.find((s) => s.key === "deskForm");

  return (
    <main className="shell" id="top">
      <Topbar current="/contact" />
      {sections.map((s) => {
        switch (s.key) {
          case "desk":
            return (
              <Desk
                key={s.key}
                content={by("desk") as typeof contactSeed.desk}
                form={formSection ? (by("deskForm") as typeof contactSeed.deskForm) : null}
              />
            );
          case "response": return <ResponseLedger key={s.key} content={by("response") as typeof contactSeed.response} />;
          case "faq": return <Faq key={s.key} content={by("faq") as typeof contactSeed.faq} />;
          case "qclose": return <QClose key={s.key} content={by("qclose") as typeof contactSeed.qclose} />;
          default: return null;
        }
      })}
      <Footer />
    </main>
  );
}
