import Link from "next/link";
import { logoutClientAction } from "@/app/portal/actions";
import { CONTACT } from "@/lib/content";
import type { Client, Project } from "@/lib/portal";

const TABS = [["overview", "Overview"], ["updates", "Updates"], ["messages", "Messages"], ["files", "Files"]] as const;
export type Tab = (typeof TABS)[number][0];

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

/** Portal frame, in the site's Editorial language: hairline top bar (brand · project · person), numbered tabs, quiet footer. */
export function PortalShell({ client, projects, project, tab, unread, children }: {
  client: Client; projects: Project[]; project?: Project; tab?: Tab; unread?: number; children: React.ReactNode;
}) {
  return (
    <div className="pt-app">
      <header className="pt-bar">
        <a className="pt-cell pt-brandcell" href="/portal" aria-label="Client portal home">
          <img src="/brand/nb-logo-web.png" alt="" width={34} height={26} />
          <span><b>NextBiz Studio</b><small>Client portal</small></span>
        </a>
        <div className="pt-cell pt-projcell">
          {project ? (
            <>
              <span className="pt-micro">Project{projects.length > 1 ? ` · ${projects.findIndex((p) => p.id === project.id) + 1} of ${projects.length}` : ""}</span>
              <b>{project.title}</b>
              {projects.length > 1 && <Link className="pt-switch" href="/portal?all=1">Switch</Link>}
            </>
          ) : (
            <><span className="pt-micro">Signed in</span><b>{client.business || client.name}</b></>
          )}
        </div>
        <div className="pt-cell pt-whocell">
          <Link className="pt-avatar" href="/portal/account" aria-label="Your account">{initials(client.name)}</Link>
          <span className="pt-whotext"><b>{client.name}</b>
            <span className="pt-whoacts"><Link href="/portal/account">Account</Link><form action={logoutClientAction}><button type="submit" className="pt-linkbtn">Log out</button></form></span>
          </span>
        </div>
      </header>

      {project && (
        <nav className="pt-tabs" aria-label="Project">
          <div className="pt-wrap pt-tabrow">
            {TABS.map(([id, label], i) => (
              <Link key={id} href={`/portal/p/${project.id}${id === "overview" ? "" : `?tab=${id}`}`} className={tab === id ? "on" : ""} aria-current={tab === id ? "page" : undefined}>
                <i>{String(i + 1).padStart(2, "0")}</i>{label}{id === "messages" && unread ? <span className="pt-n" aria-label={`${unread} new`}>{unread}</span> : null}
              </Link>
            ))}
          </div>
        </nav>
      )}

      <main className="pt-main pt-wrap">{children}</main>

      <footer className="pt-foot">
        <div className="pt-wrap pt-footrow">
          <span>Only you and the studio can see this page.</span>
          <span>Stuck? WhatsApp <a href={`https://wa.me/${CONTACT.phoneTel.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{CONTACT.phoneDisplay}</a></span>
          <a href="/">nextbizstudio.com ↗</a>
        </div>
      </footer>
    </div>
  );
}

/** Shared page head: micro line, big light title, a ruled facts column on the right. */
export function PortalHead({ micro, title, sub, facts, compact }: {
  micro: string; title: React.ReactNode; sub?: React.ReactNode; facts?: { k: string; v: React.ReactNode; live?: boolean }[]; compact?: boolean;
}) {
  return (
    <section className={`pt-head${compact ? " compact" : ""}`}>
      <div className="pt-head-l">
        <span className="pt-micro">{micro}</span>
        <h1>{title}</h1>
        {sub && <p className="pt-sub">{sub}</p>}
      </div>
      {facts && facts.length > 0 && (
        <dl className="pt-facts">
          {facts.map((f) => <div key={f.k}><dt>{f.k}</dt><dd className={f.live ? "live" : undefined}>{f.v}</dd></div>)}
        </dl>
      )}
    </section>
  );
}
