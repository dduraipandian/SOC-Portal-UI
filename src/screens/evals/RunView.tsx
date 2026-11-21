import { useEvalRun } from "../../api/hooks";
import { ErrorState } from "../../components/ErrorState";
import { Section } from "../../components/Section";
import { AgentSteps } from "../case/AgentSteps";
import { ReviewForm } from "./ReviewForm";
import { diagnostics, why } from "./why";

const CHECKS = ["verdict", "process", "grounding"] as const;

/** One run, read like an investigation: why it is (in)correct, the review, the verdict and evidence, the steps. */
export function RunView({ runId }: { runId: string }) {
  const q = useEvalRun(runId);
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <p className="muted">Loading…</p>;
  const run = q.data;
  const grade = (name: string) => run.grades.find((g) => g.grader === name);
  const review = grade("rationale_human");

  return (
    <div className="run-view">
      <Section title="Why" className="why">
        {run.error && <p className="refusal">{run.error}</p>}
        <ul className="checks">
          {CHECKS.map((name) => {
            const g = grade(name);
            return (
              <li key={name} data-passed={g?.passed ?? undefined}>
                <strong>{g?.passed ? "✓" : "✗"} {name}</strong> {g ? why(g) : "not graded"}
              </li>
            );
          })}
          <li data-passed={review?.passed ?? undefined}>
            <strong>{review ? (review.passed ? "✓" : "✗") : "…"} human review</strong>{" "}
            {review ? why(review) : run.reviewable ? "not reviewed yet" : "not reviewed: a run that fails a code check is never queued"}
          </li>
        </ul>
        <p className="muted">
          {[diagnostics(run.grades), `${(run.prompt_tokens + run.output_tokens).toLocaleString("en-US")} tokens`,
            `${Math.round(run.duration_ms / 1000)} s`].filter(Boolean).join(" · ")}
        </p>
      </Section>

      {run.reviewable && <ReviewForm key={run.run_id} runId={run.run_id} current={review?.passed ?? undefined} />}

      <dl className="kv">
        <dt>Verdict</dt><dd>{run.verdict ?? "none"}{run.confidence ? ` (${run.confidence})` : ""}</dd>
        <dt>Rationale</dt><dd>{run.rationale ?? "none"}</dd>
      </dl>
      {run.evidence.length > 0 && (
        <>
          <h3>Evidence</h3>
          <div className="table-scroll">
            <table className="grid">
              <thead><tr><th>Fact</th><th>Value</th></tr></thead>
              <tbody>
                {run.evidence.map((e, i) => (
                  <tr key={i}><td>{String(e.args.fact ?? e.tool)}</td><td className="cmd">{e.result_excerpt}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <AgentSteps source={{ kind: "eval-run", id: run.run_id }} steps={run.steps} />
    </div>
  );
}
