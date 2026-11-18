import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { Desk, ResponseLedger, Faq, QClose } from "@/components/sections/contact";
import { getSections } from "@/lib/config";
import { getActiveDesign } from "@/lib/design";
import { ContactHeroF, ResponseF, FaqF, CloseF } from "@/components/sections/pages-floating";
import { CONTACT } from "@/lib/content";
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
  const soft = (await getActiveDesign()).design.style === "soft";

  return (
    <main className="shell" id="top">
      <Topbar current="/contact" />
      {sections.map((s) => {
        switch (s.key) {
          case "desk":
            if (soft) return <ContactHeroF key={s.key} content={by("desk") as typeof contactSeed.desk} form={formSection ? (by("deskForm") as typeof contactSeed.deskForm) : null} />;
            return (
              <Desk
                key={s.key}
                content={by("desk") as typeof contactSeed.desk}
                form={formSection ? (by("deskForm") as typeof contactSeed.deskForm) : null}
              />
            );
          case "response": return soft ? <ResponseF key={s.key} content={by("response") as typeof contactSeed.response} /> : <ResponseLedger key={s.key} content={by("response") as typeof contactSeed.response} />;
          case "faq": return soft ? <FaqF key={s.key} content={by("faq") as typeof contactSeed.faq} /> : <Faq key={s.key} content={by("faq") as typeof contactSeed.faq} />;
          case "qclose": if (soft) { const q = (by("qclose") as typeof contactSeed.qclose | undefined) ?? contactSeed.qclose; return <CloseF key={s.key} micro={q.micro} ask={<>{q.ask[0]} {q.ask[1]}</>} aside={q.aside} cta={q.cta} href={`tel:${CONTACT.phoneTel}`} />; } return <QClose key={s.key} content={by("qclose") as typeof contactSeed.qclose} />;
          default: return null;
        }
      })}
      <Footer />
    </main>
  );
}
