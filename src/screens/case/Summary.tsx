// The first thing an analyst reads on a case: what the agent concluded, how sure it is, and whether that is current.
import { useInvestigations } from "../../api/hooks";
import { Age } from "../../components/Age";
import { Section } from "../../components/Section";
import { StatusBadge } from "../../components/StatusBadge";
import { formatUtc } from "../../components/time";
import type { Case } from "./types";

export function Summary({ c }: { c: Case }) {
  const q = useInvestigations(c.case_id);
  const inv = q.data?.latest ?? null;
  const failure = q.data?.last_failure ?? null;
  const pct = inv ? Math.round(inv.confidence * 100) : 0;
  return (
    <Section title="Summary" className="summary">
      <div className="summary-grid">
        <div>
          {q.isPending && <p className="muted">Loading the agent's findings…</p>}
          {q.data && inv && (
            <>
              <strong className="verdict" data-verdict={inv.verdict}>{inv.verdict.replace(/_/g, " ")}</strong>
              <div className="meter">
                <span className="track" role="meter" aria-label="Confidence" aria-valuemin={0} aria-valuemax={100}
                      aria-valuenow={pct}>
                  <span className="fill" style={{ width: `${pct}%` }} />
                </span>
                <span className="muted">{pct}% confidence</span>
              </div>
              <p className="rationale">{inv.rationale}</p>
              <p className="muted">
                {inv.case_version === c.version
                  ? `Completed ${formatUtc(inv.completed_at)}, for the current version of the case.`
                  : `Based on v${inv.case_version}; the case is now v${c.version}.`}
              </p>
            </>
          )}
          {q.data && !inv && (
            <>
              <strong className="verdict" data-verdict="none">No verdict yet</strong>
              <p className="muted">No completed investigation yet.</p>
              {failure && <p>The last run stopped: {failure.error}</p>}
            </>
          )}
        </div>
        <dl className="facts">
          {q.data && (<><dt>Agent</dt><dd><StatusBadge status={q.data.agent_status} /></dd></>)}
          <dt>Opened</dt><dd><Age at={c.opened_at} /></dd>
          <dt>Updated</dt><dd><Age at={c.updated_at} /></dd>
          <dt>Alerts</dt><dd>{c.alerts.length}</dd>
        </dl>
      </div>
    </Section>
  );
}
