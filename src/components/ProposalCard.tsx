// One proposed action, showing exactly what an approval binds to (spec 8, 10): action, target, every param,
// rationale, case version, investigation, evidence hash and the approval hash.
import { useState } from "react";
import { Link } from "react-router-dom";
import type { Schemas } from "../api/client";
import { useApprove, useReject, useUndo } from "../api/hooks";
import { refusalText } from "../api/problems";
import { ConfirmReason } from "./ConfirmReason";
import { Fingerprint } from "./Fingerprint";
import { StatusBadge } from "./StatusBadge";
import { formatIn, formatUtc } from "./time";

type Proposal = Schemas["ActionProposal"];
type Pending = { kind: "approve"; hash: string } | { kind: "reject" } | { kind: "undo" };

const LABEL: Record<Proposal["action_type"], string> = {
  contain_host: "Contain host", release_host: "Release host", suspend_user: "Suspend user",
  unsuspend_user: "Unsuspend user", disable_key: "Disable key", enable_key: "Enable key",
};
const FORWARD = new Set(["contain_host", "suspend_user", "disable_key"]);

export function ProposalCard({ proposal: p }: { proposal: Proposal }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const approve = useApprove();
  const reject = useReject();
  const undo = useUndo();
  const inFlight = approve.isPending || reject.isPending || undo.isPending;

  const canDecide = p.status === "proposed";
  const canUndo = p.status === "succeeded" && FORWARD.has(p.action_type);
  const final = !canDecide && !canUndo && p.status !== "approved" && p.status !== "executing";
  const title = `${LABEL[p.action_type]} on ${p.target.resource_id}`;

  const done = { onSuccess: () => setPending(null), onError: (e: unknown) => { setPending(null); setRefusal(refusalText(e)); } };
  const confirm = (reason: string) => {
    setRefusal(null);
    if (pending?.kind === "approve") {
      approve.mutate({ proposalId: p.proposal_id, approvalHash: pending.hash, reason }, done);
    } else if (pending?.kind === "reject") {
      reject.mutate({ proposalId: p.proposal_id, reason }, done);
    } else if (pending?.kind === "undo") {
      undo.mutate({ proposalId: p.proposal_id, reason }, done);
    }
  };

  return (
    <article aria-label={title} className="proposal" data-final={final}>
      <div className="proposal-head">
        <strong>{title}</strong>
        <StatusBadge status={p.status} />
      </div>
      <p className="muted">
        {p.target.vendor}, for <Link to={`/cases/${p.case_id}`}>Case #{p.case_id} v{p.case_version}</Link>
        {(p.status === "proposed" || p.status === "approved") && <>, expires {formatIn(p.expires_at)}</>}
      </p>
      {p.reverses_proposal_id && <p className="muted">Undoes {p.reverses_proposal_id}</p>}
      <table className="grid" aria-label="Parameters">
        <tbody>
          {Object.entries(p.params).map(([k, v]) => (
            <tr key={k}><td className="cmd">{k}</td><td className="cmd">{JSON.stringify(v)}</td></tr>
          ))}
        </tbody>
      </table>
      <p>{p.rationale}</p>
      <dl className="kv">
        <dt>Investigation</dt><dd className="hash">{p.investigation_id}</dd>
        <dt>Evidence hash</dt><dd className="hash">{p.evidence_hash}</dd>
        <dt>Created</dt><dd>{formatUtc(p.created_at)}</dd>
      </dl>
      <Fingerprint hash={p.approval_hash} label="Approval hash" />

      {refusal && <div role="alert" className="refusal"><p>{refusal}</p></div>}

      {pending ? (
        <ConfirmReason
          title={pending.kind === "approve" ? `Approve: ${title}` : pending.kind === "reject" ? `Reject: ${title}` : `Undo: ${title}`}
          confirmLabel={pending.kind === "approve" ? "Approve this action" : pending.kind === "reject" ? "Reject this action" : "Propose the undo"}
          tone={pending.kind === "reject" ? "refuse" : "act"}
          pending={inFlight}
          onConfirm={confirm}
          onCancel={() => setPending(null)}
        >
          {pending.kind === "approve" && (
            <>
              <p className="muted">You approve exactly this hash. If the proposal changes, the approval is refused.</p>
              <Fingerprint hash={pending.hash} label="Approving hash" />
            </>
          )}
          {pending.kind === "undo" && <p className="muted">This creates a new proposal; it needs its own approval.</p>}
        </ConfirmReason>
      ) : (
        (canDecide || canUndo) && (
          <div className="actions">
            {canDecide && (
              <>
                <button type="button" className="button" onClick={() => setPending({ kind: "approve", hash: p.approval_hash })}>
                  Approve…
                </button>
                <button type="button" className="button refuse" onClick={() => setPending({ kind: "reject" })}>Reject…</button>
              </>
            )}
            {canUndo && (
              <button type="button" className="button quiet" onClick={() => setPending({ kind: "undo" })}>Undo…</button>
            )}
          </div>
        )
      )}
    </article>
  );
}
