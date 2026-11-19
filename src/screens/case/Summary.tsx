// The first thing an analyst reads on a case: what the agent concluded, how sure it is, and whether that is current.
import { useInvestigations } from "../../api/hooks";
import { Section } from "../../components/Section";
import { StatusBadge } from "../../components/StatusBadge";
import { formatUtc } from "../../components/time";
import type { Case } from "./types";

export function Summary({ c }: { c: Case }) {
  const q = useInvestigations(c.case_id);
  const inv = q.data?.latest ?? null;
  const failure = q.data?.last_failure ?? null;
  return (
    <Section title="Summary" className="card summary">
      {q.isPending && <p className="muted">Loading the agent's findings…</p>}
      {q.data && inv && (
        <>
          <div className="verdict-line">
            <strong className="verdict" data-verdict={inv.verdict}>{inv.verdict}</strong>
            <span className="muted">{Math.round(inv.confidence * 100)}% confidence</span>
            <StatusBadge status={q.data.agent_status} />
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
          <div className="verdict-line">
            <strong className="verdict">No verdict yet</strong>
            <StatusBadge status={q.data.agent_status} />
          </div>
          <p className="muted">No completed investigation yet.</p>
          {failure && <p>The last run stopped: {failure.error}</p>}
        </>
      )}
    </Section>
  );
}
