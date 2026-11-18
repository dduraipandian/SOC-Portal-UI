import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { alert, caseDetail, INVESTIGATIONS_41, XSS } from "../test/fixtures";
import { api } from "../test/handlers";
import { renderAt } from "../test/render";
import { server } from "../test/server";

const section = (name: string) => screen.getByRole("region", { name });

test("S6 partial match: the suppressed alert is marked with its rule and the rule trace shows 'partial'", async () => {
  renderAt("/cases/57");
  const timeline = await screen.findByRole("region", { name: "Timeline" });
  const shadow = within(timeline).getByText("awk -F: {print $1, $5} /etc/shadow").closest("li")!;
  expect(shadow).toHaveAttribute("data-suppressed", "true");
  expect(shadow).toHaveTextContent("Explained by rule #7 v2");
  const other = within(timeline).getByText("curl -s http://203.0.113.50:8443/beacon").closest("li")!;
  expect(other).not.toHaveAttribute("data-suppressed", "true");
  const trace = section("Rule trace");
  expect(trace).toHaveTextContent("build-01 nightly password-expiry audit");
  expect(trace).toHaveTextContent("partial");
  expect(trace).toHaveTextContent("auto close");
});

test("investigation shows verdict, evidence excerpt, evidence_hash and agent steps with token total", async () => {
  renderAt("/cases/41");
  const inv = await screen.findByRole("region", { name: "Investigation" });
  await within(inv).findByText("malicious");
  expect(inv).toHaveTextContent("82%");
  expect(inv).toHaveTextContent("Beaconing to a known-bad IP from web-srv-01.");
  expect(within(inv).getByText("e".repeat(64))).toBeInTheDocument();
  expect(inv).toHaveTextContent("edr.process_tree");
  const steps = section("Agent steps");
  const rows = within(steps).getAllByRole("row");
  expect(rows).toHaveLength(1 + 1 + 3);                                // header, total, 3 steps
  expect(rows[1]).toHaveTextContent("Total");                          // totals sit at the top
  expect(steps).toHaveTextContent("6,030");                            // tokens in + out
  expect(steps).toHaveTextContent("4.37 s");
  expect(steps).toHaveTextContent("3 steps (2 model, 1 tool)");
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
  expect(within(section("Timeline")).getAllByText(XSS).length).toBeGreaterThan(0);
  expect(container.querySelector("img")).toBeNull();
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
  const enrichment = await screen.findByRole("region", { name: "Enrichment" });
  const row = within(enrichment).getByText("mystery-07").closest("tr")!;
  expect(row).toHaveTextContent("unknown");
  expect(within(enrichment).getByText("web-srv-01").closest("tr")).toHaveTextContent("critical");
});

test("enrichment shows the destinations alerts connected to, with their reputation", async () => {
  // S1: the C2 address is an alert destination, not a case entity, but the enricher looked it up.
  renderAt("/cases/41");
  const enrichment = await screen.findByRole("region", { name: "Enrichment" });
  const row = within(enrichment).getByText("203.0.113.50").closest("tr")!;
  expect(row).toHaveTextContent("malicious");
  expect(row).toHaveTextContent("destination");
});
