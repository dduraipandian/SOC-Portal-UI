import type { Schemas } from "../../api/client";
import { Section } from "../../components/Section";

const n = (x: number) => x.toLocaleString("en-US");

export function AgentSteps({ steps }: { steps: Schemas["AgentStep"][] }) {
  const ms = steps.reduce((s, x) => s + x.duration_ms, 0);
  const tokens = steps.reduce((s, x) => s + x.tokens_in + x.tokens_out, 0);
  const llm = steps.filter((s) => s.kind === "llm").length;
  const count = `${steps.length} ${steps.length === 1 ? "step" : "steps"} (${llm} model, ${steps.length - llm} tool)`;
  return (
    <Section title="Agent steps">
      <table className="grid">
        <thead>
          <tr><th>Step</th><th>Kind</th><th>What it did</th><th className="num">Time</th><th className="num">Tokens</th></tr>
        </thead>
        <tbody>
          {/* totals first: a long run's steps can push them far down the page */}
          <tr>
            <td colSpan={3}><strong>Total</strong>: {count}</td>
            <td className="num"><strong>{(ms / 1000).toFixed(2)} s</strong></td>
            <td className="num"><strong>{n(tokens)}</strong></td>
          </tr>
          {steps.map((s) => (
            <tr key={s.index}>
              <td>{s.name}</td>
              <td>{s.kind === "llm" ? "model" : "tool"}</td>
              <td>{s.summary}</td>
              <td className="num">{(s.duration_ms / 1000).toFixed(2)} s</td>
              <td className="num">{n(s.tokens_in + s.tokens_out)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}
