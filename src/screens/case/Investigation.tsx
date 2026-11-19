import { useState } from "react";
import type { Schemas } from "../../api/client";
import { useInvestigations, useStartInvestigation } from "../../api/hooks";
import { refusalText } from "../../api/problems";
import { ErrorState } from "../../components/ErrorState";
import { Section } from "../../components/Section";
import { StatusBadge } from "../../components/StatusBadge";
import { formatUtc } from "../../components/time";
import { AgentSteps } from "./AgentSteps";

type View = Schemas["InvestigationView"];

/** The most investigations shown as cards: the latest run and the ones before it. */
export const MAX_RUNS = 10;

/** One investigation's evidence and its agent steps. `open` expands the steps (used when an analyst picked the run). */
function Snapshot({ inv, open }: { inv: View; open: boolean }) {
  return (
    <>
      <dl className="kv">
        <dt>Completed</dt><dd>{formatUtc(inv.completed_at)}, for v{inv.case_version}</dd>
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
      <AgentSteps steps={inv.steps} defaultOpen={open} />
    </>
  );
}

/** The investigations of the case as small cards, newest on the left; the first one gave the case its verdict. */
function RunCards({ runs, selectedId, onSelect }: { runs: View[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <ul className="run-cards" aria-label="Investigations">
      {runs.map((r, i) => (
        <li key={r.investigation_id}>
          <button type="button" className="run-card" aria-pressed={r.investigation_id === selectedId}
                  data-verdict={r.verdict} onClick={() => onSelect(r.investigation_id)}>
            <span className="run-top">
              <strong className="run-verdict">{r.verdict.replace(/_/g, " ")}</strong>
              {i === 0 && <span className="run-latest">Latest</span>}
            </span>
            <time dateTime={r.completed_at}>{formatUtc(r.completed_at)}</time>
            <span className="hash" title={r.evidence_hash}>{r.evidence_hash.slice(0, 12)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** The newest run ended without a verdict: say why, and show what it did before it stopped. */
function Failure({ failure }: { failure: Schemas["InvestigationFailure"] }) {
  return (
    <div role="alert" className="refusal failure">
      <p><strong>The last investigation failed:</strong> {failure.error}</p>
      <p className="muted">
        For v{failure.case_version}, {formatUtc(failure.completed_at)}, after {(failure.duration_ms / 1000).toFixed(1)} s
      </p>
      {failure.steps.length > 0 && <AgentSteps steps={failure.steps} title="Steps before it failed" />}
    </div>
  );
}

/** Starts a run in the backend; agent_status shows it running and the poll shows the result. */
function StartButton({ caseId, status }: { caseId: number; status: Schemas["AgentStatus"] }) {
  const start = useStartInvestigation(caseId);
  const running = status === "investigating" || start.isPending;
  return (
    <>
      <button type="button" className="button quiet" disabled={running} onClick={() => start.mutate()}>
        {running ? "Investigating…" : "Run investigation"}
      </button>
      {start.error && <span role="alert" className="refusal">{refusalText(start.error)}</span>}
    </>
  );
}

export function Investigation({ caseId }: { caseId: number }) {
  const q = useInvestigations(caseId);
  const [picked, setPicked] = useState<string | null>(null);
  const latest = q.data?.latest ?? null;
  const runs = latest ? [latest, ...(q.data?.history ?? [])].slice(0, MAX_RUNS) : [];
  // a picked run that has dropped out of the list (or none picked yet) means the latest
  const selected = runs.find((r) => r.investigation_id === picked) ?? runs[0];
  return (
    <Section title="Investigation">
      {q.error && <ErrorState error={q.error} onRetry={() => q.refetch()} lastUpdated={q.data ? q.dataUpdatedAt : undefined} />}
      {q.data && (
        <>
          <p>Agent: <StatusBadge status={q.data.agent_status} /> <StartButton caseId={caseId} status={q.data.agent_status} /></p>
          {q.data.last_failure && <Failure failure={q.data.last_failure} />}
          {selected ? (
            <>
              <RunCards runs={runs} selectedId={selected.investigation_id} onSelect={setPicked} />
              {selected !== runs[0] && (
                <p className="banner">
                  Showing an earlier investigation: {selected.verdict.replace(/_/g, " ")} for v{selected.case_version},{" "}
                  {formatUtc(selected.completed_at)}. The case summary above is from the latest one.
                </p>
              )}
              {/* keyed so each pick starts fresh, with its steps opened when the analyst chose it */}
              <Snapshot key={selected.investigation_id} inv={selected} open={picked !== null} />
            </>
          ) : (
            <p className="muted">No completed investigation yet.</p>
          )}
        </>
      )}
    </Section>
  );
}
