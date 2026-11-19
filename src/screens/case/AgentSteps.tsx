import { useEffect, useId, useState, type KeyboardEvent } from "react";
import type { Schemas } from "../../api/client";
import { useInvestigationStep } from "../../api/hooks";
import { refusalText } from "../../api/problems";
import { Section } from "../../components/Section";

type Step = Schemas["AgentStep"];

const n = (x: number) => x.toLocaleString("en-US");
const json = (x: unknown) => JSON.stringify(x, null, 2);
const DOT: Record<Step["kind"], string> = { request: "Q", llm: "AI", tool: "⚙" };

/** How a step is named in the list and the pane: "Request" and "Model" once each (their API names repeat the kind),
 *  and a tool by its own name, marked as a tool. */
function StepLabel({ step }: { step: Step }) {
  if (step.kind === "request") return <strong>Request</strong>;
  if (step.kind === "llm") return <strong>Model</strong>;
  return <><strong>{step.name}</strong><span className="muted">tool</span></>;
}

/** The selected step in full, fetched when it is shown: the question the agent was given, the model's thinking
 *  summary and message, or the tool's input and output, as stored when the run happened. Everything here is shown as
 *  text and never interpreted: tool output is the vendor's data, and the request quotes alert fields. */
function StepDetail({ investigationId, step }: { investigationId: string; step: Step }) {
  const q = useInvestigationStep(investigationId, step.index);
  if (q.isPending) return <p className="muted">Loading…</p>;
  if (q.error) return <p role="alert" className="refusal">{refusalText(q.error)}</p>;
  const d = q.data;
  return (
    <div className="step-detail-body">
      {d.kind === "request" && <pre>{d.text ?? ""}</pre>}
      {d.kind === "llm" && (
        <>
          {d.thought && (<><h4>Thinking summary</h4><pre>{d.thought}</pre></>)}
          <h4>Message</h4>
          {d.text ? <pre>{d.text}</pre> : <p className="muted">No message: the model only called tools.</p>}
        </>
      )}
      {d.kind === "tool" && (
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

const meta = (s: Step) =>
  `${(s.duration_ms / 1000).toFixed(2)} s${s.tokens_in + s.tokens_out > 0 ? ` · ${n(s.tokens_in + s.tokens_out)} tok` : ""}`;

/** What the agent did, in order: the request it was given, then its model and tool steps. The list is on the left and
 *  the selected step's detail on the right; Up/Down (and Home/End) move the selection. Collapsed by default (a long run
 *  would push everything below it far down the page); the totals stay visible in the summary line. */
export function AgentSteps({ investigationId, steps, title = "Agent steps", open, onOpenChange }: {
  /** The run the steps belong to: the selected step's detail is fetched from it. */
  investigationId: string;
  steps: Step[]; title?: string;
  /** Controlled when given (the parent keeps it across investigations); otherwise the box manages itself, closed. */
  open?: boolean; onOpenChange?: (open: boolean) => void;
}) {
  const ids = useId();
  const [shown, setShown] = useState(open ?? false);              // nothing is fetched while the box is closed
  const [selected, setSelected] = useState(0);                    // a position in `steps`
  const current = steps[Math.min(selected, steps.length - 1)];
  const optionId = (i: number) => `${ids}-step-${i}`;

  useEffect(() => {
    // keep the selection visible when the keyboard moves it past the edge of the scrolling list
    if (shown) document.getElementById(optionId(selected))?.scrollIntoView?.({ block: "nearest" });
  }, [selected, shown]);

  function onKeyDown(e: KeyboardEvent<HTMLOListElement>) {
    const next = { ArrowDown: selected + 1, ArrowUp: selected - 1, Home: 0, End: steps.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();                                           // the keys move the selection, not the page
    setSelected(Math.max(0, Math.min(steps.length - 1, next)));
  }

  const work = steps.filter((s) => s.kind !== "request");         // the request is shown, but not counted as a step
  const ms = steps.reduce((s, x) => s + x.duration_ms, 0);
  const tokens = steps.reduce((s, x) => s + x.tokens_in + x.tokens_out, 0);
  const llm = work.filter((s) => s.kind === "llm").length;
  const count = `${work.length} ${work.length === 1 ? "step" : "steps"} (${llm} model, ${work.length - llm} tool)`;
  return (
    <Section title={title}>
      <details className="steps-box" open={open}
               onToggle={(e) => { setShown(e.currentTarget.open); onOpenChange?.(e.currentTarget.open); }}>
        <summary className="steps-total">
          <strong>Total</strong>: {count} · {(ms / 1000).toFixed(2)} s · {n(tokens)} tokens
        </summary>
        <div className="steps-split">
          <div className="steps-scroll">
            <ol className="steps" role="listbox" aria-label="Steps" tabIndex={0} onKeyDown={onKeyDown}
                aria-activedescendant={current ? optionId(selected) : undefined}>
              {steps.map((s, i) => (
                <li key={s.index} id={optionId(i)} role="option" aria-selected={i === selected}
                    onClick={() => setSelected(i)}>
                  <span className="dot" data-kind={s.kind} aria-hidden="true">{DOT[s.kind]}</span>
                  <div>
                    <div className="step-head">
                      <StepLabel step={s} />
                      {s.kind !== "request" && <span className="meta">{meta(s)}</span>}
                    </div>
                    <p title={s.summary}>{s.summary}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <section className="step-pane" aria-label="Step detail">
            {current && (
              <>
                <h3 className="step-pane-title step-head"><StepLabel step={current} /></h3>
                {shown && <StepDetail key={current.index} investigationId={investigationId} step={current} />}
              </>
            )}
          </section>
        </div>
      </details>
    </Section>
  );
}
