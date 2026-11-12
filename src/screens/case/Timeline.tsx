import { Section } from "../../components/Section";
import { Severity } from "../../components/Severity";
import { formatUtc } from "../../components/time";
import { suppressions, type Alert, type Case, type CaseEvent } from "./types";

type Entry = { at: string; alert?: Alert; event?: CaseEvent };

function AlertBody({ a }: { a: Alert }) {
  return (
    <>
      <div>
        <Severity level={a.severity} /> <strong>{a.category.replace(/_/g, " ")}</strong>{" "}
        <span className="muted">{a.source}{a.technique ? `, ${a.technique}` : ""}</span>
      </div>
      {a.process && (
        <dl className="kv">
          <dt>Command</dt><dd className="cmd">{a.process.cmd}</dd>
          <dt>User</dt><dd>{a.process.user ?? "—"}</dd>
          {a.process.parent_cmd && (<><dt>Parent</dt><dd className="cmd">{a.process.parent_cmd}</dd></>)}
          {(a.process.ancestors ?? []).length > 0 && (
            <>
              <dt>Ancestors</dt>
              <dd>
                {(a.process.ancestors ?? []).map((x, i) => (
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

function eventText(e: CaseEvent): string {
  const d = e.data as Record<string, unknown>;
  switch (e.kind) {
    case "closed":
      return `Closed as ${String(d.verdict)} by ${d.by === "rule" ? `rule #${d.rule_id} v${d.version}` : String(d.closed_by ?? "analyst")}`;
    case "merged":
      return `Merged ${d.into ? `into #${String(d.into)}` : ""}`.trim();
    default:
      return e.kind.replace(/_/g, " ");
  }
}

export function Timeline({ c }: { c: Case }) {
  const explained = suppressions(c.events);
  const entries: Entry[] = [
    ...c.alerts.map((alert) => ({ at: alert.time, alert })),
    ...c.events.filter((e) => e.kind === "closed" || e.kind === "merged").map((event) => ({ at: event.at, event })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return (
    <Section title="Timeline">
      <ol className="timeline">
        {entries.map((entry, i) =>
          entry.alert ? (
            <li key={entry.alert.alert_id} data-kind="alert" data-suppressed={explained.has(entry.alert.alert_id)}>
              <div className="muted">{formatUtc(entry.at)}</div>
              <AlertBody a={entry.alert} />
              {explained.has(entry.alert.alert_id) && (
                <div className="explained">
                  Explained by rule #{explained.get(entry.alert.alert_id)!.rule_id} v
                  {explained.get(entry.alert.alert_id)!.version}
                </div>
              )}
            </li>
          ) : (
            <li key={`e${i}`} data-kind="event">
              <div className="muted">{formatUtc(entry.at)}</div>
              {eventText(entry.event!)}
            </li>
          ),
        )}
      </ol>
    </Section>
  );
}
