import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { ResourceDetail } from "@/components/sections/resources";
import { getResourceEntries } from "@/lib/config";
import { isPublished } from "@/lib/resources";

/** /resources/[slug] — reads the same resources.entries list as the
 *  library grid. Drafts and unknown slugs → 404. */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const live = (await getResourceEntries()).filter(isPublished);
  const i = live.findIndex((e) => e.slug.trim() === slug);
  if (i < 0) return null;
  return { entry: live[i], next: live.length > 1 ? live[(i + 1) % live.length] : undefined };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await load((await params).slug);
  if (!found) return { title: "Resource not found — NextBiz Studio" };
  const e = found.entry;
  return {
    title: `${e.title} — Free Resource — NextBiz Studio`,
    description: e.summary,
    openGraph: { title: `${e.title} — NextBiz Studio`, description: e.summary, images: e.cover ? [e.cover] : [] },
  };
}

export default async function ResourcePage({ params }: Props) {
  const found = await load((await params).slug);
  if (!found) notFound();
  return (
    <main className="shell" id="top">
      <Topbar current="/resources" />
      <ResourceDetail entry={found.entry} next={found.next} />
      <Footer />
    </main>
  );
}
