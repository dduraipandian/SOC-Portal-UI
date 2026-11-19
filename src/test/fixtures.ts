// Typed fixtures for component tests, shaped by portal_api/openapi.yaml (src/api/schema.d.ts).
import type { components } from "../api/schema";

type S = components["schemas"];
export type CaseDetail = S["CaseDetail"];
export type QueueItem = S["QueueItem"];
export type Proposal = S["ActionProposal"];
export type Rule = S["Rule"];

export const T0 = "2026-11-07T10:00:00Z";
export const HASH_41 = "9f2c4e1a7b3d5f60" + "a1b2c3d4e5f60718" + "293a4b5c6d7e8f90" + "0123456789abcdef";
export const XSS = "<img src=x onerror=alert(1)>";

const entities = (hosts: string[], users: string[], ips: string[] = []) => ({ hosts, users, ips });

export function queueItem(over: Partial<QueueItem> = {}): QueueItem {
  return {
    case_id: 41, version: 3, status: "open", severity: 5, entities: entities(["web-srv-01"], ["www-data"]),
    opened_at: T0, updated_at: "2026-11-07T10:04:00Z", merged_into: null, related_case_ids: [], alert_count: 3,
    agent_status: "done", ...over,
  };
}

export const QUEUE: QueueItem[] = [
  queueItem(),
  queueItem({ case_id: 57, version: 1, severity: 4, entities: entities(["build-01"], ["svc-maint", "root"]),
              alert_count: 2, updated_at: "2026-11-07T09:50:00Z" }),
  queueItem({ case_id: 52, version: 2, status: "merged", severity: 3, merged_into: 41,
              entities: entities(["web-srv-01"], []), alert_count: 1, agent_status: "superseded" }),
  queueItem({ case_id: 60, version: 1, severity: 2, entities: entities([], ["arun.m"], ["198.51.100.20"]),
              alert_count: 1, agent_status: "pending" }),
];

type Alert = S["Alert"];
export function alert(over: Partial<Alert> = {}): Alert {
  return {
    alert_id: "00000000-0000-0000-0000-000000000001", source: "sentrix-edr", vendor_event_id: "det-1",
    time: T0, severity: 5, category: "connection_to_known_bad_ip", technique: "T1071",
    entities: { host: "web-srv-01", user: "www-data", ip: null },
    process: { cmd: "curl -s http://203.0.113.50:8443/beacon", user: "www-data", pid: 77, parent_cmd: "bash",
               ancestors: [{ cmd: "/usr/sbin/apache2 -k start", user: "root", pid: 1 }] },
    network: { dst_ip: "203.0.113.50", dst_port: 8443 }, file: null, raw: {}, ...over,
  };
}

export function caseDetail(over: Partial<CaseDetail> = {}): CaseDetail {
  return {
    case_id: 41, version: 3, status: "open", severity: 5, entities: entities(["web-srv-01"], ["www-data"]),
    alerts: [alert()], opened_at: T0, updated_at: "2026-11-07T10:04:00Z", merged_into: null,
    related_case_ids: [12],
    enrichment: { assets: { "web-srv-01": { owner: "it", criticality: "critical", os: "Debian 12" } },
                  users: {}, intel: { "203.0.113.50": { reputation: "malicious", source: "lab-intel" } }, geo: {} },
    events: [{ id: 1, version: 3, kind: "rule_decision", at: T0,
               data: { rule_id: 3, version: 2, name: "Critical asset severity floor", action: "set_severity",
                       result: "full", matched_alert_ids: [] } }],
    verdict: null, closed_by: null, close_note: null, closed_at: null, ...over,
  };
}

const S6_ALERT = "00000000-0000-0000-0000-000000000006";
export const CASE_57 = caseDetail({
  case_id: 57, version: 1, severity: 4, entities: entities(["build-01"], ["svc-maint", "root"]),
  alerts: [
    alert({ alert_id: S6_ALERT, category: "sensitive_file_read", technique: "T1003.008", network: null,
            entities: { host: "build-01", user: "svc-maint", ip: null },
            process: { cmd: "awk -F: {print $1, $5} /etc/shadow", user: "svc-maint", pid: 318,
                       parent_cmd: "/bin/bash /opt/maint/nightly.sh",
                       ancestors: [{ cmd: "/usr/sbin/cron -f", user: "root", pid: 1 }] },
            file: { path: "/etc/shadow", mode: "read" } }),
    alert({ alert_id: "00000000-0000-0000-0000-000000000002", entities: { host: "build-01", user: "root", ip: null } }),
  ],
  enrichment: { assets: { "build-01": { owner: "it", criticality: "high", os: "Debian 12" } }, users: {}, intel: {},
                geo: {} },
  events: [
    { id: 4, version: 1, kind: "rule_decision", at: T0,
      data: { rule_id: 7, version: 2, name: "build-01 nightly password-expiry audit", action: "auto_close",
              result: "partial", matched_alert_ids: [S6_ALERT] } },
    { id: 5, version: 1, kind: "suppressed", at: T0, data: { alert_id: S6_ALERT, rule_id: 7, version: 2 } },
  ],
});

export const CASE_52 = caseDetail({ case_id: 52, version: 2, status: "merged", merged_into: 41, severity: 3 });

export const INVESTIGATIONS_41: S["Investigations"] = {
  case_id: 41, agent_status: "done", history: [], last_failure: null,
  latest: {
    schema_version: "1", investigation_id: "aaaaaaaa-0000-0000-0000-000000000041", case_id: 41, case_version: 3,
    verdict: "malicious", confidence: 0.82, rationale: "Beaconing to a known-bad IP from web-srv-01.",
    evidence: [{ tool: "edr.process_tree", args: { host: "web-srv-01" }, result_digest: "c".repeat(64),
                 result_excerpt: "curl -s http://203.0.113.50:8443/beacon", captured_at: T0 }],
    evidence_hash: "e".repeat(64), completed_at: T0,
    steps: [
      { index: 0, kind: "request", name: "request", started_at: T0, duration_ms: 0, tokens_in: 0, tokens_out: 0,
        summary: "the question given to the agent" },
      { index: 1, kind: "llm", name: "plan", started_at: T0, duration_ms: 1840, tokens_in: 2310, tokens_out: 212,
        summary: "Decide which tools to call." },
      { index: 2, kind: "tool", name: "edr.process_tree", started_at: T0, duration_ms: 120, tokens_in: 0,
        tokens_out: 0, summary: "Process tree." },
      { index: 3, kind: "llm", name: "verdict", started_at: T0, duration_ms: 2410, tokens_in: 3120,
        tokens_out: 388, summary: "Verdict: malicious." },
    ],
  },
};

/** The full steps of INVESTIGATIONS_41's latest run, by index, as GET /investigations/{id}/steps/{index} returns them. */
// typed, not cast, so a field the contract adds has to be filled in here too
const steps41: Omit<S["StepDetail"], "investigation_id">[] = [
  { index: 0, kind: "request", name: "request", text: `Case 41: 3 alert(s) on host(s) web-srv-01. ${XSS}`,
    thought: null, args: null, result: null, error: null },
  { index: 1, kind: "llm", name: "plan", text: null, thought: "The alert is on web-srv-01; start with its process tree.",
    args: null, result: null, error: null },
  { index: 2, kind: "tool", name: "edr.process_tree", text: null, thought: null, args: { host: "web-srv-01", pid: 4312 },
    result: { found: true, process: { cmdline: "curl -s http://203.0.113.50:8443/beacon" }, note: XSS }, error: null },
  { index: 3, kind: "llm", name: "verdict", text: "Beaconing confirmed; submitting.", thought: null, args: null,
    result: null, error: null },
];
export const STEPS_41: Record<number, S["StepDetail"]> = Object.fromEntries(
  steps41.map((s) => [s.index, { investigation_id: "aaaaaaaa-0000-0000-0000-000000000041", ...s }]),
);

export function proposal(over: Partial<Proposal> = {}): Proposal {
  return {
    schema_version: "1", proposal_id: "bbbbbbbb-0000-0000-0000-000000000041", case_id: 41, case_version: 3,
    investigation_id: "aaaaaaaa-0000-0000-0000-000000000041", evidence_hash: "e".repeat(64),
    action_type: "contain_host", reverses_proposal_id: null,
    target: { vendor: "sentrix-edr", resource_id: "web-srv-01" }, params: { isolation: "network" },
    rationale: "Beaconing to a known-bad IP from web-srv-01.", approval_hash: HASH_41,
    created_at: "2026-11-07T10:05:00Z", expires_at: "2026-11-07T11:05:00Z", status: "proposed", ...over,
  };
}

export function rule(over: Partial<Rule> = {}, defn: Partial<Rule["definition"]> = {}): Rule {
  const definition: Rule["definition"] = {
    name: "build-01 nightly password-expiry audit", priority: 100,
    case_conditions: { all: [{ field: "entities.hosts", quantifier: "all", op: "eq", value: "build-01" }], any: null },
    alert_conditions: { all: [{ field: "process.user", op: "eq", value: "svc-maint", quantifier: null },
                              { field: "process.ancestors.cmd", quantifier: "any", op: "regex",
                                value: "^/usr/sbin/cron( |$)" }], any: null },
    action: { type: "auto_close", verdict: "benign", severity: null },
    reason: "Scheduled maintenance by svc-maint; seen daily with identical arguments.",
    valid_from: null, valid_until: "2026-12-07T00:00:00Z", suggested_by: "agent", evidence_case_ids: [57, 63],
    ...defn,
  };
  return {
    rule_id: 7, version: 1, status: "suggested", definition, created_at: T0, updated_at: T0,
    versions: [{ version: 1, status: "suggested", definition, changed_by: "agent", changed_at: T0, note: null }],
    ...over,
  };
}

export const SIMULATION: S["SimulationResult"] = {
  simulation_id: "11111111-1111-1111-1111-111111111111", lookback_days: 30, cases_considered: 40,
  full: { count: 6, sample_case_ids: [57, 63] }, partial: { count: 2, sample_case_ids: [70] },
  full_marked_malicious: 0, full_ground_truth_attacks: 0,
};

export const HEALTH: S["Health"] = {
  consumer_lag: [{ group: "normalizer", topic: "alerts.raw", lag: 0 }, { group: "rules", topic: "cases.enriched", lag: 3 }],
  outbox: { backlog: 0, oldest_unsent_age_s: null, failed: 0 },
  dlq: { messages: 0 },
  last_pull: { "sentrix-edr": "2026-11-07T10:04:50Z", "keyline-idp": "2026-11-07T10:04:45Z", "nimbus-cloud": null },
};
