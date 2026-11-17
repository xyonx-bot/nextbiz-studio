/* ═══ PLAN YOUR PROJECT — "the sentence" (Editorial default)
   One big sentence in the visitor's voice; the button opens the planner page. Nothing to pick here. ═══ */
import Link from "next/link";
import { ArrowRight } from "@/components/icons";
import homeContent from "@/lib/seed/home.json";

export function PlanSentence({ content }: { content?: typeof homeContent.planner }) {
  const c = content ?? homeContent.planner;
  return (
    <section className="psent pad" aria-label={c.eyebrow}>
      <div className="psent-l">
        <span className="eyebrow"><span className="orbit" />{c.eyebrow}</span>
        <p className="psent-say">
          I&apos;m <b>a small team</b> in <b>real estate</b>, and I want to <b>automate my WhatsApp</b>, <b>in a month or two</b>.
        </p>
        <span className="psent-hint">Tell us yours. Get three ways to build it.</span>
      </div>
      <div className="psent-go">
        <span className="scribble">takes about a minute ↓</span>
        <Link className="psent-btn" href="/plan">Plan it <i aria-hidden><ArrowRight /></i></Link>
        <dl className="psent-meta">
          <div><dt>You get</dt><dd>3 options</dd></div>
          <div><dt>Timeline</dt><dd>for each</dd></div>
          <div><dt>Sign-up</dt><dd>none</dd></div>
        </dl>
      </div>
    </section>
  );
}
