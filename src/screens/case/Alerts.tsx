// The alerts that make up a case: one scannable line each, expanding to the process, file and network detail.
import { Section } from "../../components/Section";
import { Severity } from "../../components/Severity";
import { formatUtc } from "../../components/time";
import { suppressions, type Alert, type Case } from "./types";

function Detail({ a }: { a: Alert }) {
  const ancestors = a.process?.ancestors ?? [];
  if (!a.process && !a.file && !a.network) return <p className="muted">No further detail.</p>;
  return (
    <>
      {a.process && (
        <dl className="kv">
          <dt>Command</dt><dd className="cmd">{a.process.cmd}</dd>
          <dt>User</dt><dd>{a.process.user ?? "—"}</dd>
          {a.process.parent_cmd && (<><dt>Parent</dt><dd className="cmd">{a.process.parent_cmd}</dd></>)}
          {ancestors.length > 0 && (
            <>
              <dt>Ancestors</dt>
              <dd>
                {ancestors.map((x, i) => (
                  <div key={i} className="cmd">{x.cmd} <span className="muted">({x.user ?? "?"})</span></div>
                ))}
              </dd>
            </>
          )}
        </dl>
      )}
      {a.file && (<dl className="kv"><dt>File</dt><dd className="cmd">{a.file.path} ({a.file.mode})</dd></dl>)}
      {a.network && (<dl className="kv"><dt>Connection</dt><dd className="cmd">{a.network.dst_ip}:{a.network.dst_port}</dd></dl>)}
    </>
  );
}

export function Alerts({ c }: { c: Case }) {
  const explained = suppressions(c.events);
  const alerts = [...c.alerts].sort((a, b) => a.time.localeCompare(b.time));
  return (
    <Section title="Alerts" count={alerts.length}>
      {alerts.length === 0 && <p className="muted">No alerts in this case.</p>}
      <div className="alert-list">
        {alerts.map((a) => {
          const rule = explained.get(a.alert_id);
          const entities = [a.entities.host, a.entities.user, a.entities.ip].filter((e): e is string => !!e);
          return (
            <details key={a.alert_id} className="alert-row" data-level={a.severity} data-suppressed={!!rule}>
              <summary>
                <Severity level={a.severity} />
                <strong>{a.category.replace(/_/g, " ")}</strong>
                <span className="muted">{a.source}{a.technique ? `, ${a.technique}` : ""}</span>
                <span className="chips">{entities.map((e) => <span key={e} className="chip">{e}</span>)}</span>
                <time className="muted" dateTime={a.time}>{formatUtc(a.time)}</time>
                {rule && <span className="explained">Explained by rule #{rule.rule_id} v{rule.version}</span>}
              </summary>
              <div className="alert-body"><Detail a={a} /></div>
            </details>
          );
        })}
      </div>
    </Section>
  );
}
