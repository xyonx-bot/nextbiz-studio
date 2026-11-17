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

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [{ type }, pricing] = await Promise.all([searchParams, getPricing()]);
  const industries = (homeSeed.industries.items as { label: string }[]).map((i) => i.label === "and More" ? "Something else" : i.label);
  return (
    <main className="shell">
      <Topbar current="/plan" />
      <section className="plan-head pad">
        <span className="eyebrow"><span className="orbit" />Project planner</span>
        <h1>Plan your project<br />in <span className="hl">60 seconds</span>.</h1>
        <p className="lede">Five quick questions. You get three ways to build it, with timelines. No sign-up.</p>
      </section>
      <section className="plan-body pad">
        <Planner pricing={pricing} industries={industries} start={type} wa={WHATSAPP_NUMBER} />
      </section>
      <Footer />
    </main>
  );
}
