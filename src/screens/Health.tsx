// Pipeline health (spec 11): consumer lag, outbox backlog, DLQ counts, last pull per vendor.
import { useHealth } from "../api/hooks";
import { Age } from "../components/Age";
import { ErrorState } from "../components/ErrorState";
import { Section } from "../components/Section";
import { StatusBadge } from "../components/StatusBadge";
import { formatAge } from "../components/time";

export const LIMITS = { lag: 100, outboxAgeS: 60, pullAgeS: 120 } as const;

const Warn = ({ on }: { on: boolean }) => (on ? <StatusBadge status="warn" label="warning" /> : null);

export function Health() {
  const q = useHealth();
  const h = q.data;
  const now = Date.now();
  return (
    <section>
      <div className="page-head"><h1>Pipeline health</h1></div>
      <div className="filters">
        <button type="button" className="button quiet" onClick={() => q.refetch()}>Refresh</button>
        {h && <span className="muted">updated {formatAge(new Date(q.dataUpdatedAt).toISOString())}</span>}
      </div>
      {q.error && <ErrorState error={q.error} onRetry={() => q.refetch()} lastUpdated={h ? q.dataUpdatedAt : undefined} />}
      {h && (
        <div className="health-grid">
          <Section title="Consumer lag" className="panel">
            <table className="grid">
              <thead><tr><th>Group</th><th>Topic</th><th className="num">Lag</th><th /></tr></thead>
              <tbody>
                {h.consumer_lag.map((l) => (
                  <tr key={`${l.group}-${l.topic}`}>
                    <td>{l.group}</td><td>{l.topic}</td>
                    <td className="num">{l.lag ?? "unknown"}</td>
                    <td><Warn on={l.lag === null || l.lag > LIMITS.lag} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
          <Section title="Outbox" className="panel">
            <dl className="kv">
              <dt>Waiting to publish</dt><dd className="metric">{h.outbox.backlog}</dd>
              <dt>Oldest waiting</dt>
              <dd>
                {h.outbox.oldest_unsent_age_s === null ? "nothing waiting" : `${h.outbox.oldest_unsent_age_s.toFixed(1)} s`}{" "}
                <Warn on={(h.outbox.oldest_unsent_age_s ?? 0) > LIMITS.outboxAgeS} />
              </dd>
              <dt>Rejected by Kafka</dt><dd>{h.outbox.failed} <Warn on={h.outbox.failed > 0} /></dd>
            </dl>
          </Section>
          <Section title="Dead-letter queue" className="panel">
            <p><span className="metric" data-warn={h.dlq.messages > 0}>{h.dlq.messages}</span> messages{" "}
              <Warn on={h.dlq.messages > 0} /></p>
            <p className="muted">Messages a stage could not process. They wait in pipeline.dlq for a replay.</p>
          </Section>
          <Section title="Last pull per vendor" className="panel">
            <table className="grid">
              <tbody>
                {Object.entries(h.last_pull).map(([vendor, at]) => {
                  const stale = at === null || (now - new Date(at).getTime()) / 1000 > LIMITS.pullAgeS;
                  return (
                    <tr key={vendor}>
                      <td>{vendor}</td>
                      <td>{at ? <Age at={at} /> : "never"}</td>
                      <td><Warn on={stale} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Section>
        </div>
      )}
    </section>
  );
}
