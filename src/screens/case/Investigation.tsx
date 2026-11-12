import type { Schemas } from "../../api/client";
import { useInvestigations } from "../../api/hooks";
import { ErrorState } from "../../components/ErrorState";
import { Section } from "../../components/Section";
import { StatusBadge } from "../../components/StatusBadge";
import { formatUtc } from "../../components/time";
import { AgentSteps } from "./AgentSteps";

type View = Schemas["InvestigationView"];

function Snapshot({ inv }: { inv: View }) {
  return (
    <>
      <dl className="kv">
        <dt>Verdict</dt><dd><strong>{inv.verdict}</strong> ({Math.round(inv.confidence * 100)}% confidence)</dd>
        <dt>For version</dt><dd>v{inv.case_version}, completed {formatUtc(inv.completed_at)}</dd>
        <dt>Rationale</dt><dd>{inv.rationale}</dd>
        <dt>Evidence hash</dt><dd className="hash">{inv.evidence_hash}</dd>
      </dl>
      <h3>Evidence</h3>
      <div className="table-scroll">
        <table className="grid">
          <thead><tr><th>Tool</th><th>Arguments</th><th>Result excerpt</th><th>Digest</th></tr></thead>
          <tbody>
            {inv.evidence.map((e, i) => (
              <tr key={i}>
                <td>{e.tool}</td>
                <td className="cmd">{JSON.stringify(e.args)}</td>
                <td className="cmd">{e.result_excerpt}</td>
                <td className="hash" title={e.result_digest}>{e.result_digest.slice(0, 12)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <AgentSteps steps={inv.steps} />
    </>
  );
}

export function Investigation({ caseId }: { caseId: number }) {
  const q = useInvestigations(caseId);
  return (
    <Section title="Investigation">
      {q.error && <ErrorState error={q.error} onRetry={() => q.refetch()} lastUpdated={q.data ? q.dataUpdatedAt : undefined} />}
      {q.data && (
        <>
          <p>Agent: <StatusBadge status={q.data.agent_status} /></p>
          {q.data.latest ? <Snapshot inv={q.data.latest} /> : <p className="muted">No completed investigation yet.</p>}
          {q.data.history.length > 0 && (
            <details>
              <summary>Earlier investigations ({q.data.history.length})</summary>
              {q.data.history.map((h) => (
                <div key={h.investigation_id} className="panel">
                  {h.verdict} for v{h.case_version}, {formatUtc(h.completed_at)}
                  <div className="hash muted">{h.evidence_hash}</div>
                </div>
              ))}
            </details>
          )}
        </>
      )}
    </Section>
  );
}
