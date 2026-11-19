// The facts about a case, in one full-width tabbed panel: the alerts that built it, what is known about its
// entities, which rules touched it, related cases, and its closed/merged history.
import { useState, type ReactNode } from "react";
import { Alerts } from "./Alerts";
import { Enrichment } from "./Enrichment";
import { RelatedCases } from "./RelatedCases";
import { RuleTrace } from "./RuleTrace";
import { Timeline } from "./Timeline";
import type { Case } from "./types";

const TABS = ["Alerts", "Enrichment", "Rule trace", "Related cases", "Timeline"] as const;
type Tab = (typeof TABS)[number];

export function CaseData({ c }: { c: Case }) {
  const [tab, setTab] = useState<Tab>("Alerts");
  const counts: Partial<Record<Tab, number>> = { Alerts: c.alerts.length, "Related cases": c.related_case_ids.length };
  const panel: Record<Tab, ReactNode> = {
    Alerts: <Alerts c={c} />,
    Enrichment: <Enrichment c={c} />,
    "Rule trace": <RuleTrace c={c} />,
    "Related cases": <RelatedCases c={c} />,
    Timeline: <Timeline c={c} />,
  };
  return (
    <section className="case-data" aria-label="Case data">
      <h2 className="eyebrow">Case data</h2>
      <div role="tablist" aria-label="Case data" className="tabs">
        {TABS.map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t}
            {counts[t] !== undefined && <small aria-hidden="true">{counts[t]}</small>}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={tab} className="tab-body">{panel[tab]}</div>
    </section>
  );
}
