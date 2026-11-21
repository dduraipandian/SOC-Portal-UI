import type { Schemas } from "../../api/client";
import { RunView } from "./RunView";

type Detail = Schemas["EvalBatchDetail"];
type Run = Schemas["EvalRunSummary"];

const OUTCOME: Record<Run["outcome"], string> = {
  correct: "correct", incorrect: "incorrect", pending_review: "waiting for review", infra: "infra failure",
};

/** The run a variant opens on: the first incorrect one, else the first waiting for review, else the first. */
export function defaultRun(runs: Run[]): string | undefined {
  return (runs.find((r) => r.outcome === "incorrect") ?? runs.find((r) => r.outcome === "pending_review") ?? runs[0])
    ?.run_id;
}

export function VariantRuns({ detail, variant, caseId, runId, onCase, onRun }: {
  detail: Detail; variant: string; caseId?: number; runId?: string;
  onCase: (caseId?: number) => void; onRun: (runId: string) => void;
}) {
  const v = detail.variants.find((x) => x.name === variant);
  const runs = detail.runs
    .filter((r) => r.variant === variant && (caseId === undefined || r.case_id === caseId))
    .sort((a, b) => a.case_id - b.case_id || a.attempt - b.attempt || a.started_at.localeCompare(b.started_at));
  const selected = runId && runs.some((r) => r.run_id === runId) ? runId : defaultRun(runs);
  const expected = (caseId === undefined ? detail.cases.length : 1) * detail.batch.k;
  const missing = Math.max(0, expected - runs.filter((r) => r.outcome !== "infra").length);

  return (
    <section className="variant-runs" aria-label={`Runs of ${variant}`}>
      <h2>
        {variant}
        {v && <span className="variant-settings">{[v.model, v.reasoning_level && `reasoning ${v.reasoning_level}`,
          v.prompt_file && `prompt ${v.prompt_file}`].filter(Boolean).join(" · ")}</span>}
      </h2>
      <div className="case-chips" role="group" aria-label="Cases">
        <button type="button" aria-pressed={caseId === undefined} onClick={() => onCase(undefined)}>all cases</button>
        {detail.cases.map((c) => (
          <button key={c.case_id} type="button" aria-pressed={caseId === c.case_id} onClick={() => onCase(c.case_id)}>
            case {c.case_id}
          </button>
        ))}
      </div>
      <ul className="run-cards" aria-label="Runs">
        {runs.map((r) => (
          <li key={r.run_id}>
            <button type="button" className="run-card" aria-pressed={r.run_id === selected} data-outcome={r.outcome}
                    onClick={() => onRun(r.run_id)}>
              <span className="run-top"><strong>case {r.case_id} · #{r.attempt}</strong></span>
              <span>{OUTCOME[r.outcome]}</span>
              <span className="muted">{r.verdict ?? r.failure_kind ?? "no verdict"} · {Math.round(r.duration_ms / 1000)} s</span>
            </button>
          </li>
        ))}
        {missing > 0 && (
          <li className="run-missing muted">
            {missing} {detail.batch.finished_at ? "without a run that counts" : "not run yet"}
          </li>
        )}
      </ul>
      {selected ? <RunView runId={selected} /> : <p className="empty">No runs yet.</p>}
    </section>
  );
}
