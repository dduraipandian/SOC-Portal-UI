import type { Schemas } from "../../api/client";

type Detail = Schemas["EvalBatchDetail"];
type Row = Schemas["EvalScoreRow"];

/** One cell: correct runs out of the runs that count, the reviews still pending, and … while runs are missing. */
export function cellText(row: Row | undefined, k: number, finished: boolean): string {
  if (!row) return finished ? "—" : "…";
  let text = `${row.correct}/${row.k}`;
  if (row.pending) text += ` +${row.pending} pending`;
  if (!finished && row.k < k) text += " …";
  return text;
}

const tone = (row: Row | undefined) =>
  row?.pass_k === true ? "ok" : row?.pass_k === false ? "bad" : row?.pending ? "warn" : undefined;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

/** Variant x case. Numbers come from the API's rows, which are report.summarise: the same as `evals.report`. */
export function Scoreboard({ detail, selected, onSelect }: {
  detail: Detail;
  selected?: { variant: string; caseId?: number };
  onSelect: (variant: string, caseId?: number) => void;
}) {
  const finished = !!detail.batch.finished_at;
  const k = detail.batch.k;
  const rowOf = (variant: string, caseId: number) => detail.rows.find((r) => r.variant === variant && r.case_id === caseId);

  return (
    <div className="table-scroll">
      <table className="grid scoreboard" aria-label="Scoreboard">
        <thead>
          <tr>
            <th>Variant</th><th>Model</th>
            {detail.cases.map((c) => <th key={c.case_id}>Case {c.case_id} · {c.scenario_id} {c.expected_verdict}</th>)}
            <th>pass^k</th><th className="num">Median s</th><th className="num">Infra</th>
          </tr>
        </thead>
        <tbody>
          {detail.variants.map((v) => {
            const rows = detail.cases.map((c) => rowOf(v.name, c.case_id));
            const passed = rows.filter((r) => r?.pass_k === true).length;
            // a case with no run yet is pending while the batch runs, not failed
            const pending = rows.filter((r) => (r ? r.pass_k === null : !finished)).length;
            const counted = detail.runs.filter((r) => r.variant === v.name && r.outcome !== "infra");
            const isSelected = selected?.variant === v.name;
            return (
              <tr key={v.name} aria-selected={isSelected} data-selected={isSelected}>
                <td>
                  <button type="button" className="link" onClick={() => onSelect(v.name)}>{v.name}</button>
                </td>
                <td className="muted">{v.model.replace(/^models\//, "") || "—"}</td>
                {detail.cases.map((c, i) => (
                  <td key={c.case_id} data-tone={tone(rows[i])}
                      data-selected={isSelected && selected?.caseId === c.case_id}
                      onClick={() => onSelect(v.name, c.case_id)} style={{ cursor: "pointer" }}>
                    {cellText(rows[i], k, finished)}
                  </td>
                ))}
                <td>{passed} of {detail.cases.length}{pending ? `, ${pending} pending` : ""}</td>
                <td className="num">{counted.length ? Math.round(median(counted.map((r) => r.duration_ms)) / 1000) : "—"}</td>
                <td className="num">{detail.runs.filter((r) => r.variant === v.name && r.outcome === "infra").length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
