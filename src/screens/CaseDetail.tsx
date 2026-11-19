// Case detail, one full-width page read top to bottom: a sticky case bar, what the agent concluded (summary),
// what to do about it (proposed actions and the analyst verdict), why (investigation: evidence, then the agent's
// steps), and the underlying case data in tabs.
import { Link, useParams } from "react-router-dom";
import { useCase, useProposals } from "../api/hooks";
import { ErrorState } from "../components/ErrorState";
import { ProposalCard } from "../components/ProposalCard";
import { Severity } from "../components/Severity";
import { StatusBadge } from "../components/StatusBadge";
import { CaseData } from "./case/CaseData";
import { Investigation } from "./case/Investigation";
import { Summary } from "./case/Summary";
import type { Case } from "./case/types";
import { VerdictForm } from "./case/VerdictForm";

function CaseBar({ c }: { c: Case }) {
  const awaiting = (useProposals({ caseId: c.case_id }).data ?? []).filter((p) => p.status === "proposed").length;
  return (
    <header className="case-bar">
      <Link to="/" className="back"><span aria-hidden="true">←</span> Queue</Link>
      <h1>Case #{c.case_id} <span className="muted">v{c.version}</span></h1>
      <Severity level={c.severity} />
      <StatusBadge status={c.status} />
      <span className="chips">
        {[...c.entities.hosts, ...c.entities.users, ...c.entities.ips].map((e) => (
          <span key={e} className="chip">{e}</span>
        ))}
      </span>
      <span className="grow" />
      {awaiting > 0 && (
        <a href="#decision" className="button jump">{awaiting} proposed {awaiting === 1 ? "action" : "actions"} ↓</a>
      )}
    </header>
  );
}

function ProposalList({ caseId }: { caseId: number }) {
  const q = useProposals({ caseId });
  return (
    <section aria-label="Proposals">
      <h3>Proposed actions</h3>
      {q.error && <ErrorState error={q.error} onRetry={() => q.refetch()} lastUpdated={q.data ? q.dataUpdatedAt : undefined} />}
      {q.data?.length === 0 && <p className="muted">The agent has not proposed an action.</p>}
      <div className="stack">{q.data?.map((p) => <ProposalCard key={p.proposal_id} proposal={p} />)}</div>
    </section>
  );
}

export function CaseDetail() {
  const caseId = Number(useParams().caseId);
  const q = useCase(caseId);
  const c = q.data;
  return (
    <article className="case-page">
      {q.error && <ErrorState error={q.error} onRetry={() => q.refetch()} lastUpdated={c ? q.dataUpdatedAt : undefined} />}
      {c && (
        <>
          <CaseBar c={c} />
          {c.status === "merged" && c.merged_into !== null && (
            <p className="banner">
              This case was merged into <Link to={`/cases/${c.merged_into}`}>#{c.merged_into}</Link>. Its proposals
              no longer apply; work continues there.
            </p>
          )}
          <Summary c={c} />
          <section id="decision" aria-label="Decision" className="decision">
            <h2 className="eyebrow">Decision</h2>
            <div className="decide">
              <ProposalList caseId={c.case_id} />
              <VerdictForm c={c} />
            </div>
          </section>
          <Investigation caseId={c.case_id} />
          <CaseData c={c} />
        </>
      )}
    </article>
  );
}
