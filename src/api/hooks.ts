// Data hooks: one place for query keys, polling intervals and what each decision refreshes.
import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { ANALYST, api, unwrap, type Schemas } from "./client";

const header = { "X-Analyst": ANALYST };

// Every query polls, so a screen recovers from an outage on its own (the error state says it will).
export const POLL = { queue: 5000, case: 5000, investigations: 5000, proposals: 2000, rules: 5000, health: 5000, evals: 5000 } as const;

export type QueueParams = { status?: Schemas["CaseStatus"]; severity?: number; entity?: string; limit?: number };

export function useQueue(params: QueueParams = {}) {
  return useQuery({
    queryKey: ["queue", params],
    queryFn: () => unwrap(api.GET("/queue", { params: { query: params } })),
    refetchInterval: POLL.queue,
  });
}

export function useCase(caseId: number) {
  return useQuery({
    queryKey: ["case", caseId],
    queryFn: () => unwrap(api.GET("/cases/{case_id}", { params: { path: { case_id: caseId } } })),
    refetchInterval: POLL.case,
  });
}

export function useInvestigations(caseId: number) {
  return useQuery({
    queryKey: ["investigations", caseId],
    queryFn: () => unwrap(api.GET("/investigations/{case_id}", { params: { path: { case_id: caseId } } })),
    refetchInterval: POLL.investigations,
  });
}

/** Where a run's steps live: a production investigation or an eval run. Both answer with the same StepDetail. */
export type StepSource = { kind: "investigation" | "eval-run"; id: string };

/** One agent step in full (the model's message, the tool's input and output), fetched only when an analyst opens
 *  the step. It is stored with the run and never changes, so it is cached for good and not polled. */
export function useAgentStep(source: StepSource, index: number) {
  return useQuery({
    queryKey: ["agent-step", source.kind, source.id, index],
    queryFn: () =>
      source.kind === "investigation"
        ? unwrap(api.GET("/investigations/{investigation_id}/steps/{index}", {
            params: { path: { investigation_id: source.id, index } },
          }))
        : unwrap(api.GET("/evals/runs/{run_id}/steps/{index}", { params: { path: { run_id: source.id, index } } })),
    staleTime: Infinity,
  });
}

// --- evals: batches are started from the CLI; the page polls while the selected batch is not finished ----------

export function useEvalBatches() {
  return useQuery({
    queryKey: ["eval-batches"],
    queryFn: () => unwrap(api.GET("/evals/batches")),
    refetchInterval: (q) => (q.state.data?.every((b) => b.finished_at) ? false : POLL.evals),
  });
}

export function useEvalBatch(batchId: string | undefined) {
  return useQuery({
    queryKey: ["eval-batch", batchId],
    queryFn: () => unwrap(api.GET("/evals/batches/{batch_id}", { params: { path: { batch_id: batchId! } } })),
    enabled: !!batchId,
    refetchInterval: (q) => (q.state.data?.batch.finished_at ? false : POLL.evals),
  });
}

export function useEvalRun(runId: string | undefined) {
  return useQuery({
    queryKey: ["eval-run", runId],
    queryFn: () => unwrap(api.GET("/evals/runs/{run_id}", { params: { path: { run_id: runId! } } })),
    enabled: !!runId,
  });
}

/** The human rationale review; saving again replaces it. */
export function useSaveReview(runId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { correct: boolean; note?: string }) =>
      unwrap(api.PUT("/evals/runs/{run_id}/review", {
        params: { path: { run_id: runId }, header },
        body: { correct: v.correct, note: v.note || null },
      })),
    // the answer is the reviewed run: shown at once; the batch's counts are fetched again
    onSuccess: (run) => client.setQueryData(["eval-run", runId], run),
    onSettled: () => client.invalidateQueries({ queryKey: ["eval-batch"] }),
  });
}

export type ProposalFilter = { caseId?: number; status?: Schemas["ProposalStatus"] };

export function useProposals({ caseId, status }: ProposalFilter = {}) {
  return useQuery({
    queryKey: ["proposals", { caseId, status }],
    queryFn: () => unwrap(api.GET("/proposals", { params: { query: { case_id: caseId, status } } })),
    refetchInterval: POLL.proposals,
  });
}

export type RuleFilter = { status?: Schemas["RuleStatus"]; expiringWithinDays?: number };

export function useRules({ status, expiringWithinDays }: RuleFilter = {}) {
  return useQuery({
    queryKey: ["rules", { status, expiringWithinDays }],
    queryFn: () =>
      unwrap(api.GET("/rules", { params: { query: { status, expiring_within_days: expiringWithinDays } } })),
    refetchInterval: POLL.rules,
  });
}

export function useRuleSuggestions() {
  return useQuery({
    queryKey: ["rule-suggestions"],
    queryFn: () => unwrap(api.GET("/rule-suggestions")),
    refetchInterval: POLL.rules,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => unwrap(api.GET("/ops/health")),
    refetchInterval: POLL.health,
  });
}

/** A decision: whatever the outcome (including a 409), the views it touches are refetched. */
function useDecision<V, R>(fn: (vars: V) => Promise<R>, touches: QueryKey[]) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => Promise.all(touches.map((queryKey) => client.invalidateQueries({ queryKey }))),
  });
}

const PROPOSAL_VIEWS: QueryKey[] = [["proposals"], ["investigations"], ["queue"]];
const RULE_VIEWS: QueryKey[] = [["rules"], ["rule-suggestions"]];

export const useApprove = () =>
  useDecision(
    (v: { proposalId: string; approvalHash: string; reason: string }) =>
      unwrap(api.POST("/proposals/{proposal_id}/approve", {
        params: { path: { proposal_id: v.proposalId }, header },
        body: { approval_hash: v.approvalHash, reason: v.reason },
      })),
    PROPOSAL_VIEWS,
  );

export const useReject = () =>
  useDecision(
    (v: { proposalId: string; reason: string }) =>
      unwrap(api.POST("/proposals/{proposal_id}/reject", {
        params: { path: { proposal_id: v.proposalId }, header }, body: { reason: v.reason },
      })),
    PROPOSAL_VIEWS,
  );

export const useUndo = () =>
  useDecision(
    (v: { proposalId: string; reason: string }) =>
      unwrap(api.POST("/proposals/{proposal_id}/undo", {
        params: { path: { proposal_id: v.proposalId }, header }, body: { reason: v.reason },
      })),
    PROPOSAL_VIEWS,
  );

/** Starts a background run; the investigations poll shows it ending. A 409 means one is already running. */
export const useStartInvestigation = (caseId: number) =>
  useDecision(
    () => unwrap(api.POST("/investigations/{case_id}", { params: { path: { case_id: caseId }, header } })),
    [["investigations", caseId], ["queue"]],
  );

export const useSetVerdict = (caseId: number) =>
  useDecision(
    (v: { verdict: "malicious" | "benign" | "false_positive"; note: string; expectedVersion: number }) =>
      unwrap(api.POST("/cases/{case_id}/verdict", {
        params: { path: { case_id: caseId }, header },
        body: { verdict: v.verdict, note: v.note, expected_version: v.expectedVersion },
      })),
    [["case", caseId], ["queue"]],
  );

export const useApproveRule = () =>
  useDecision(
    (v: { ruleId: number; expectedVersion: number; reason?: string }) =>
      unwrap(api.POST("/rule-suggestions/{rule_id}/approve", {
        params: { path: { rule_id: v.ruleId }, header }, body: { expected_version: v.expectedVersion, reason: v.reason },
      })),
    RULE_VIEWS,
  );

export const useRejectRule = () =>
  useDecision(
    (v: { ruleId: number; expectedVersion: number; reason: string }) =>
      unwrap(api.POST("/rule-suggestions/{rule_id}/reject", {
        params: { path: { rule_id: v.ruleId }, header }, body: { expected_version: v.expectedVersion, reason: v.reason },
      })),
    RULE_VIEWS,
  );

export const useRenewRule = () =>
  useDecision(
    (v: { ruleId: number; expectedVersion: number; validUntil: string; simulationId: string }) =>
      unwrap(api.POST("/rules/{rule_id}/renew", {
        params: { path: { rule_id: v.ruleId }, header },
        body: { expected_version: v.expectedVersion, valid_until: v.validUntil, simulation_id: v.simulationId },
      })),
    RULE_VIEWS,
  );

export const useSimulate = () =>
  useMutation({
    mutationFn: (v: { rule: Schemas["RuleDefinition"]; lookbackDays?: number }) =>
      unwrap(api.POST("/rules/simulate", { body: { rule: v.rule, lookback_days: v.lookbackDays ?? 30 } })),
  });
