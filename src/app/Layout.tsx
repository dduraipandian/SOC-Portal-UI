import { NavLink, Outlet } from "react-router-dom";
import { ANALYST } from "../api/client";
import { Icon, type IconName } from "../components/Icon";

const LINKS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: "/", label: "Queue", icon: "queue", end: true },
  { to: "/proposals", label: "Proposals", icon: "proposals" },
  { to: "/rules", label: "Rules", icon: "rules" },
  { to: "/evals", label: "Evals", icon: "evals" },
  { to: "/health", label: "Pipeline health", icon: "health" },
];

/** A slim icon rail; the labels stay in the DOM (and as tooltips) and show in the top bar on phones. */
export function Layout() {
  return (
    <div className="shell">
      <aside className="rail">
        <div className="mark" aria-label="SOC portal">SOC<span>portal</span></div>
        <nav aria-label="Main">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} title={l.label}>
              <Icon name={l.icon} />
              <span className="nav-label">{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <p className="whoami" title={`Signed in as ${ANALYST}`}>
          <span className="avatar" aria-hidden="true">{ANALYST.slice(0, 1).toUpperCase()}</span>
          <span className="nav-label">Signed in as {ANALYST}</span>
        </p>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
