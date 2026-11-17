import type { Metadata } from "next";
import { Topbar } from "@/components/chrome/Topbar";
import { Footer } from "@/components/chrome/Footer";
import { Planner } from "@/components/sections/planner";
import { getPricing } from "@/lib/planner";
import { WHATSAPP_NUMBER } from "@/lib/content";
import homeSeed from "@/lib/seed/home.json";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Plan your project — NextBiz Studio",
  description: "Answer five quick questions and get three ways to build it, with timelines — in about a minute.",
};

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ type?: string; size?: string; industry?: string; when?: string }> }) {
  const [{ type, size, industry, when }, pricing] = await Promise.all([searchParams, getPricing()]);
  const industries = (homeSeed.industries.items as { label: string }[]).map((i) => i.label === "and More" ? "Something else" : i.label);
  return (
    <main className="shell">
      <Topbar current="/plan" />
      <section className="plan-strip" aria-label="Project planner">
        <div className="ps-title"><span className="eyebrow"><span className="orbit" />Project planner</span><h1>Let&apos;s plan your project.</h1></div>
        <div><span className="k"><em>5</em> questions</span><small>Most take one tap</small></div>
        <div><span className="k"><em>3</em> options</span><small>With a timeline for each</small></div>
        <div><span className="k">~<em>60</em>s</span><small>No sign-up needed</small></div>
      </section>
      <section className="plan-body pad">
        <Planner pricing={pricing} industries={industries} start={type} preset={{ size, industry, when }} wa={WHATSAPP_NUMBER} />
      </section>
      <Footer />
    </main>
  );
}
