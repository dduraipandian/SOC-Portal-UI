import type { Schemas } from "../api/client";

type Evidence = Schemas["EvidenceItem"];
type Step = Schemas["AgentStep"];

/** What a citation points at, in words: the case for step 0, else the tool that ran at that step. */
function source(step: number, steps: Step[]): string {
  const cited = steps.find((s) => s.step === step);
  if (!cited) return "";
  return cited.kind === "request" ? "case" : cited.name;
}

/** The facts behind a verdict, each with the step it was copied from. [n] opens that step in the agent steps;
 *  ⚠ marks a value that is not in the step it cites. Evidence from before citations has no step to show. */
export function EvidenceTable({ evidence, steps, onCite }: {
  evidence: Evidence[]; steps: Step[]; onCite: (step: number) => void;
}) {
  if (evidence.length === 0) return <p className="muted">No evidence submitted.</p>;
  return (
    <div className="table-scroll">
      <table className="grid evidence">
        <thead><tr><th>Fact</th><th>Value</th><th>Source</th></tr></thead>
        <tbody>
          {evidence.map((e, i) => (
            <tr key={i}>
              <td>{e.fact}</td>
              <td className="cmd">
                {e.value}
                {e.verified === false && (
                  <span className="unverified" title="Not found in the step it cites">
                    {" "}⚠<span className="sr-only"> not found in the step it cites</span>
                  </span>
                )}
              </td>
              <td className="cite">
                {e.step == null ? <span className="muted">—</span> : (
                  <button type="button" className="link" onClick={() => onCite(e.step!)}
                          aria-label={`Open step ${e.step}`}>
                    [{e.step}]
                  </button>
                )}{" "}
                {e.step != null && <span className="muted">{source(e.step, steps)}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
