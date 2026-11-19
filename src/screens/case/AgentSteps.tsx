import type { Schemas } from "../../api/client";
import { Section } from "../../components/Section";

const n = (x: number) => x.toLocaleString("en-US");

/** What the agent did, in order, as a vertical timeline: model steps marked "AI", tool calls marked with a gear. */
export function AgentSteps({ steps, title = "Agent steps" }: { steps: Schemas["AgentStep"][]; title?: string }) {
  const ms = steps.reduce((s, x) => s + x.duration_ms, 0);
  const tokens = steps.reduce((s, x) => s + x.tokens_in + x.tokens_out, 0);
  const llm = steps.filter((s) => s.kind === "llm").length;
  const count = `${steps.length} ${steps.length === 1 ? "step" : "steps"} (${llm} model, ${steps.length - llm} tool)`;
  return (
    <Section title={title}>
      {/* totals first: a long run's steps can push them far down the page */}
      <p className="steps-total">
        <strong>Total</strong>: {count} · {(ms / 1000).toFixed(2)} s · {n(tokens)} tokens
      </p>
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
    </Section>
  );
}
