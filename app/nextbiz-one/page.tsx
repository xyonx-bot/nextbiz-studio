import type { Metadata } from "next";
import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { Waitlist } from "@/components/sections/resources";
import resourcesSeed from "@/lib/seed/resources.json";
import { getSections } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NextBiz One — Join the Waitlist — NextBiz Studio",
  description: "One inbox for WhatsApp and Instagram: comment-to-DM automation, broadcasts and AI replies. In private beta — join the waitlist.",
};

/** /nextbiz-one — waitlist landing; content shared with the resources
 *  page's waitlist section (admin → Pages → Resources → NextBiz One waitlist). */
export default async function NextBizOnePage() {
  const sections = await getSections("resources");
  const c = sections.find((s) => s.key === "waitlist")?.content as typeof resourcesSeed.waitlist | undefined;
  return (
    <main className="shell" id="top">
      <Topbar current="/nextbiz-one" />
      <Waitlist content={c ?? resourcesSeed.waitlist} as="h1" />
      <Footer />
    </main>
  );
}
