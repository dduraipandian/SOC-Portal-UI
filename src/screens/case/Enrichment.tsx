import { Section } from "../../components/Section";
import type { Case } from "./types";

const UNKNOWN = <span className="muted">unknown</span>;

/** The IPs the enricher looked up: the case's entity IPs plus every alert's network destination (enrich.case_ips),
 *  so a C2 address an alert connected to shows its reputation. */
function caseIps(c: Case): { ip: string; destination: boolean }[] {
  const entity = new Set(c.entities.ips);
  const dests = c.alerts.flatMap((a) => (a.network?.dst_ip ? [a.network.dst_ip] : []));
  const all = [...new Set([...entity, ...dests])].sort();
  return all.map((ip) => ({ ip, destination: !entity.has(ip) }));
}

export function Enrichment({ c }: { c: Case }) {
  const en = c.enrichment ?? { assets: {}, users: {}, intel: {}, geo: {} };
  return (
    <Section title="Enrichment">
      <div className="table-scroll">
        <table className="grid">
          <thead><tr><th>Entity</th><th>Details</th></tr></thead>
          <tbody>
            {c.entities.hosts.map((h) => {
              const a = en.assets[h];
              return (
                <tr key={`h-${h}`}>
                  <td>{h}</td>
                  <td>{a ? `${a.criticality} asset, owner ${a.owner}, ${a.os}` : UNKNOWN}</td>
                </tr>
              );
            })}
            {c.entities.users.map((u) => {
              const x = en.users[u];
              return (
                <tr key={`u-${u}`}>
                  <td>{u}</td>
                  <td>{x ? `${x.department}, usually in ${x.usual_country}${x.vip ? ", VIP" : ""}` : UNKNOWN}</td>
                </tr>
              );
            })}
            {caseIps(c).map(({ ip, destination }) => {
              const intel = en.intel[ip];
              const geo = en.geo[ip];
              return (
                <tr key={`i-${ip}`}>
                  <td>
                    <span className="cmd">{ip}</span>
                    {destination && <span className="muted"> (destination)</span>}
                  </td>
                  <td>
                    {intel ? `reputation ${intel.reputation}` : UNKNOWN}
                    {geo ? `, ${geo.city}, ${geo.country}` : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
