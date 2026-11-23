// Default MSW handlers: a healthy portal backend serving the fixtures. Tests override per case.
import { http, HttpResponse } from "msw";
import {
  BATCH_BASELINE, BATCH_SMOKE, CASE_52, CASE_57, caseDetail, EVAL_BATCH_BASELINE, EVAL_BATCH_SMOKE, EVAL_BATCHES, EVAL_RUNS,
  EVAL_STEP, HEALTH, INVESTIGATIONS_41, proposal, QUEUE, rule, SIMULATION, STEPS_41,
} from "./fixtures";

export const api = (path: string) => `*/api${path}`;

export const handlers = [
  // Filters like the real backend: before the limit, entity matched exactly.
  http.get(api("/queue"), ({ request }) => {
    const q = new URL(request.url).searchParams;
    const status = q.get("status"), severity = Number(q.get("severity") ?? 1), entity = q.get("entity");
    const rows = QUEUE.filter((c) => (status ? c.status === status : c.status === "open" || c.status === "merged"))
      .filter((c) => c.severity >= severity)
      .filter((c) => !entity || [...c.entities.hosts, ...c.entities.users, ...c.entities.ips].includes(entity));
    return HttpResponse.json(rows.slice(0, Number(q.get("limit") ?? 100)));
  }),
  http.get(api("/cases/:id"), ({ params }) => {
    const id = Number(params.id);
    const found = { 41: caseDetail(), 52: CASE_52, 57: CASE_57 }[id];
    return found ? HttpResponse.json(found) : HttpResponse.json({ error: "not_found" }, { status: 404 });
  }),
  http.get(api("/investigations/:id"), ({ params }) =>
    Number(params.id) === 41
      ? HttpResponse.json(INVESTIGATIONS_41)
      : HttpResponse.json({ case_id: Number(params.id), agent_status: "pending", latest: null, history: [] })),
  http.get(api("/investigations/:id/trace/:seq"), ({ params }) => {
    const step = params.id === INVESTIGATIONS_41.latest?.investigation_id ? STEPS_41[Number(params.seq)] : undefined;
    return step ? HttpResponse.json(step) : HttpResponse.json({ error: "not_found" }, { status: 404 });
  }),
  http.get(api("/proposals"), ({ request }) => {
    const caseId = new URL(request.url).searchParams.get("case_id");
    return HttpResponse.json(caseId === null || caseId === "41" ? [proposal()] : []);
  }),
  http.get(api("/rule-suggestions"), () => HttpResponse.json([rule()])),
  http.get(api("/rules"), () => HttpResponse.json([])),
  http.post(api("/rules/simulate"), () => HttpResponse.json(SIMULATION)),
  http.get(api("/ops/health"), () => HttpResponse.json(HEALTH)),
  http.get(api("/evals/batches"), () => HttpResponse.json(EVAL_BATCHES)),
  http.get(api("/evals/batches/:id"), ({ params }) => {
    const found = { [BATCH_BASELINE]: EVAL_BATCH_BASELINE, [BATCH_SMOKE]: EVAL_BATCH_SMOKE }[String(params.id)];
    return found ? HttpResponse.json(found) : HttpResponse.json({ error: "not_found" }, { status: 404 });
  }),
  http.get(api("/evals/runs/:id"), ({ params }) => {
    const found = EVAL_RUNS[String(params.id)];
    return found ? HttpResponse.json(found) : HttpResponse.json({ error: "not_found" }, { status: 404 });
  }),
  http.get(api("/evals/runs/:id/trace/:seq"), ({ params }) =>
    Number(params.seq) === 1 ? HttpResponse.json({ ...EVAL_STEP, investigation_id: String(params.id) })
                               : HttpResponse.json({ error: "not_found" }, { status: 404 })),
];
