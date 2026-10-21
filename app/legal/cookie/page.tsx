import { LegalPage } from "@/components/sections/legal";
import type { LegalDoc } from "@/components/sections/types";
import { getSections } from "@/lib/config";
import seedDoc from "@/lib/seed/legal/cookie.json";

export const metadata = { title: "Cookie Policy — NextBiz Studio" };

// S5: seed ⊕ admin config; DB down/empty → seed fallback.
export const dynamic = "force-dynamic";

export default async function Page() {
  const [section] = await getSections("legal/cookie");
  const doc = (section?.content ?? seedDoc) as LegalDoc;
  return <LegalPage doc={doc} current="/legal/cookie" />;
}
