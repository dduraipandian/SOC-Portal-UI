import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { alert, caseDetail, INVESTIGATIONS_41, XSS } from "../test/fixtures";
import { api } from "../test/handlers";
import { renderAt } from "../test/render";
import { server } from "../test/server";

const section = (name: string) => screen.getByRole("region", { name });
const openTab = async (name: string) => userEvent.click(await screen.findByRole("tab", { name }));
const before = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

test("S6 partial match: the suppressed alert is marked with its rule and the rule trace shows 'partial'", async () => {
  renderAt("/cases/57");
  const alerts = await screen.findByRole("region", { name: "Alerts" });
  const shadow = within(alerts).getByText("awk -F: {print $1, $5} /etc/shadow").closest("details")!;
  expect(shadow).toHaveAttribute("data-suppressed", "true");
  expect(shadow).toHaveTextContent("Explained by rule #7 v2");
  const other = within(alerts).getByText("curl -s http://203.0.113.50:8443/beacon").closest("details")!;
  expect(other).not.toHaveAttribute("data-suppressed", "true");
  await openTab("Rule trace");
  const trace = section("Rule trace");
  expect(trace).toHaveTextContent("build-01 nightly password-expiry audit");
  expect(trace).toHaveTextContent("partial");
  expect(trace).toHaveTextContent("auto close");
});

test("summary leads with the agent verdict, confidence and rationale", async () => {
  renderAt("/cases/41");
  const summary = await screen.findByRole("region", { name: "Summary" });
  await within(summary).findByText("malicious");
  expect(summary).toHaveTextContent("82% confidence");
  expect(summary).toHaveTextContent("Beaconing to a known-bad IP from web-srv-01.");
});

test("summary says the agent has not finished when there is no verdict", async () => {
  server.use(http.get(api("/investigations/41"), () => HttpResponse.json({
    ...INVESTIGATIONS_41, latest: null, agent_status: "pending",
  })));
  renderAt("/cases/41");
  const summary = await screen.findByRole("region", { name: "Summary" });
  await within(summary).findByText(/no completed investigation yet/i);
  expect(summary).toHaveTextContent("pending");
});

test("summary shows why the last run failed when there is no verdict", async () => {
  server.use(http.get(api("/investigations/41"), () => HttpResponse.json({
    ...INVESTIGATIONS_41, latest: null, agent_status: "failed",
    last_failure: { investigation_id: "bbbbbbbb-0000-0000-0000-000000000041", case_version: 3, error: "Agent step limit reached.",
                    completed_at: "2026-11-07T10:05:00Z", duration_ms: 9000, steps: [] },
  })));
  renderAt("/cases/41");
  const summary = await screen.findByRole("region", { name: "Summary" });
  await within(summary).findByText(/agent step limit reached/i);
});

test("summary flags a verdict written for an older version of the case", async () => {
  server.use(http.get(api("/cases/41"), () => HttpResponse.json(caseDetail({ version: 5 }))));
  renderAt("/cases/41");
  const summary = await screen.findByRole("region", { name: "Summary" });
  await within(summary).findByText("Based on v3; the case is now v5.");
});

test("a case bar shows the case, severity, status and entities", async () => {
  renderAt("/cases/41");
  const heading = await screen.findByRole("heading", { level: 1 });
  const bar = heading.closest(".case-bar")!;
  expect(bar).not.toBeNull();
  expect(bar).toHaveTextContent("Case #41");
  expect(bar).toHaveTextContent("Critical");
  expect(bar).toHaveTextContent("open");
  expect(bar).toHaveTextContent("web-srv-01");
  expect(within(bar as HTMLElement).getByRole("link", { name: "Queue" })).toHaveAttribute("href", "/");
});

test("the case bar jumps to the decision when an action is proposed", async () => {
  renderAt("/cases/41");
  const jump = await screen.findByRole("link", { name: /1 proposed action/ });
  expect(jump).toHaveAttribute("href", "#decision");
});

test("the case bar has no jump link when nothing is proposed", async () => {
  server.use(http.get(api("/proposals"), () => HttpResponse.json([])));
  renderAt("/cases/41");
  await screen.findByText("The agent has not proposed an action.");
  expect(screen.queryByRole("link", { name: /proposed action/ })).toBeNull();
});

test("the page reads summary, decision, investigation, then case data, each full width", async () => {
  const { container } = renderAt("/cases/41");
  const summary = await screen.findByRole("region", { name: "Summary" });
  const decision = screen.getByRole("region", { name: "Decision" });
  const inv = screen.getByRole("region", { name: "Investigation" });
  const tabs = screen.getByRole("tablist", { name: "Case data" });
  expect(before(summary, decision)).toBe(true);
  expect(before(decision, inv)).toBe(true);
  expect(before(inv, tabs)).toBe(true);
  expect(container.querySelector(".case-page aside")).toBeNull();     // no side column any more
});

test("the decision band holds proposed actions beside the analyst verdict form", async () => {
  renderAt("/cases/41");
  const decision = await screen.findByRole("region", { name: "Decision" });
  expect(decision).toContainElement(screen.getByRole("region", { name: "Proposals" }));
  expect(decision).toContainElement(screen.getByRole("form", { name: "Analyst verdict" }));
  expect(decision).toHaveAttribute("id", "decision");
});

test("the summary shows confidence as a meter, and the agent, ages and alert count as facts", async () => {
  renderAt("/cases/41");
  const summary = await screen.findByRole("region", { name: "Summary" });
  const meter = await within(summary).findByRole("meter");
  expect(meter).toHaveAttribute("aria-valuenow", "82");
  for (const label of ["Agent", "Opened", "Updated", "Alerts"]) expect(summary).toHaveTextContent(label);
});

test("case data has five tabs in order and opens on Alerts", async () => {
  renderAt("/cases/41");
  const names = ["Alerts", "Enrichment", "Rule trace", "Related cases", "Timeline"];
  const tabs = await Promise.all(names.map((n) => screen.findByRole("tab", { name: n })));
  tabs.slice(1).forEach((t, i) => expect(before(tabs[i], t)).toBe(true));
  expect(tabs[0]).toHaveAttribute("aria-selected", "true");
});

test("Rule trace, Related cases and Timeline say so when there is nothing to show", async () => {
  server.use(http.get(api("/cases/41"), () => HttpResponse.json(caseDetail({ related_case_ids: [], events: [] }))));
  renderAt("/cases/41");
  await openTab("Rule trace");
  expect(section("Rule trace")).toHaveTextContent("No rule matched this case.");
  await openTab("Related cases");
  expect(section("Related cases")).toHaveTextContent("No related cases.");
  await openTab("Timeline");
  expect(section("Timeline")).toHaveTextContent("No closed or merged events yet.");
});

test("Related cases lists the cases that share an entity", async () => {
  renderAt("/cases/41");
  await openTab("Related cases");
  expect(within(section("Related cases")).getByRole("link", { name: "#12" })).toHaveAttribute("href", "/cases/12");
});

test("case data opens on Alerts; Enrichment is one click away and swaps the panel", async () => {
  renderAt("/cases/41");
  const alertsTab = await screen.findByRole("tab", { name: "Alerts" });
  const enrichTab = screen.getByRole("tab", { name: "Enrichment" });
  expect(alertsTab).toHaveAttribute("aria-selected", "true");
  expect(enrichTab).toHaveAttribute("aria-selected", "false");
  expect(screen.getByRole("region", { name: "Alerts" })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Enrichment" })).toBeNull();
  await userEvent.click(enrichTab);
  expect(enrichTab).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("region", { name: "Enrichment" })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Alerts" })).toBeNull();
});

test("investigation shows the evidence first, then the agent steps", async () => {
  renderAt("/cases/41");
  const inv = await screen.findByRole("region", { name: "Investigation" });
  await within(inv).findByText("e".repeat(64));
  expect(inv).toHaveTextContent("edr.process_tree");
  const evidence = within(inv).getByRole("heading", { name: "Evidence" });
  expect(before(evidence, within(inv).getByRole("region", { name: "Agent steps" }))).toBe(true);
});

test("agent steps start collapsed, with the totals still showing", async () => {
  renderAt("/cases/41");
  const steps = await screen.findByRole("region", { name: "Agent steps" });
  const box = steps.querySelector("details.steps-box") as HTMLDetailsElement;
  expect(box).not.toBeNull();
  expect(box.open).toBe(false);
  const total = steps.querySelector("summary.steps-total")!;
  expect(total).toBeVisible();
  expect(total).toHaveTextContent("3 steps (2 model, 1 tool)");
});

test("opening the agent steps shows the timeline inside a scrolling box", async () => {
  renderAt("/cases/41");
  const steps = await screen.findByRole("region", { name: "Agent steps" });
  const first = within(steps).getByText("Decide which tools to call.");
  expect(first).not.toBeVisible();
  await userEvent.click(steps.querySelector("summary.steps-total")!);
  expect(first).toBeVisible();
  expect(first.closest(".steps-scroll")).not.toBeNull();
});

test("agent steps are a timeline list with the totals first", async () => {
  renderAt("/cases/41");
  const steps = await screen.findByRole("region", { name: "Agent steps" });
  await userEvent.click(steps.querySelector("summary.steps-total")!);
  const items = within(steps).getAllByRole("listitem");
  expect(items).toHaveLength(3);                                       // plan, tool, verdict
  expect(items[1]).toHaveTextContent("edr.process_tree");
  const total = steps.querySelector(".steps-total")!;
  expect(total).toHaveTextContent("3 steps (2 model, 1 tool)");
  expect(total).toHaveTextContent("6,030");                            // tokens in + out
  expect(total).toHaveTextContent("4.37 s");
  expect(before(total, items[0])).toBe(true);
});

// ----- a step's details: fetched when opened, not with the list -----
async function openStepDetails(index: number) {
  const steps = await screen.findByRole("region", { name: "Agent steps" });
  if (!(steps.querySelector("details.steps-box") as HTMLDetailsElement).open) {
    await userEvent.click(steps.querySelector("summary.steps-total")!);
  }
  const item = within(steps).getAllByRole("listitem")[index];
  await userEvent.click(within(item).getByText("Details"));
  return item;
}

test("a tool step's input and output are fetched only when its details are opened", async () => {
  const fetched: string[] = [];
  server.events.on("request:start", ({ request }) => {
    if (request.url.includes("/steps/")) fetched.push(new URL(request.url).pathname);
  });
  renderAt("/cases/41");
  const steps = await screen.findByRole("region", { name: "Agent steps" });
  await userEvent.click(steps.querySelector("summary.steps-total")!);
  expect(fetched).toEqual([]);                                         // the list alone fetches no step

  const item = await openStepDetails(1);
  expect(await within(item).findByRole("heading", { name: "Output" })).toBeVisible();
  expect(item).toHaveTextContent('"pid": 4312');                       // input
  expect(item).toHaveTextContent("curl -s http://203.0.113.50:8443/beacon");  // output
  expect(item).toHaveTextContent(XSS);                                 // vendor data shown as text
  expect(item.querySelector("img")).toBeNull();
  expect(fetched).toEqual(["/api/investigations/aaaaaaaa-0000-0000-0000-000000000041/steps/1"]);
  server.events.removeAllListeners();
});

test("a model step shows its message, or says it only called tools", async () => {
  renderAt("/cases/41");
  const verdict = await openStepDetails(2);
  expect(await within(verdict).findByText("Beaconing confirmed; submitting.")).toBeVisible();

  const plan = await openStepDetails(0);
  expect(await within(plan).findByText("No message: the model only called tools.")).toBeVisible();
});

test("a tool step from a run saved before outputs were kept says so", async () => {
  server.use(http.get(api("/investigations/:id/steps/:index"), () =>
    HttpResponse.json({ investigation_id: "aaaaaaaa-0000-0000-0000-000000000041", index: 1, kind: "tool",
                        name: "edr.process_tree", text: null, args: { host: "web-srv-01" }, result: null, error: null })));
  renderAt("/cases/41");
  const item = await openStepDetails(1);
  expect(await within(item).findByText("Not recorded: this run was saved before tool outputs were kept.")).toBeVisible();
});

// ----- investigation cards: the latest run and earlier ones, newest first -----
type Run = NonNullable<typeof INVESTIGATIONS_41.latest>;
const run = (n: number, over: Partial<Run> = {}): Run => ({
  ...INVESTIGATIONS_41.latest!,
  investigation_id: `aaaaaaaa-0000-0000-0000-0000000000${String(n).padStart(2, "0")}`,
  evidence_hash: String(n).padStart(2, "0").repeat(32),
  completed_at: `2026-11-07T09:${String(60 - n).padStart(2, "0")}:00Z`,          // older as n grows
  ...over,
});
const withRuns = (history: Run[], latest: Run | null = INVESTIGATIONS_41.latest!) =>
  server.use(http.get(api("/investigations/41"), () => HttpResponse.json({ ...INVESTIGATIONS_41, latest, history })));
const cards = () => within(screen.getByRole("list", { name: "Investigations" })).getAllByRole("button");
const stepsBox = () => screen.getByRole("region", { name: "Agent steps" }).querySelector("details") as HTMLDetailsElement;
const toggleSteps = () => userEvent.click(stepsBox().querySelector("summary")!);
const OLDER = run(1, {
  verdict: "benign", rationale: "Routine admin work.",
  evidence: [{ ...INVESTIGATIONS_41.latest!.evidence[0], tool: "older.tool", result_excerpt: "older excerpt" }],
  steps: [{ index: 0, kind: "tool", name: "older_step", started_at: "2026-11-07T09:00:00Z", duration_ms: 500,
            tokens_in: 0, tokens_out: 0, summary: "An older run." }],
});

test("investigations are cards with verdict, time and hash, the latest on the left", async () => {
  withRuns([run(1, { verdict: "benign" }), run(2, { verdict: "inconclusive" })]);
  renderAt("/cases/41");
  await screen.findByRole("list", { name: "Investigations" });
  const [latest, second, third] = cards();
  for (const text of ["malicious", "Latest", "eeeeeeeeeeee"]) expect(latest).toHaveTextContent(text);
  for (const text of ["benign", "010101010101"]) expect(second).toHaveTextContent(text);
  for (const text of ["inconclusive", "020202020202"]) expect(third).toHaveTextContent(text);
  expect(second).not.toHaveTextContent("Latest");
  // the time reads as an age; the exact UTC time is on hover
  expect(within(latest).getByTitle("2026-11-07 10:00 UTC")).toHaveTextContent(/ago$/);
  expect(within(second).getByTitle("2026-11-07 09:59 UTC")).toHaveTextContent(/ago$/);
  expect(within(third).getByTitle("2026-11-07 09:58 UTC")).toHaveTextContent(/ago$/);
});

test("cards show how long ago each investigation finished", async () => {
  const ago = (seconds: number) => new Date(Date.now() - seconds * 1000).toISOString();
  withRuns(
    [run(1, { completed_at: ago(3600) }), run(2, { completed_at: ago(86400) })],
    { ...INVESTIGATIONS_41.latest!, completed_at: ago(300) },
  );
  renderAt("/cases/41");
  await screen.findByRole("list", { name: "Investigations" });
  expect(cards()[0]).toHaveTextContent("5 min ago");
  expect(cards()[1]).toHaveTextContent("1 h ago");
  expect(cards()[2]).toHaveTextContent("1 d ago");
});

test("only the latest 10 investigations are shown", async () => {
  withRuns(Array.from({ length: 12 }, (_, i) => run(i + 1)));
  renderAt("/cases/41");
  await screen.findByRole("list", { name: "Investigations" });
  expect(cards()).toHaveLength(10);                         // the latest run plus the 9 before it
  expect(cards()[9]).toHaveTextContent("090909090909");
});

test("the old Earlier investigations list is gone", async () => {
  withRuns([run(1)]);
  renderAt("/cases/41");
  await screen.findByRole("list", { name: "Investigations" });
  expect(screen.queryByText(/earlier investigations/i)).toBeNull();
});

test("the cards sit above the evidence and the agent steps, and the latest card is selected first", async () => {
  withRuns([run(1)]);
  renderAt("/cases/41");
  const list = await screen.findByRole("list", { name: "Investigations" });
  expect(before(list, screen.getByRole("heading", { name: "Evidence" }))).toBe(true);
  expect(before(list, screen.getByRole("region", { name: "Agent steps" }))).toBe(true);
  expect(cards()[0]).toHaveAttribute("aria-pressed", "true");
  expect(cards()[1]).toHaveAttribute("aria-pressed", "false");
});

test("selecting a card loads that investigation's evidence and agent steps; the summary stays on the latest", async () => {
  withRuns([OLDER]);
  renderAt("/cases/41");
  await screen.findByRole("list", { name: "Investigations" });
  await toggleSteps();                                                      // expanded before switching
  await userEvent.click(cards()[1]);
  expect(cards()[1]).toHaveAttribute("aria-pressed", "true");
  expect(cards()[0]).toHaveAttribute("aria-pressed", "false");
  const inv = screen.getByRole("region", { name: "Investigation" });
  const steps = within(inv).getByRole("region", { name: "Agent steps" });
  expect(within(steps).getByText("An older run.")).toBeVisible();
  expect(inv).toHaveTextContent("older excerpt");
  expect(inv).toHaveTextContent(/showing an earlier investigation/i);
  expect(inv).not.toHaveTextContent("edr.process_tree");                   // nothing left over from the latest run
  const summary = screen.getByRole("region", { name: "Summary" });
  expect(summary).toHaveTextContent("82% confidence");                     // the case verdict is still the latest's
  await userEvent.click(cards()[0]);
  expect(within(screen.getByRole("region", { name: "Investigation" })).getByText("edr.process_tree", { selector: "td" }))
    .toBeInTheDocument();
});

test("switching investigations keeps the agent steps collapsed", async () => {
  withRuns([OLDER]);
  renderAt("/cases/41");
  await screen.findByRole("list", { name: "Investigations" });
  expect(stepsBox().open).toBe(false);
  await userEvent.click(cards()[1]);
  expect(stepsBox().open).toBe(false);
  expect(screen.getByText("An older run.")).not.toBeVisible();
});

test("switching investigations keeps the agent steps expanded", async () => {
  withRuns([OLDER]);
  renderAt("/cases/41");
  await screen.findByRole("list", { name: "Investigations" });
  await toggleSteps();
  expect(stepsBox().open).toBe(true);
  await userEvent.click(cards()[1]);
  expect(stepsBox().open).toBe(true);
  expect(screen.getByText("An older run.")).toBeVisible();
  await userEvent.click(cards()[0]);
  expect(stepsBox().open).toBe(true);
});

test("collapsing the steps stays collapsed for the next investigation you pick", async () => {
  withRuns([OLDER]);
  renderAt("/cases/41");
  await screen.findByRole("list", { name: "Investigations" });
  await toggleSteps();
  await userEvent.click(cards()[1]);
  await toggleSteps();                                                      // collapse it again
  expect(stepsBox().open).toBe(false);
  await userEvent.click(cards()[0]);
  expect(stepsBox().open).toBe(false);
});

test("with no completed investigation there are no cards", async () => {
  withRuns([], null);
  renderAt("/cases/41");
  await screen.findAllByText(/no completed investigation yet/i);
  expect(screen.queryByRole("list", { name: "Investigations" })).toBeNull();
});

test("merged case shows the banner and disables the verdict form", async () => {
  renderAt("/cases/52");
  expect(await screen.findByText(/this case was merged into/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "#41" })).toHaveAttribute("href", "/cases/41");
  expect(screen.getByRole("button", { name: "Close case with this verdict" })).toBeDisabled();
});

test("alert command and evidence excerpt render as text", async () => {   // RF3
  server.use(
    http.get(api("/cases/41"), () => HttpResponse.json(caseDetail({
      alerts: [alert({ process: { cmd: XSS, user: "www-data", pid: 1, parent_cmd: XSS, ancestors: [] } })],
    }))),
    http.get(api("/investigations/41"), () => HttpResponse.json({
      ...INVESTIGATIONS_41,
      latest: { ...INVESTIGATIONS_41.latest!, rationale: XSS,
                evidence: [{ ...INVESTIGATIONS_41.latest!.evidence[0], result_excerpt: XSS }] },
    })),
  );
  const { container } = renderAt("/cases/41");
  const inv = await screen.findByRole("region", { name: "Investigation" });
  await within(inv).findAllByText(XSS);
  expect(within(section("Alerts")).getAllByText(XSS).length).toBeGreaterThan(0);
  expect(within(section("Summary")).getAllByText(XSS).length).toBeGreaterThan(0);
  expect(container.querySelector("img")).toBeNull();
});

test("alerts are listed oldest first with severity, category, source, technique and a count", async () => {
  renderAt("/cases/57");
  const alerts = await screen.findByRole("region", { name: "Alerts" });
  expect(alerts.querySelector(".count")).toHaveTextContent("2");
  const rows = alerts.querySelectorAll("details.alert-row");
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveTextContent("sensitive file read");
  expect(rows[0]).toHaveTextContent("sentrix-edr");
  expect(rows[0]).toHaveTextContent("T1003.008");
  expect(rows[0].querySelector("summary .severity")).not.toBeNull();
});

test("an alert row expands to its command, parent and ancestors", async () => {
  renderAt("/cases/57");
  const alerts = await screen.findByRole("region", { name: "Alerts" });
  const cmd = within(alerts).getByText("awk -F: {print $1, $5} /etc/shadow");
  expect(cmd).not.toBeVisible();
  await userEvent.click(cmd.closest("details")!.querySelector("summary")!);
  expect(cmd).toBeVisible();
  expect(within(alerts).getByText("/bin/bash /opt/maint/nightly.sh")).toBeVisible();
  expect(within(alerts).getByText(/\/usr\/sbin\/cron -f/)).toBeVisible();
});

test("a case with no alerts says so", async () => {
  server.use(http.get(api("/cases/41"), () => HttpResponse.json(caseDetail({ alerts: [] }))));
  renderAt("/cases/41");
  const alerts = await screen.findByRole("region", { name: "Alerts" });
  expect(alerts).toHaveTextContent("No alerts in this case.");
  expect(alerts.querySelector(".count")).toHaveTextContent("0");
});

test("an alert without process, file or network detail expands to 'No further detail.'", async () => {
  server.use(http.get(api("/cases/41"), () => HttpResponse.json(caseDetail({
    alerts: [alert({ process: null, file: null, network: null })],
  }))));
  renderAt("/cases/41");
  const alerts = await screen.findByRole("region", { name: "Alerts" });
  expect(within(alerts).getByText("No further detail.")).toBeInTheDocument();
});

test("closed and merged events stay in the Timeline, not in Alerts", async () => {
  server.use(http.get(api("/cases/41"), () => HttpResponse.json(caseDetail({
    events: [{ id: 9, version: 3, kind: "closed", at: "2026-11-07T11:00:00Z",
               data: { verdict: "benign", by: "analyst", closed_by: "sam" } }],
  }))));
  renderAt("/cases/41");
  const alerts = await screen.findByRole("region", { name: "Alerts" });
  expect(within(alerts).queryByText(/Closed as/)).toBeNull();
  await openTab("Timeline");
  expect(section("Timeline")).toHaveTextContent("Closed as benign by sam");
});

test("verdict sends the rendered expected_version and the X-Analyst header", async () => {
  let sent: { body: unknown; analyst: string | null } | undefined;
  server.use(http.post(api("/cases/41/verdict"), async ({ request }) => {
    sent = { body: await request.json(), analyst: request.headers.get("X-Analyst") };
    return HttpResponse.json(caseDetail({ status: "closed", verdict: "benign" }));
  }));
  renderAt("/cases/41");
  const form = await screen.findByRole("form", { name: "Analyst verdict" });
  await userEvent.selectOptions(within(form).getByLabelText("Verdict"), "benign");
  await userEvent.type(within(form).getByLabelText("Note"), "admin testing");
  await userEvent.click(within(form).getByRole("button", { name: "Close case with this verdict" }));
  await vi.waitFor(() => expect(sent).toBeDefined());
  expect(sent).toEqual({ body: { verdict: "benign", note: "admin testing", expected_version: 3 }, analyst: "analyst" });
});

test("verdict 409 version_changed shows the refusal, keeps the note and refetches", async () => {   // RF2
  let loads = 0;
  server.use(
    http.get(api("/cases/41"), () => {
      loads += 1;
      return HttpResponse.json(caseDetail({ version: loads > 1 ? 4 : 3 }));
    }),
    http.post(api("/cases/41/verdict"), () =>
      HttpResponse.json({ error: "version_changed", current_version: 4, status: "open" }, { status: 409 })),
  );
  renderAt("/cases/41");
  const form = await screen.findByRole("form", { name: "Analyst verdict" });
  await userEvent.type(within(form).getByLabelText("Note"), "keep me");
  await userEvent.click(within(form).getByRole("button", { name: "Close case with this verdict" }));
  const refusal = await within(form).findByRole("alert");
  expect(refusal).toHaveTextContent("This changed since you loaded it (now v4). Reload and try again.");
  expect(within(form).getByLabelText("Note")).toHaveValue("keep me");
  await vi.waitFor(() => expect(loads).toBeGreaterThan(1));
  expect(screen.queryByText(/closed/i, { selector: ".toast" })).toBeNull();
});

test("unknown host shows 'unknown' enrichment", async () => {
  server.use(http.get(api("/cases/41"), () => HttpResponse.json(caseDetail({
    entities: { hosts: ["web-srv-01", "mystery-07"], users: [], ips: [] },
  }))));
  renderAt("/cases/41");
  await userEvent.click(await screen.findByRole("tab", { name: "Enrichment" }));
  const enrichment = await screen.findByRole("region", { name: "Enrichment" });
  const row = within(enrichment).getByText("mystery-07").closest("tr")!;
  expect(row).toHaveTextContent("unknown");
  expect(within(enrichment).getByText("web-srv-01").closest("tr")).toHaveTextContent("critical");
});

test("enrichment shows the destinations alerts connected to, with their reputation", async () => {
  // S1: the C2 address is an alert destination, not a case entity, but the enricher looked it up.
  renderAt("/cases/41");
  await userEvent.click(await screen.findByRole("tab", { name: "Enrichment" }));
  const enrichment = await screen.findByRole("region", { name: "Enrichment" });
  const row = within(enrichment).getByText("203.0.113.50").closest("tr")!;
  expect(row).toHaveTextContent("malicious");
  expect(row).toHaveTextContent("destination");
});

test("a failed last run says why it stopped and shows the steps it took", async () => {
  server.use(http.get(api("/investigations/41"), () => HttpResponse.json({
    ...INVESTIGATIONS_41, agent_status: "failed",
    last_failure: { investigation_id: "cccccccc-0000-0000-0000-000000000041", case_version: 3,
                    error: "Agent step limit reached.", completed_at: "2026-11-07T10:06:00Z", duration_ms: 23304,
                    steps: INVESTIGATIONS_41.latest!.steps },
  })));
  renderAt("/cases/41");
  const inv = await screen.findByRole("region", { name: "Investigation" });
  const failure = await within(inv).findByText(/the last investigation failed/i);
  expect(failure.closest("[role=alert]")).toHaveTextContent("Agent step limit reached.");
  expect(failure.closest("[role=alert]")).toHaveTextContent("after 23.3 s");
  expect(section("Steps before it failed")).toHaveTextContent("3 steps (2 model, 1 tool)");
});

test("Run investigation starts a run with the X-Analyst header; a 409 says one is already running", async () => {
  let analyst: string | null = null;
  server.use(http.post(api("/investigations/41"), ({ request }) => {
    analyst = request.headers.get("X-Analyst");
    return HttpResponse.json({ error: "already_investigating" }, { status: 409 });
  }));
  renderAt("/cases/41");
  const inv = await screen.findByRole("region", { name: "Investigation" });
  await userEvent.click(await within(inv).findByRole("button", { name: "Run investigation" }));
  expect(await within(inv).findByRole("alert")).toHaveTextContent("The agent is already investigating this case.");
  expect(analyst).toBe("analyst");
});

test("Run investigation is disabled while the agent is investigating", async () => {
  server.use(http.get(api("/investigations/41"), () => HttpResponse.json({
    ...INVESTIGATIONS_41, agent_status: "investigating",
  })));
  renderAt("/cases/41");
  const inv = await screen.findByRole("region", { name: "Investigation" });
  expect(await within(inv).findByRole("button", { name: "Investigating…" })).toBeDisabled();
});
