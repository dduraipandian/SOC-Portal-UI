import { Link } from "react-router-dom";
import { Section } from "../../components/Section";
import type { Case } from "./types";

export function RelatedCases({ c }: { c: Case }) {
  return (
    <Section title="Related cases">
      {c.related_case_ids.length === 0 ? (
        <p className="muted">No related cases.</p>
      ) : (
        <ul>
          {c.related_case_ids.map((id) => (
            <li key={id}>Shares an entity with <Link to={`/cases/${id}`}>#{id}</Link></li>
          ))}
        </ul>
      )}
    </Section>
  );
}
