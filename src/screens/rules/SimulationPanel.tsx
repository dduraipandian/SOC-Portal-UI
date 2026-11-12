import { Link } from "react-router-dom";
import type { Schemas } from "../../api/client";
import { Section } from "../../components/Section";

const Samples = ({ ids }: { ids: number[] }) => (
  <span className="chips">{ids.map((id) => <Link key={id} to={`/cases/${id}`}>#{id}</Link>)}</span>
);

export function SimulationPanel({ sim }: { sim: Schemas["SimulationResult"] }) {
  return (
    <Section title="Simulation">
      <p className="muted">{sim.cases_considered} cases from the last {sim.lookback_days} days</p>
      <div className="sim">
        <div><span>Would close</span><span className="metric">{sim.full.count}</span><Samples ids={sim.full.sample_case_ids} /></div>
        <div><span>Would only tag</span><span className="metric">{sim.partial.count}</span><Samples ids={sim.partial.sample_case_ids} /></div>
        <div data-warn={sim.full_marked_malicious > 0}>
          <span>Marked malicious by analysts</span><span className="metric">{sim.full_marked_malicious}</span>
        </div>
        <div data-warn={sim.full_ground_truth_attacks > 0}>
          <span>Known attacks (lab ground truth)</span><span className="metric">{sim.full_ground_truth_attacks}</span>
        </div>
      </div>
    </Section>
  );
}
