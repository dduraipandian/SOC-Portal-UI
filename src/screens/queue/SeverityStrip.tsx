// A glance at the queue: how many open cases at each severity, and how many are waiting for an analyst.
import type { Schemas } from "../../api/client";

type Item = Schemas["QueueItem"];
const NAMES = ["", "Info", "Low", "Medium", "High", "Critical"];

/** An open case whose agent has finished (a verdict to review) or failed (a human has to look). */
export function needsAttention(c: Item): boolean {
  return c.status === "open" && (c.agent_status === "done" || c.agent_status === "failed");
}

export function SeverityStrip({ items }: { items: Item[] }) {
  const open = items.filter((c) => c.status === "open");
  const count = (level: number) => open.filter((c) => c.severity === level).length;
  const attention = items.filter(needsAttention).length;
  return (
    <ul className="strip" aria-label="Open cases by severity">
      <li className="strip-attention" data-active={attention > 0} aria-label={`Needs attention: ${attention} open`}>
        <span className="strip-n" aria-hidden="true">{attention}</span>
        <span aria-hidden="true">Needs attention</span>
      </li>
      {[5, 4, 3, 2, 1].map((level) => (
        <li key={level} data-level={level} aria-label={`Severity ${level}: ${count(level)} open`}>
          <span className="strip-n" aria-hidden="true">{count(level)}</span>
          <span aria-hidden="true">{NAMES[level]}</span>
        </li>
      ))}
    </ul>
  );
}
