// Case history that is not an alert: when the case was closed or merged.
import { Section } from "../../components/Section";
import { formatUtc } from "../../components/time";
import { type Case, type CaseEvent } from "./types";

function eventText(e: CaseEvent): string {
  const d = e.data as Record<string, unknown>;
  switch (e.kind) {
    case "closed":
      return `Closed as ${String(d.verdict)} by ${d.by === "rule" ? `rule #${d.rule_id} v${d.version}` : String(d.closed_by ?? "analyst")}`;
    case "merged":
      return `Merged ${d.into ? `into #${String(d.into)}` : ""}`.trim();
    default:
      return e.kind.replace(/_/g, " ");
  }
}

export function Timeline({ c }: { c: Case }) {
  const events = c.events.filter((e) => e.kind === "closed" || e.kind === "merged")
    .sort((a, b) => a.at.localeCompare(b.at));
  if (events.length === 0) return null;
  return (
    <Section title="Timeline">
      <ol className="timeline">
        {events.map((e) => (
          <li key={e.id} data-kind="event">
            <div className="muted">{formatUtc(e.at)}</div>
            {eventText(e)}
          </li>
        ))}
      </ol>
    </Section>
  );
}
