import { Link } from "react-router-dom";
import type { Schemas } from "../../api/client";
import { Age } from "../../components/Age";

type Batch = Schemas["EvalBatchSummary"];

/** Batches, newest first. An unfinished batch shows its last run's age: the API cannot tell a running batch from one
 *  that stopped, and an old "last run" makes a stalled one obvious. */
export function BatchList({ batches, selectedId }: { batches: Batch[]; selectedId?: string }) {
  return (
    <nav aria-label="Batches" className="batch-list">
      <h2>Batches</h2>
      {batches.length === 0 && <p className="empty">No batches yet. Start one with <code>evals.run</code>.</p>}
      {batches.map((b) => (
        <Link key={b.batch_id} to={`/evals/${b.batch_id}`} className="batch-item"
              aria-current={b.batch_id === selectedId ? "page" : undefined}>
          <strong>{b.note || "no note"}</strong>
          <span className="muted">
            {b.finished_at ? "finished" : <>not finished · last run {b.last_run_at ? <Age at={b.last_run_at} /> : "none yet"}</>}
          </span>
          <span className="muted">{b.runs_done} of {b.runs_total} runs · {b.variants.length} variant{b.variants.length === 1 ? "" : "s"} · k={b.k}</span>
        </Link>
      ))}
    </nav>
  );
}
