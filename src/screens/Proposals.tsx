// Every proposal across cases, grouped by status, decisions first.
import type { Schemas } from "../api/client";
import { useProposals } from "../api/hooks";
import { ErrorState } from "../components/ErrorState";
import { ProposalCard } from "../components/ProposalCard";

const GROUPS: [Schemas["ProposalStatus"], string][] = [
  ["proposed", "Waiting for a decision"], ["approved", "Approved"], ["executing", "Executing"],
  ["succeeded", "Succeeded"], ["failed", "Failed"], ["rejected", "Rejected"], ["superseded", "Superseded"],
  ["expired", "Expired"],
];

export function Proposals() {
  const q = useProposals();
  return (
    <section>
      <h1>Proposals</h1>
      <div className="filters">
        <button type="button" className="button quiet" onClick={() => q.refetch()}>Refresh</button>
      </div>
      {q.error && <ErrorState error={q.error} onRetry={() => q.refetch()} lastUpdated={q.data ? q.dataUpdatedAt : undefined} />}
      {q.data?.length === 0 && <p className="empty">No proposals yet. The agent proposes actions as it investigates cases.</p>}
      {/* One keyed list: a card that changes status moves within it and keeps its state (e.g. a refusal). */}
      <div className="proposal-list">
        {GROUPS.flatMap(([status, label]) => {
          const items = (q.data ?? []).filter((p) => p.status === status);
          if (items.length === 0) return [];
          return [
            <h2 key={`h-${status}`}>{label} ({items.length})</h2>,
            ...items.map((p) => <ProposalCard key={p.proposal_id} proposal={p} />),
          ];
        })}
      </div>
    </section>
  );
}
