// Evals: batches on the left; the selected batch on the right, its scoreboard on top and, below it, a variant's runs
// shown the way an investigation is shown on the case page. Batches are started from the CLI; this page reads them
// and saves the human rationale review. The selection lives in the URL, so a link reopens the same view.
import { useEffect } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEvalBatch, useEvalBatches } from "../api/hooks";
import { Age } from "../components/Age";
import { ErrorState } from "../components/ErrorState";
import { BatchList } from "./evals/BatchList";
import { Scoreboard } from "./evals/Scoreboard";
import { VariantRuns } from "./evals/VariantRuns";

export function Evals() {
  const { batchId } = useParams();
  const [params, setParams] = useSearchParams();
  const batches = useEvalBatches();
  const selectedId = batchId ?? batches.data?.[0]?.batch_id;
  const detail = useEvalBatch(selectedId);

  // /evals opens the newest batch at its own address, so the URL names the batch: a link reopens the same view,
  // and a batch started meanwhile does not take over the page.
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (!batchId && selectedId) navigate(`/evals/${selectedId}${location.search}`, { replace: true });
  }, [batchId, selectedId, location.search, navigate]);

  const caseParam = params.get("case");
  const caseId = caseParam ? Number(caseParam) : undefined;

  const runId = params.get("run") ?? undefined;
  const go = (v: string, c?: number, run?: string) => {
    const next = new URLSearchParams();
    next.set("variant", v);
    if (c !== undefined) next.set("case", String(c));
    if (run) next.set("run", run);
    setParams(next, { replace: true });
  };
  const select = (v: string, c?: number) => go(v, c);

  const d = detail.data;
  // the mockup's view: a batch opens on its first variant's runs, until one is chosen
  const variant = params.get("variant") ?? d?.variants[0]?.name;
  return (
    <div className="evals">
      <BatchList batches={batches.data ?? []} selectedId={selectedId} />
      <section className="evals-main" aria-label="Batch">
        {batches.error && <ErrorState error={batches.error} onRetry={() => batches.refetch()} />}
        {detail.error && <ErrorState error={detail.error} onRetry={() => detail.refetch()} />}
        {batches.data && batches.data.length === 0 && <p className="empty">No eval batches yet.</p>}
        {d && (
          <>
            <div className="page-head">
              <h1>{d.batch.note || "no note"}</h1>
              <p className="muted">
                started <Age at={d.batch.started_at} /> ·{" "}
                {d.batch.finished_at ? <>finished <Age at={d.batch.finished_at} /></>
                  : <>not finished{d.batch.last_run_at && <> · last run <Age at={d.batch.last_run_at} /></>}</>}
                {" "}· cases {d.cases.map((c) => `${c.case_id} (${c.scenario_id})`).join(", ")} · k={d.batch.k}
              </p>
            </div>
            <div className="eval-facts">
              <div><b>{d.batch.runs_done} / {d.batch.runs_total}</b><span className="muted">runs done</span></div>
              <div><b>{d.pending_reviews}</b><span className="muted">waiting for review</span></div>
              <div><b>{d.infra}</b><span className="muted">infra failures</span></div>
              <div><b>{Math.round(d.median_ms / 1000)} s</b><span className="muted">median run</span></div>
            </div>
            <Scoreboard detail={d} selected={variant ? { variant, caseId } : undefined} onSelect={select} />
            {variant && (
              <VariantRuns detail={d} variant={variant} caseId={caseId} runId={runId}
                           onCase={(c) => go(variant, c)} onRun={(r) => go(variant, caseId, r)} />
            )}
          </>
        )}
      </section>
    </div>
  );
}
