import type { Schemas } from "../../api/client";
import { Section } from "../../components/Section";

const n = (x: number) => x.toLocaleString("en-US");

/** What the agent did, in order, as a vertical timeline: model steps marked "AI", tool calls marked with a gear.
 *  Collapsed by default (a long run would push everything below it far down the page); the totals stay visible in
 *  the summary line, and the opened timeline scrolls inside a fixed height. */
export function AgentSteps({ steps, title = "Agent steps" }: { steps: Schemas["AgentStep"][]; title?: string }) {
  const ms = steps.reduce((s, x) => s + x.duration_ms, 0);
  const tokens = steps.reduce((s, x) => s + x.tokens_in + x.tokens_out, 0);
  const llm = steps.filter((s) => s.kind === "llm").length;
  const count = `${steps.length} ${steps.length === 1 ? "step" : "steps"} (${llm} model, ${steps.length - llm} tool)`;
  return (
    <Section title={title}>
      <details className="steps-box">
        <summary className="steps-total">
          <strong>Total</strong>: {count} · {(ms / 1000).toFixed(2)} s · {n(tokens)} tokens
        </summary>
        <div className="steps-scroll">
          <ol className="steps">
            {steps.map((s) => (
              <li key={s.index}>
                <span className="dot" data-kind={s.kind} aria-hidden="true">{s.kind === "llm" ? "AI" : "⚙"}</span>
                <div>
                  <strong>{s.name}</strong>
                  <span className="muted"> · {s.kind === "llm" ? "model" : "tool"}</span>
                  <p>{s.summary}</p>
                </div>
                <span className="meta">
                  {(s.duration_ms / 1000).toFixed(2)} s{s.tokens_in + s.tokens_out > 0 && ` · ${n(s.tokens_in + s.tokens_out)} tok`}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </details>
    </Section>
  );
}
