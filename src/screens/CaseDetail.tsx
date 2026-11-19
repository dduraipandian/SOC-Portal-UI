// Case detail: a top band (the case, and what the agent concluded), reading on the left (investigation, timeline,
// rule trace, related cases), and a sidebar on the right (case data tabs, proposed actions, analyst verdict).
import { Link, useParams } from "react-router-dom";
import { useCase, useProposals } from "../api/hooks";
import { ErrorState } from "../components/ErrorState";
import { ProposalCard } from "../components/ProposalCard";
import { Severity } from "../components/Severity";
import { StatusBadge } from "../components/StatusBadge";
import { Age } from "../components/Age";
import { CaseData } from "./case/CaseData";
import { Investigation } from "./case/Investigation";
import { RelatedCases } from "./case/RelatedCases";
import { RuleTrace } from "./case/RuleTrace";
import { Summary } from "./case/Summary";
import { Timeline } from "./case/Timeline";
import { VerdictForm } from "./case/VerdictForm";

function ProposalList({ caseId }: { caseId: number }) {
  const q = useProposals({ caseId });
  return (
    <section aria-label="Proposals">
      <h2>Proposed actions</h2>
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
    <article>
      {q.error && <ErrorState error={q.error} onRetry={() => q.refetch()} lastUpdated={c ? q.dataUpdatedAt : undefined} />}
      {c && (
        <>
          <div className="case-top">
            <header className="page-head card">
              <h1>Case #{c.case_id} <span className="muted">v{c.version}</span></h1>
              <p>
                <Severity level={c.severity} /> <StatusBadge status={c.status} /> opened <Age at={c.opened_at} />,
                updated <Age at={c.updated_at} />
              </p>
              <p className="chips">
                {[...c.entities.hosts, ...c.entities.users, ...c.entities.ips].map((e) => (
                  <span key={e} className="chip">{e}</span>
                ))}
              </p>
            </header>
            <Summary c={c} />
          </div>
          {c.status === "merged" && c.merged_into !== null && (
            <p className="banner">
              This case was merged into <Link to={`/cases/${c.merged_into}`}>#{c.merged_into}</Link>. Its proposals
              no longer apply; work continues there.
            </p>
          )}
          <div className="case-layout">
            <div>
              <Investigation caseId={c.case_id} />
              <Timeline c={c} />
              <RuleTrace c={c} />
              <RelatedCases c={c} />
            </div>
            <aside className="case-side" aria-label="Case sidebar">
              <CaseData c={c} />
              <ProposalList caseId={c.case_id} />
              <VerdictForm c={c} />
            </aside>
          </div>
        </>
      )}
    </article>
  );
}
