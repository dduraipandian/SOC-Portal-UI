import { Section } from "../../components/Section";
import { StatusBadge } from "../../components/StatusBadge";
import type { Case } from "./types";

type Decision = { rule_id: number; version: number; name: string; action: string; result: string;
                  matched_alert_ids: string[] };

export function RuleTrace({ c }: { c: Case }) {
  const all = c.events.filter((e) => e.kind === "rule_decision");
  const current = all.filter((e) => e.version === c.version);
  const shown = (current.length ? current : all).map((e) => e.data as unknown as Decision);
  return (
    <Section title="Rule trace">
      {shown.length === 0 ? (
        <p className="muted">No rule matched this case.</p>
      ) : (
        <table className="grid">
          <thead><tr><th>Rule</th><th>Action</th><th>Result</th><th className="num">Alerts matched</th></tr></thead>
          <tbody>
            {shown.map((d) => (
              <tr key={`${d.rule_id}-${d.version}`}>
                <td>#{d.rule_id} v{d.version} {d.name}</td>
                <td>{d.action.replace(/_/g, " ")}</td>
                <td><StatusBadge status={d.result === "partial" ? "warn" : d.result} label={d.result} /></td>
                <td className="num">{d.matched_alert_ids.length || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}
