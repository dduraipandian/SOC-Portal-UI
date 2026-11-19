import { NavLink, Outlet } from "react-router-dom";
import { ANALYST } from "../api/client";
import { Icon, type IconName } from "../components/Icon";

const LINKS: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: "/", label: "Queue", icon: "queue", end: true },
  { to: "/proposals", label: "Proposals", icon: "proposals" },
  { to: "/rules", label: "Rules", icon: "rules" },
  { to: "/health", label: "Pipeline health", icon: "health" },
];

export function Layout() {
  return (
    <div className="shell">
      <aside className="rail">
        <div className="mark" aria-label="SOC portal">
          SOC<span>portal</span>
        </div>
        <nav aria-label="Main">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              <Icon name={l.icon} />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <p className="whoami">Signed in as {ANALYST}</p>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
