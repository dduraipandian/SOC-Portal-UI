// Rules (spec 11): suggestions with reasoning and simulation; active, expiring within 7 days, expired.
import { useState } from "react";
import { useRules, useRuleSuggestions } from "../api/hooks";
import { ErrorState } from "../components/ErrorState";
import { RuleTable } from "./rules/RuleTable";
import { SuggestionCard } from "./rules/SuggestionCard";

const TABS = ["Suggestions", "Active", "Expiring within 7 days", "Expired"] as const;
type Tab = (typeof TABS)[number];

function Suggestions() {
  const q = useRuleSuggestions();
  const [refusals, setRefusals] = useState<{ id: number; text: string }[]>([]);
  const refused = (text: string) => setRefusals((r) => [...r, { id: Date.now() + r.length, text }]);
  return (
    <>
      {refusals.map((r) => (
        <div key={r.id} role="alert" className="refusal">
          <p>{r.text}</p>
          <button type="button" className="button quiet" onClick={() => setRefusals((all) => all.filter((x) => x.id !== r.id))}>
            Dismiss
          </button>
        </div>
      ))}
      {q.error && <ErrorState error={q.error} onRetry={() => q.refetch()} lastUpdated={q.data ? q.dataUpdatedAt : undefined} />}
      {q.data?.length === 0 && <p className="empty">No suggestions. The agent suggests rules for benign patterns it sees repeatedly.</p>}
      <div className="proposal-list">{q.data?.map((r) => <SuggestionCard key={r.rule_id} rule={r} onRefused={refused} />)}</div>
    </>
  );
}

function Listed({ tab }: { tab: Exclude<Tab, "Suggestions"> }) {
  const filter = tab === "Expired" ? { status: "expired" as const }
    : tab === "Active" ? { status: "active" as const } : { status: "active" as const, expiringWithinDays: 7 };
  const q = useRules(filter);
  return (
    <>
      {q.error && <ErrorState error={q.error} onRetry={() => q.refetch()} lastUpdated={q.data ? q.dataUpdatedAt : undefined} />}
      {q.data && <RuleTable rules={q.data} renewable={tab !== "Expired"} />}
    </>
  );
}

export function Rules() {
  const [tab, setTab] = useState<Tab>("Suggestions");
  return (
    <section>
      <div className="page-head"><h1>Rules</h1></div>
      <div role="tablist" className="tabs">
        {TABS.map((t) => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <div role="tabpanel" aria-label={tab}>
        {tab === "Suggestions" ? <Suggestions /> : <Listed tab={tab} />}
      </div>
    </section>
  );
}
