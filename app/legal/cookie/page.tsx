import { LegalPage } from "@/components/sections/legal";
import type { LegalDoc } from "@/components/sections/types";
import doc from "@/lib/seed/legal/cookie.json";

export const metadata = { title: "Cookie Policy — NextBiz Studio" };

export default function Page() {
  return <LegalPage doc={doc as LegalDoc} current="/legal/cookie" />;
}
