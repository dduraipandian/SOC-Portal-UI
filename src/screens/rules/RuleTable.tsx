import { Fragment, useState } from "react";
import type { Schemas } from "../../api/client";
import { useRenewRule, useSimulate } from "../../api/hooks";
import { refusalText } from "../../api/problems";
import { StatusBadge } from "../../components/StatusBadge";
import { formatIn, formatUtc } from "../../components/time";
import { actionText } from "./describe";

type Rule = Schemas["Rule"];
const DAY = 86400_000;
const isoDate = (t: number) => new Date(t).toISOString().slice(0, 10);

function RenewPanel({ rule, onDone }: { rule: Rule; onDone: () => void }) {
  const [date, setDate] = useState(isoDate(Date.now() + 30 * DAY));
  const [refusal, setRefusal] = useState<string | null>(null);
  const simulate = useSimulate();
  const renew = useRenewRule();
  const max = isoDate(Date.now() + 90 * DAY);
  const tooLong = date > max;
  const tooSoon = date <= isoDate(Date.now());
  const busy = simulate.isPending || renew.isPending;

  const run = async () => {
    setRefusal(null);
    try {
      const sim = await simulate.mutateAsync({ rule: rule.definition });
      await renew.mutateAsync({ ruleId: rule.rule_id, expectedVersion: rule.version,
                                validUntil: `${date}T00:00:00Z`, simulationId: sim.simulation_id });
      onDone();
    } catch (e) {
      setRefusal(refusalText(e));
    }
  };

  return (
    <div className="panel" role="group" aria-label={`Renew ${rule.definition.name}`}>
      <label>
        Valid until
        <input type="date" value={date} max={max} onChange={(e) => setDate(e.target.value)} />
      </label>
      {tooLong && <p className="refusal">A rule can be valid for at most 90 days from today ({max}).</p>}
      {tooSoon && <p className="refusal">Pick a date after today.</p>}
      {refusal && <div role="alert" className="refusal"><p>{refusal}</p></div>}
      <p className="muted">Renewing runs a fresh simulation over the last 30 days first.</p>
      <div className="actions">
        <button type="button" className="button" disabled={busy || tooLong || tooSoon || !date} onClick={run}>
          Simulate and renew
        </button>
        <button type="button" className="button quiet" onClick={onDone} disabled={busy}>Cancel</button>
      </div>
    </div>
  );
}

export function RuleTable({ rules, renewable }: { rules: Rule[]; renewable: boolean }) {
  const [renewing, setRenewing] = useState<number | null>(null);
  if (rules.length === 0) return <p className="empty">No rules here.</p>;
  return (
    <div className="table-scroll">
      <table className="grid">
        <thead>
          <tr><th>Rule</th><th>Action</th><th>Version</th><th>Valid from</th><th>Valid until</th><th>Status</th>
            {renewable && <th />}</tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <Fragment key={r.rule_id}>
              <tr>
                <td>#{r.rule_id} {r.definition.name}</td>
                <td>{actionText(r.definition.action)}</td>
                <td>v{r.version}</td>
                <td>{formatUtc(r.definition.valid_from)}</td>
                <td title={formatUtc(r.definition.valid_until)}>
                  {r.definition.valid_until ? formatIn(r.definition.valid_until) : "no end"}
                </td>
                <td><StatusBadge status={r.status} /></td>
                {renewable && (
                  <td>
                    <button type="button" className="button quiet" onClick={() => setRenewing(r.rule_id)}>Renew…</button>
                  </td>
                )}
              </tr>
              {renewing === r.rule_id && (
                <tr><td colSpan={7}><RenewPanel rule={r} onDone={() => setRenewing(null)} /></td></tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
