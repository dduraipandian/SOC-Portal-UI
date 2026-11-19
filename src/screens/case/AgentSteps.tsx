import { useState } from "react";
import type { Schemas } from "../../api/client";
import { useInvestigationStep } from "../../api/hooks";
import { refusalText } from "../../api/problems";
import { Section } from "../../components/Section";

const n = (x: number) => x.toLocaleString("en-US");
const json = (x: unknown) => JSON.stringify(x, null, 2);

/** One step in full, loaded when its details are opened: the model's message, or the tool's input and output, as
 *  stored when the run happened. Tool output is the vendor's data, so it is shown as text and never interpreted. */
function StepDetail({ investigationId, step }: { investigationId: string; step: Schemas["AgentStep"] }) {
  const q = useInvestigationStep(investigationId, step.index);
  if (q.isPending) return <p className="muted">Loading…</p>;
  if (q.error) return <p role="alert" className="refusal">{refusalText(q.error)}</p>;
  const d = q.data;
  return (
    <div className="step-detail-body">
      {d.kind === "llm" ? (
        <>
          <h4>Message</h4>
          {d.text ? <pre>{d.text}</pre> : <p className="muted">No message: the model only called tools.</p>}
        </>
      ) : (
        <>
          <h4>Input</h4>
          <pre>{json(d.args ?? {})}</pre>
          <h4>Output</h4>
          {d.result !== null && d.result !== undefined
            ? <pre>{json(d.result)}</pre>
            : <p className="muted">Not recorded: this run was saved before tool outputs were kept.</p>}
        </>
      )}
      {d.error && (<><h4>Error</h4><pre>{d.error}</pre></>)}
    </div>
  );
}

/** A step of the timeline; its details are fetched the first time they are opened, not with the list. */
function StepRow({ investigationId, step }: { investigationId: string; step: Schemas["AgentStep"] }) {
  const [opened, setOpened] = useState(false);
  return (
    <li>
      <span className="dot" data-kind={step.kind} aria-hidden="true">{step.kind === "llm" ? "AI" : "⚙"}</span>
      <div>
        <strong>{step.name}</strong>
        <span className="muted"> · {step.kind === "llm" ? "model" : "tool"}</span>
        <p>{step.summary}</p>
        <details className="step-detail" onToggle={(e) => e.currentTarget.open && setOpened(true)}>
          <summary>Details</summary>
          {opened && <StepDetail investigationId={investigationId} step={step} />}
        </details>
      </div>
      <span className="meta">
        {(step.duration_ms / 1000).toFixed(2)} s{step.tokens_in + step.tokens_out > 0 && ` · ${n(step.tokens_in + step.tokens_out)} tok`}
      </span>
    </li>
  );
}

/** What the agent did, in order, as a vertical timeline: model steps marked "AI", tool calls marked with a gear.
 *  Collapsed by default (a long run would push everything below it far down the page); the totals stay visible in
 *  the summary line, and the opened timeline scrolls inside a fixed height. */
export function AgentSteps({ investigationId, steps, title = "Agent steps", open, onOpenChange }: {
  /** The run the steps belong to: each step's details are fetched from it. */
  investigationId: string;
  steps: Schemas["AgentStep"][]; title?: string;
  /** Controlled when given (the parent keeps it across investigations); otherwise the box manages itself, closed. */
  open?: boolean; onOpenChange?: (open: boolean) => void;
}) {
  const ms = steps.reduce((s, x) => s + x.duration_ms, 0);
  const tokens = steps.reduce((s, x) => s + x.tokens_in + x.tokens_out, 0);
  const llm = steps.filter((s) => s.kind === "llm").length;
  const count = `${steps.length} ${steps.length === 1 ? "step" : "steps"} (${llm} model, ${steps.length - llm} tool)`;
  return (
    <Section title={title}>
      <details className="steps-box" open={open} onToggle={onOpenChange && ((e) => onOpenChange(e.currentTarget.open))}>
        <summary className="steps-total">
          <strong>Total</strong>: {count} · {(ms / 1000).toFixed(2)} s · {n(tokens)} tokens
        </summary>
        <div className="steps-scroll">
          <ol className="steps">
            {steps.map((s) => <StepRow key={s.index} investigationId={investigationId} step={s} />)}
          </ol>
        </div>
      </details>
    </Section>
  );
}
