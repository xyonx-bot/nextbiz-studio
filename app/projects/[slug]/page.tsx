import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { CaseStudy, Compass, isLive } from "@/components/sections/projects";
import type { ProjectEntry } from "@/components/sections/types";
import { getProjectEntries, getSections } from "@/lib/config";
import projectsSeed from "@/lib/seed/projects.json";

/**
 * /projects/[slug] — one project's case study. Reads the SAME
 * projects.entries list the /projects grid renders (seed ⊕ admin override),
 * so an edit in admin → Pages → Projects → Case entries updates both, live.
 * Placeholder entries and unknown slugs → 404.
 */
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const live = (await getProjectEntries()).filter(isLive);
  const i = live.findIndex((e) => e.slug.trim() === slug);
  if (i < 0) return null;
  return { entry: live[i], next: live.length > 1 ? live[(i + 1) % live.length] : undefined };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await load((await params).slug);
  if (!found) return { title: "Project not found — NextBiz Studio" };
  const e: ProjectEntry = found.entry;
  return {
    title: `${e.h2} — Projects — NextBiz Studio`,
    description: e.summary,
    openGraph: { title: `${e.h2} — NextBiz Studio`, description: e.summary, images: e.photo ? [e.photo] : [] },
  };
}

export default async function ProjectPage({ params }: Props) {
  const found = await load((await params).slug);
  if (!found) notFound();
  const sections = await getSections("projects");
  const compass = sections.find((s) => s.key === "compass")?.content as typeof projectsSeed.compass | undefined;

  return (
    <main className="shell" id="top">
      <Topbar current="/projects" />
      <CaseStudy entry={found.entry} next={found.next} />
      <Compass content={compass ?? projectsSeed.compass} />
      <Footer />
    </main>
  );
}
