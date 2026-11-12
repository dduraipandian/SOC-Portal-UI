import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { rule, SIMULATION, XSS } from "../test/fixtures";
import { api } from "../test/handlers";
import { renderAt } from "../test/render";
import { server } from "../test/server";

const suggestion = () => screen.findByRole("article", { name: "build-01 nightly password-expiry audit" });

async function approveWithReason(card: HTMLElement) {
  await userEvent.click(within(card).getByRole("button", { name: "Approve…" }));
  await userEvent.type(within(card).getByLabelText("Reason"), "reviewed the simulation");
  await userEvent.click(within(card).getByRole("button", { name: "Approve this rule" }));
}

test("suggestion shows reason, evidence case links and readable conditions", async () => {
  renderAt("/rules");
  const card = await suggestion();
  expect(card).toHaveTextContent("Scheduled maintenance by svc-maint; seen daily with identical arguments.");
  expect(card).toHaveTextContent("Suggested by agent");
  expect(within(card).getByRole("link", { name: "#57" })).toHaveAttribute("href", "/cases/57");
  expect(within(card).getByRole("link", { name: "#63" })).toHaveAttribute("href", "/cases/63");
  expect(card).toHaveTextContent("every host = build-01");
  expect(card).toHaveTextContent("process user = svc-maint");
  expect(card).toHaveTextContent("any ancestor command matches ^/usr/sbin/cron( |$)");
  expect(card).toHaveTextContent("Auto-close as benign");
});

test("simulate shows full and partial counts and sample cases; malicious-in-full is highlighted", async () => {
  server.use(http.post(api("/rules/simulate"), () => HttpResponse.json({ ...SIMULATION, full_marked_malicious: 1 })));
  renderAt("/rules");
  const card = await suggestion();
  await userEvent.click(within(card).getByRole("button", { name: "Simulate" }));
  const sim = await within(card).findByRole("region", { name: "Simulation" });
  expect(sim).toHaveTextContent("Would close6");
  expect(sim).toHaveTextContent("Would only tag2");
  expect(within(sim).getByRole("link", { name: "#70" })).toHaveAttribute("href", "/cases/70");
  expect(within(sim).getByText("Marked malicious by analysts").closest("div")).toHaveAttribute("data-warn", "true");
  expect(sim).toHaveTextContent("40 cases from the last 30 days");
});

test("an auto_close suggestion cannot be approved before a simulation in this session", async () => {
  renderAt("/rules");
  const card = await suggestion();
  expect(within(card).getByRole("button", { name: "Approve…" })).toBeDisabled();
  expect(card).toHaveTextContent("Run a simulation before approving");
  await userEvent.click(within(card).getByRole("button", { name: "Simulate" }));
  await within(card).findByRole("region", { name: "Simulation" });
  expect(within(card).getByRole("button", { name: "Approve…" })).toBeEnabled();
});

test("approve sends expected_version; 409 version_changed shows refusal and refetches", async () => {   // RF2
  let sent: unknown;
  let loads = 0;
  server.use(
    http.get(api("/rule-suggestions"), () => {
      loads += 1;
      return HttpResponse.json([rule({ version: loads > 1 ? 2 : 1 })]);
    }),
    http.post(api("/rule-suggestions/7/approve"), async ({ request }) => {
      sent = await request.json();
      return HttpResponse.json({ error: "version_changed", current_version: 2, status: null }, { status: 409 });
    }),
  );
  renderAt("/rules");
  const card = await suggestion();
  await userEvent.click(within(card).getByRole("button", { name: "Simulate" }));
  await within(card).findByRole("region", { name: "Simulation" });
  await approveWithReason(card);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This changed since you loaded it (now v2). Reload and try again.");
  expect(sent).toEqual({ expected_version: 1, reason: "reviewed the simulation" });
  await vi.waitFor(() => expect(loads).toBeGreaterThan(1));
});

test("reject needs a reason and sends expected_version", async () => {
  let sent: unknown;
  server.use(http.post(api("/rule-suggestions/7/reject"), async ({ request }) => {
    sent = await request.json();
    return HttpResponse.json(rule({ status: "rejected", version: 2 }));
  }));
  renderAt("/rules");
  const card = await suggestion();
  await userEvent.click(within(card).getByRole("button", { name: "Reject…" }));
  await userEvent.type(within(card).getByLabelText("Reason"), "too broad");
  await userEvent.click(within(card).getByRole("button", { name: "Reject this rule" }));
  await vi.waitFor(() => expect(sent).toEqual({ expected_version: 1, reason: "too broad" }));
});

test("expiring tab requests expiring_within_days=7", async () => {
  let query = "";
  server.use(http.get(api("/rules"), ({ request }) => {
    query = new URL(request.url).search;
    return HttpResponse.json([rule({ status: "active", version: 2 })]);
  }));
  renderAt("/rules");
  await userEvent.click(await screen.findByRole("tab", { name: "Expiring within 7 days" }));
  await screen.findByRole("row", { name: /build-01 nightly/ });
  expect(query).toContain("status=active");
  expect(query).toContain("expiring_within_days=7");
});

test("renew runs simulate first, then renew with expected_version; 409 simulation_required is shown", async () => {   // RF2
  const calls: string[] = [];
  let renewBody: Record<string, unknown> | undefined;
  server.use(
    http.get(api("/rules"), () => HttpResponse.json([rule({ status: "active", version: 2 })])),
    http.post(api("/rules/simulate"), () => {
      calls.push("simulate");
      return HttpResponse.json(SIMULATION);
    }),
    http.post(api("/rules/7/renew"), async ({ request }) => {
      calls.push("renew");
      renewBody = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({ error: "simulation_required", current_version: null, status: "active" }, { status: 409 });
    }),
  );
  renderAt("/rules");
  await userEvent.click(await screen.findByRole("tab", { name: "Active" }));
  const row = await screen.findByRole("row", { name: /build-01 nightly/ });
  await userEvent.click(within(row).getByRole("button", { name: "Renew…" }));
  await userEvent.click(screen.getByRole("button", { name: "Simulate and renew" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Run a fresh simulation before renewing.");
  expect(calls).toEqual(["simulate", "renew"]);
  expect(renewBody).toMatchObject({ expected_version: 2, simulation_id: SIMULATION.simulation_id });
});

test("the renew date picker refuses more than 90 days", async () => {
  server.use(http.get(api("/rules"), () => HttpResponse.json([rule({ status: "active", version: 2 })])));
  renderAt("/rules");
  await userEvent.click(await screen.findByRole("tab", { name: "Active" }));
  const row = await screen.findByRole("row", { name: /build-01 nightly/ });
  await userEvent.click(within(row).getByRole("button", { name: "Renew…" }));
  const date = screen.getByLabelText("Valid until") as HTMLInputElement;
  const far = new Date(Date.now() + 100 * 86400_000).toISOString().slice(0, 10);
  await userEvent.clear(date);
  await userEvent.type(date, far);
  expect(screen.getByRole("button", { name: "Simulate and renew" })).toBeDisabled();
  expect(screen.getByText(/at most 90 days/)).toBeInTheDocument();
});

test("a rule reason renders as text", async () => {   // RF3
  server.use(http.get(api("/rule-suggestions"), () => HttpResponse.json([rule({}, { reason: XSS })])));
  const { container } = renderAt("/rules");
  const card = await suggestion();
  expect(within(card).getByText(XSS)).toBeInTheDocument();
  expect(container.querySelector("img")).toBeNull();
});

test.each([
  ["version_changed", { error: "version_changed", current_version: 2, status: null },
   "This changed since you loaded it (now v2). Reload and try again."],
  ["invalid_state", { error: "invalid_state", current_version: null, status: "active" },
   "This rule is active now, so that action no longer applies."],
] as const)("a refused approval stays visible after the refetch drops the suggestion (%s)", async (_code, body, message) => {   // review 1
  let loads = 0;
  server.use(
    http.get(api("/rule-suggestions"), () => {
      loads += 1;
      return HttpResponse.json(loads > 1 ? [] : [rule()]);   // someone else approved it first
    }),
    http.post(api("/rule-suggestions/7/approve"), () => HttpResponse.json(body, { status: 409 })),
  );
  renderAt("/rules");
  const card = await suggestion();
  await userEvent.click(within(card).getByRole("button", { name: "Simulate" }));
  await within(card).findByRole("region", { name: "Simulation" });
  await approveWithReason(card);
  await vi.waitFor(() => expect(loads).toBeGreaterThan(1));
  await vi.waitFor(() => expect(screen.queryByRole("article")).toBeNull());
  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent("build-01 nightly password-expiry audit");
  expect(alert).toHaveTextContent(message);
});
