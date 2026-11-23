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
    evidence: [{ fact: "beacon command", value: "curl -s http://203.0.113.50:8443/beacon", step: 2, verified: true }],
    evidence_hash: "e".repeat(64), completed_at: T0,
    steps: [
      { trace_seq: 0, step: 0, kind: "request", name: "request", started_at: T0, duration_ms: 0, tokens_in: 0, tokens_out: 0,
        summary: "the question given to the agent" },
      { trace_seq: 1, step: 1, kind: "llm", name: "plan", started_at: T0, duration_ms: 1840, tokens_in: 2310, tokens_out: 212,
        summary: "Decide which tools to call." },
      { trace_seq: 2, step: 2, kind: "tool", name: "edr.process_tree", started_at: T0, duration_ms: 120, tokens_in: 0,
        tokens_out: 0, summary: "Process tree." },
      { trace_seq: 3, step: 3, kind: "llm", name: "verdict", started_at: T0, duration_ms: 2410, tokens_in: 3120,
        tokens_out: 388, summary: "Verdict: malicious." },
    ],
  },
};

/** The full steps of INVESTIGATIONS_41's latest run, by trace_seq, as GET /investigations/{id}/trace/{trace_seq} returns them. */
// typed, not cast, so a field the contract adds has to be filled in here too
const steps41: Omit<S["StepDetail"], "investigation_id">[] = [
  { trace_seq: 0, kind: "request", name: "request", text: `Case 41: 3 alert(s) on host(s) web-srv-01. ${XSS}`,
    thought: null, args: null, result: null, error: null },
  { trace_seq: 1, kind: "llm", name: "plan", text: null, thought: "The alert is on web-srv-01; start with its process tree.",
    args: null, result: null, error: null },
  { trace_seq: 2, kind: "tool", name: "edr.process_tree", text: null, thought: null, args: { host: "web-srv-01", pid: 4312 },
    result: { found: true, process: { cmdline: "curl -s http://203.0.113.50:8443/beacon" }, note: XSS }, error: null },
  { trace_seq: 3, kind: "llm", name: "verdict", text: "Beaconing confirmed; submitting.", thought: null, args: null,
    result: null, error: null },
];
export const STEPS_41: Record<number, S["StepDetail"]> = Object.fromEntries(
  steps41.map((s) => [s.trace_seq, { investigation_id: "aaaaaaaa-0000-0000-0000-000000000041", ...s }]),
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

// --- evals ----------------------------------------------------------------------------------------------------
// The baseline batch is still running (14 of 36 runs); the smoke batch is done.

export const BATCH_BASELINE = "01a1fc00-0000-7000-8000-000000000002";
export const BATCH_SMOKE = "01a1fba9-0000-7000-8000-000000000001";
export const RUN_PROD_3 = "01a1fc10-0000-7000-8000-000000000031"; // production, case 3: incorrect (process)
export const RUN_GEMINI_3 = "01a1fc10-0000-7000-8000-000000000032"; // gemini, case 3: waiting for review
export const RUN_QWEN_1 = "01a1fc10-0000-7000-8000-000000000011"; // qwen2b, case 1: incorrect (verdict)
export const RUN_PROD_1 = "01a1fc10-0000-7000-8000-000000000001"; // production, case 1: correct (not the default)

export const EVAL_BATCHES: S["EvalBatchSummary"][] = [
  { batch_id: BATCH_BASELINE, note: "baseline before prompt fix", started_at: "2026-11-21T01:30:00Z", finished_at: null,
    last_run_at: "2026-11-21T02:10:00Z", variants: ["production", "gemini-flash-lite", "qwen2b", "gemma-e2b"],
    case_ids: [1, 2, 3], k: 3, runs_done: 14, runs_total: 36 },
  { batch_id: BATCH_SMOKE, note: "smoke", started_at: "2026-11-21T01:12:00Z", finished_at: "2026-11-21T01:14:00Z",
    last_run_at: "2026-11-21T01:14:00Z", variants: ["production"], case_ids: [3], k: 1, runs_done: 1, runs_total: 1 },
];

const row = (over: Partial<S["EvalScoreRow"]>): S["EvalScoreRow"] => ({
  case_id: 3, scenario_id: "S2", variant: "production", k: 1, correct: 0, pending: 0, pass_k: false, verdict: 1,
  process: 0, grounding: 1, rationale: 0, entities_missed: [], errors: 0, infra: 0, median_ms: 69000,
  median_tokens: 6358, ...over,
});

const runSummary = (over: Partial<S["EvalRunSummary"]>): S["EvalRunSummary"] => ({
  run_id: RUN_PROD_3, case_id: 3, variant: "production", attempt: 1, outcome: "incorrect", verdict: "malicious",
  failure_kind: null, duration_ms: 69000, started_at: "2026-11-21T01:40:00Z", ...over,
});

export const EVAL_BATCH_BASELINE: S["EvalBatchDetail"] = {
  batch: EVAL_BATCHES[0],
  cases: [
    { case_id: 1, scenario_id: "S6", expected_verdict: "benign" },
    { case_id: 2, scenario_id: "S6", expected_verdict: "benign" },
    { case_id: 3, scenario_id: "S2", expected_verdict: "malicious" },
  ],
  variants: [
    { name: "production", provider: "ollama", model: "bonsai-2:4b", reasoning_level: "high", prompt_file: "soc_investigation.md" },
    { name: "gemini-flash-lite", provider: "gemini", model: "models/gemini-3.5-flash-lite", reasoning_level: "high", prompt_file: "soc_investigation.md" },
    { name: "qwen2b", provider: "ollama", model: "qwen3.5:2b-q4_K_M", reasoning_level: "high", prompt_file: "soc_investigation.md" },
    { name: "gemma-e2b", provider: "", model: "", reasoning_level: null, prompt_file: "" },
  ],
  rows: [
    row({ case_id: 1, scenario_id: "S6", k: 2, correct: 2, pass_k: null, process: 2, grounding: 2, rationale: 2 }),
    row({}),
    row({ variant: "gemini-flash-lite", pending: 1, pass_k: null, process: 1 }),
    row({ variant: "qwen2b", case_id: 1, scenario_id: "S6", verdict: 0 }),
  ],
  runs: [
    runSummary({ run_id: RUN_PROD_1, case_id: 1, outcome: "correct", verdict: "benign" }),
    runSummary({ run_id: "01a1fc10-0000-7000-8000-000000000002", case_id: 1, attempt: 2, outcome: "correct", verdict: "benign" }),
    runSummary({}),
    runSummary({ run_id: RUN_GEMINI_3, variant: "gemini-flash-lite", outcome: "pending_review", duration_ms: 21000 }),
    runSummary({ run_id: RUN_QWEN_1, variant: "qwen2b", case_id: 1, verdict: "malicious", duration_ms: 88000 }),
  ],
  pending_reviews: 1, infra: 0, median_ms: 69000,
};

export const EVAL_BATCH_SMOKE: S["EvalBatchDetail"] = {
  batch: EVAL_BATCHES[1], cases: [{ case_id: 3, scenario_id: "S2", expected_verdict: "malicious" }],
  variants: [EVAL_BATCH_BASELINE.variants[0]], rows: [row({})], runs: [runSummary({ run_id: "01a1fbaa-0000-7000-8000-000000000001" })],
  pending_reviews: 0, infra: 0, median_ms: 69000,
};

const evalSteps: S["AgentStep"][] = [
  { trace_seq: 0, step: 0, kind: "request", name: "request", started_at: "2026-11-21T01:40:00Z", duration_ms: 0, tokens_in: 0, tokens_out: 0, summary: "Case 3: 1 alert" },
  { trace_seq: 1, step: 2, kind: "tool", name: "get_process_tree", started_at: "2026-11-21T01:40:09Z", duration_ms: 24, tokens_in: 0, tokens_out: 0,
    summary: "found", args: { pid: 472, host: "eng-ws-03" } },
];

export function evalRun(over: Partial<S["EvalRunDetail"]> = {}): S["EvalRunDetail"] {
  return {
    run_id: RUN_PROD_3, batch_id: BATCH_BASELINE, case_id: 3, variant: "production", attempt: 1, outcome: "incorrect",
    reviewable: false, settings: { provider: "ollama", model: "bonsai-2:4b" }, status: "success", verdict: "malicious",
    confidence: "medium", rationale: "arun.m ran non-interactive sudo to read /etc/shadow.", error: null,
    evidence: [{ fact: "user", value: "arun.m", step: 2, verified: true },
               { fact: "parent", value: "sudo -n cat /etc/shadow", step: 2, verified: false }],
    grades: [
      { grader: "verdict", version: 1, passed: true, details: { expected: "malicious", actual: "malicious" } },
      { grader: "process", version: 1, passed: false, details: { tree_at_alert_time: false, history_search: false, looked_before_submit: true } },
      { grader: "grounding", version: 1, passed: true, details: { unsupported: [], missing: {} } },
      { grader: "errors", version: 1, passed: true, details: { tool_errors: 0, rejected_submits: 0, messages: [] } },
      { grader: "entity_mention", version: 1, passed: null, details: { missing: ["eng-ws-03"] } },
      { grader: "cost", version: 1, passed: null, details: { model_calls: 2, tool_calls: 4, prompt_tokens: 5250, output_tokens: 1108 } },
    ],
    steps: evalSteps, prompt_tokens: 5250, output_tokens: 1108, duration_ms: 69000, started_at: "2026-11-21T01:40:00Z",
    ...over,
  };
}

export const EVAL_RUNS: Record<string, S["EvalRunDetail"]> = {
  [RUN_PROD_3]: evalRun(),
  [RUN_GEMINI_3]: evalRun({
    run_id: RUN_GEMINI_3, variant: "gemini-flash-lite", outcome: "pending_review", reviewable: true,
    grades: evalRun().grades.map((g) => (g.grader === "process" ? { ...g, passed: true, details: { tree_at_alert_time: true, history_search: true, looked_before_submit: true } } : g)),
  }),
  [RUN_QWEN_1]: evalRun({
    run_id: RUN_QWEN_1, variant: "qwen2b", case_id: 1,
    grades: evalRun().grades.map((g) => (g.grader === "verdict" ? { ...g, passed: false, details: { expected: "benign", actual: "malicious" } } : g)),
  }),
};

EVAL_RUNS[RUN_PROD_1] = evalRun({
  run_id: RUN_PROD_1, case_id: 1, outcome: "correct", verdict: "benign",
  grades: evalRun().grades.map((g) =>
    g.grader === "verdict" ? { ...g, details: { expected: "benign", actual: "benign" } }
      : g.grader === "process" ? { ...g, passed: true, details: { tree_at_alert_time: true, history_search: true, looked_before_submit: true } }
      : g),
});

export const EVAL_STEP: S["StepDetail"] = {
  investigation_id: RUN_PROD_3, trace_seq: 1, kind: "tool", name: "get_process_tree", text: null, thought: null,
  args: { pid: 472, host: "eng-ws-03" }, result: { found: true, lineage: [{ pid: 470, user: "arun.m" }] }, error: null,
};
