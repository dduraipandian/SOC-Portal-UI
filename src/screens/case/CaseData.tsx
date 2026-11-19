// The facts about a case, in one tabbed panel: the alerts that built it, and what is known about its entities.
// The panel body has a fixed height and scrolls, so the decisions below it never get pushed out of reach.
import { useState } from "react";
import { Alerts } from "./Alerts";
import { Enrichment } from "./Enrichment";
import type { Case } from "./types";

const TABS = ["Alerts", "Enrichment"] as const;
type Tab = (typeof TABS)[number];

export function CaseData({ c }: { c: Case }) {
  const [tab, setTab] = useState<Tab>("Alerts");
  return (
    <div className="card case-data">
      <div role="tablist" aria-label="Case data" className="tabs">
        {TABS.map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <div role="tabpanel" aria-label={tab} className="tab-body">
        {tab === "Alerts" ? <Alerts c={c} /> : <Enrichment c={c} />}
      </div>
    </div>
  );
}
