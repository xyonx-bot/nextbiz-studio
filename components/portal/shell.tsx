import Link from "next/link";
import { logoutClientAction } from "@/app/portal/actions";
import type { Client, Project } from "@/lib/portal";

const TABS = [["overview", "Overview"], ["updates", "Updates"], ["messages", "Messages"], ["files", "Files"]] as const;
export type Tab = (typeof TABS)[number][0];

/** Portal frame: brand, project switcher, tabs, who's logged in. */
export function PortalShell({ client, projects, project, tab, unread, children }: {
  client: Client; projects: Project[]; project?: Project; tab?: Tab; unread?: number; children: React.ReactNode;
}) {
  return (
    <div className="pt-app">
      <aside className="pt-side">
        <a className="pt-brand dark" href="/portal"><img src="/brand/nb-logo-web.png" alt="" width={30} height={23} /> NextBiz Studio</a>
        {projects.length > 0 && (
          <div className="pt-projects">
            <span className="pt-micro">{projects.length > 1 ? "Your projects" : "Your project"}</span>
            {projects.map((p) => (
              <Link key={p.id} href={`/portal/p/${p.id}`} className={`pt-proj${project?.id === p.id ? " on" : ""}`}><b>{p.title}</b><small>{p.stage[0].toUpperCase() + p.stage.slice(1)}</small></Link>
            ))}
          </div>
        )}
        {project && (
          <nav className="pt-nav" aria-label="Project">
            {TABS.map(([id, label]) => (
              <Link key={id} href={`/portal/p/${project.id}?tab=${id}`} className={tab === id ? "on" : ""} aria-current={tab === id ? "page" : undefined}>
                {label}{id === "messages" && unread ? <span className="pt-n">{unread}</span> : null}
              </Link>
            ))}
          </nav>
        )}
        <div className="pt-who">
          <b>{client.name}</b>{client.business ? <small>{client.business}</small> : null}
          <div className="pt-who-acts"><Link href="/portal/account">Account</Link><form action={logoutClientAction}><button type="submit" className="pt-linkbtn">Log out</button></form></div>
        </div>
      </aside>
      <main className="pt-main">{children}</main>
    </div>
  );
}
