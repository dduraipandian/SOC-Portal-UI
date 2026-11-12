import type { Schemas } from "../../api/client";

export type Case = Schemas["CaseDetail"];
export type CaseEvent = Schemas["CaseEvent"];
export type Alert = Schemas["Alert"];

export type Suppression = { rule_id: number; version: number };

/** alert_id → the rule that explains it (spec 7: partial matches tag alerts as suppressed). */
export function suppressions(events: CaseEvent[]): Map<string, Suppression> {
  const out = new Map<string, Suppression>();
  for (const e of events) {
    if (e.kind === "suppressed") {
      const d = e.data as { alert_id: string; rule_id: number; version: number };
      out.set(d.alert_id, { rule_id: d.rule_id, version: d.version });
    }
  }
  return out;
}
