import { NavLink, Outlet } from "react-router-dom";
import { ANALYST } from "../api/client";

const LINKS = [
  { to: "/", label: "Queue", end: true },
  { to: "/proposals", label: "Proposals" },
  { to: "/rules", label: "Rules" },
  { to: "/health", label: "Pipeline health" },
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
