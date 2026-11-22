import type { Schemas } from "../../api/client";

type Grade = Schemas["EvalGrade"];

const PROCESS_CHECKS: Record<string, string> = {
  tree_at_alert_time: "no process tree at the alert time",
  history_search: "no history search for what the alert is about",
  looked_before_submit: "submitted before any lookup",
};

const list = (x: unknown): string[] => (Array.isArray(x) ? x.map(String) : []);

/** One line per check, in words, from the grade's details (the graders in pipeline/soc_agent/evals/graders.py). */
export function why(grade: Grade): string {
  const d = grade.details as Record<string, unknown>;
  switch (grade.grader) {
    case "verdict":
      return `expected ${d.expected ?? "?"}, got ${d.actual ?? d.got ?? "nothing"}`;
    case "process": {
      const failed = Object.keys(PROCESS_CHECKS).filter((k) => d[k] === false).map((k) => PROCESS_CHECKS[k]);
      return failed.length ? failed.join(" · ") : "process tree at the alert time, history search, looked before submitting";
    }
    case "grounding": {
      if (d.reason) return String(d.reason);
      if (grade.version >= 2) {
        // v2+: each fact must be in the step it cites; a label is "<value> (step n)"
        const absent = Object.entries((d.missing ?? {}) as Record<string, unknown>)
          .map(([label, what]) => `${list(what).join(", ")} ${label.slice(label.lastIndexOf("(step"))}`);
        return absent.length ? `not in the step it cites: ${absent.join(" · ")}` : "every fact is in the step it cites";
      }
      const missing = Object.values((d.missing ?? {}) as Record<string, unknown>).flatMap(list);
      if (missing.length) return `not shown to the agent: ${missing.join(", ")}`;
      const unsupported = list(d.unsupported);
      return unsupported.length ? `not shown to the agent: ${unsupported.join(", ")}` : "every evidence fact was shown to the agent";
    }
    case "rationale_human":
      return `${d.reviewer ?? "someone"}: ${d.note ?? "no note"}`;
    default:
      return "";
  }
}

/** The diagnostics in one line: they never decide correctness. */
export function diagnostics(grades: Grade[]): string {
  const g = Object.fromEntries(grades.map((x) => [x.grader, x.details as Record<string, unknown>]));
  const parts: string[] = [];
  const missed = list(g.entity_mention?.missing);
  if (missed.length) parts.push(`rationale never names ${missed.join(", ")}`);
  if (g.errors) parts.push(`${g.errors.tool_errors ?? 0} tool errors, ${g.errors.rejected_submits ?? 0} rejected submits`);
  if (g.cost) parts.push(`${g.cost.model_calls ?? 0} model calls, ${g.cost.tool_calls ?? 0} tool calls`);
  return parts.join(" · ");
}
