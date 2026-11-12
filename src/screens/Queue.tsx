// Case queue (spec 11): open cases, severity, status, entities, age, filters; merged and superseded work marked.
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { Schemas } from "../api/client";
import { useQueue } from "../api/hooks";
import { Age } from "../components/Age";
import { ErrorState } from "../components/ErrorState";
import { Severity } from "../components/Severity";
import { StatusBadge } from "../components/StatusBadge";

type Item = Schemas["QueueItem"];
const STATUSES = ["open", "closed", "merged"] as const;
export const QUEUE_LIMIT = 100;

function byPriority(a: Item, b: Item): number {
  return b.severity - a.severity || b.updated_at.localeCompare(a.updated_at);
}

export function Queue() {
  const [params, setParams] = useSearchParams();
  const status = STATUSES.find((s) => s === params.get("status"));
  const minSeverity = Number(params.get("severity") ?? "1") || 1;
  const entity = params.get("entity") ?? "";
  // Filters go to the backend so they apply before its limit; a full page means there may be more.
  const q = useQueue({ status, severity: minSeverity > 1 ? minSeverity : undefined, entity: entity.trim() || undefined,
                       limit: QUEUE_LIMIT });
  const navigate = useNavigate();

  const set = (key: string, value: string, fallback: string) => {
    const next = new URLSearchParams(params);
    if (value === fallback) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const rows = [...(q.data ?? [])].sort(byPriority);

  return (
    <section>
      <h1>Queue</h1>
      <div className="filters">
        <label>
          Status
          <select value={status ?? ""} onChange={(e) => set("status", e.target.value, "")}>
            <option value="">Open and merged</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="merged">Merged</option>
          </select>
        </label>
        <label>
          Minimum severity
          <select value={String(minSeverity)} onChange={(e) => set("severity", e.target.value, "1")}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>
          Exact host, user or IP
          <input type="search" value={entity} onChange={(e) => set("entity", e.target.value, "")} />
        </label>
        <button type="button" className="button quiet" onClick={() => q.refetch()}>Refresh</button>
      </div>

      {q.error && (
        <ErrorState error={q.error} onRetry={() => q.refetch()} lastUpdated={q.data ? q.dataUpdatedAt : undefined} />
      )}

      {q.data && rows.length === 0 && <p className="empty">No cases match these filters.</p>}
      {rows.length >= QUEUE_LIMIT && (
        <p className="banner">
          Showing the {QUEUE_LIMIT} most recently updated matching cases. Raise the minimum severity or filter by
          an entity to find older ones.
        </p>
      )}
      {rows.length > 0 && (
        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr>
                <th>Case</th><th>Severity</th><th>Status</th><th>Entities</th><th className="num">Alerts</th>
                <th>Agent</th><th>Opened</th><th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.case_id} data-dim={c.status !== "open"} onClick={() => navigate(`/cases/${c.case_id}`)}
                    style={{ cursor: "pointer" }}>
                  <td><Link to={`/cases/${c.case_id}`} onClick={(e) => e.stopPropagation()}>#{c.case_id}</Link></td>
                  <td><Severity level={c.severity} /></td>
                  <td>
                    {c.status === "merged" && c.merged_into !== null ? (
                      <Link to={`/cases/${c.merged_into}`} onClick={(e) => e.stopPropagation()}>
                        merged into #{c.merged_into}
                      </Link>
                    ) : (
                      <StatusBadge status={c.status} />
                    )}
                  </td>
                  <td>
                    <span className="chips">
                      {[...c.entities.hosts, ...c.entities.users, ...c.entities.ips].map((e) => (
                        <span key={e} className="chip">{e}</span>
                      ))}
                    </span>
                  </td>
                  <td className="num">{c.alert_count}</td>
                  <td><StatusBadge status={c.agent_status} /></td>
                  <td><Age at={c.opened_at} /></td>
                  <td><Age at={c.updated_at} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
