import { useState } from "react";
import { Link } from "react-router-dom";
import type { Schemas } from "../../api/client";
import { useApproveRule, useRejectRule, useSimulate } from "../../api/hooks";
import { refusalText } from "../../api/problems";
import { ConfirmReason } from "../../components/ConfirmReason";
import { formatUtc } from "../../components/time";
import { ConditionList } from "./ConditionList";
import { actionText } from "./describe";
import { SimulationPanel } from "./SimulationPanel";

/** `onRefused` reports a refused decision to the screen, so the message survives the card leaving the list
 *  (a refusal usually means someone else decided the rule first). */
export function SuggestionCard({ rule, onRefused }: { rule: Schemas["Rule"]; onRefused: (message: string) => void }) {
  const d = rule.definition;
  const simulate = useSimulate();
  const approve = useApproveRule();
  const reject = useRejectRule();
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const needsSimulation = d.action.type === "auto_close" && !simulate.data;
  const done = { onSuccess: () => setPending(null), onError: (e: unknown) => { setPending(null); onRefused(`${d.name}: ${refusalText(e)}`); } };

  return (
    <article aria-label={d.name} className="proposal">
      <div className="proposal-head">
        <strong>{d.name}</strong>
        <span className="muted">#{rule.rule_id} v{rule.version}, priority {d.priority}</span>
      </div>
      <p><strong>{actionText(d.action)}</strong></p>
      <p>{d.reason}</p>
      <p className="muted">
        Suggested by {d.suggested_by}
        {(d.evidence_case_ids ?? []).length > 0 && <> from cases{" "}
          {(d.evidence_case_ids ?? []).map((id, i) => (
            <span key={id}>{i > 0 && ", "}<Link to={`/cases/${id}`}>#{id}</Link></span>
          ))}</>}
      </p>
      {d.case_conditions && (<><h3>When the case has</h3><ConditionList group={d.case_conditions} /></>)}
      {d.alert_conditions && (<><h3>And every alert has</h3><ConditionList group={d.alert_conditions} /></>)}
      <p className="muted">
        Valid {d.valid_from ? `from ${formatUtc(d.valid_from)}` : "from approval"}
        {d.valid_until ? ` until ${formatUtc(d.valid_until)}` : ", no end"}
      </p>

      {simulate.isError && <div role="alert" className="refusal"><p>{refusalText(simulate.error)}</p></div>}
      {simulate.data && <SimulationPanel sim={simulate.data} />}

      {pending ? (
        <ConfirmReason
          title={`${pending === "approve" ? "Approve" : "Reject"}: ${d.name}`}
          confirmLabel={pending === "approve" ? "Approve this rule" : "Reject this rule"}
          tone={pending === "approve" ? "act" : "refuse"}
          pending={approve.isPending || reject.isPending}
          onCancel={() => setPending(null)}
          onConfirm={(reason) => {
            if (pending === "approve") approve.mutate({ ruleId: rule.rule_id, expectedVersion: rule.version, reason }, done);
            else reject.mutate({ ruleId: rule.rule_id, expectedVersion: rule.version, reason }, done);
          }}
        />
      ) : (
        <div className="actions">
          <button type="button" className="button quiet" disabled={simulate.isPending}
                  onClick={() => simulate.mutate({ rule: d })}>
            Simulate
          </button>
          <button type="button" className="button" disabled={needsSimulation} onClick={() => setPending("approve")}>
            Approve…
          </button>
          <button type="button" className="button refuse" onClick={() => setPending("reject")}>Reject…</button>
          {needsSimulation && <span className="muted">Run a simulation before approving an auto-close rule.</span>}
        </div>
      )}
    </article>
  );
}
