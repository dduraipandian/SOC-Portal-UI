import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import type { Proposal } from "../test/fixtures";
import { HASH_41, proposal } from "../test/fixtures";
import { api } from "../test/handlers";
import { renderAt } from "../test/render";
import { server } from "../test/server";

const OTHER_HASH = "1".repeat(64);

function serve(list: () => Proposal[]) {
  server.use(http.get(api("/proposals"), () => HttpResponse.json(list())));
}

async function card(name = /contain host/i) {
  return (await screen.findByRole("article", { name })) as HTMLElement;
}

async function openApprove(c: HTMLElement, reason = "beaconing confirmed") {
  await userEvent.click(within(c).getByRole("button", { name: "Approve…" }));
  const dialog = within(c).getByRole("dialog");
  await userEvent.type(within(dialog).getByLabelText("Reason"), reason);
  return dialog;
}

test("shows every param, the full approval_hash and the case version being approved", async () => {
  serve(() => [proposal({ params: { isolation: "network", keep_sensor: true, note: "eu-west" } })]);
  renderAt("/proposals");
  const c = await card();
  const params = within(c).getByRole("table", { name: "Parameters" });
  expect(within(params).getAllByRole("row")).toHaveLength(3);
  expect(params).toHaveTextContent("keep_sensor");
  expect(params).toHaveTextContent("true");
  const fp = within(c).getByLabelText(`Approval hash ${HASH_41}`);
  expect(fp.textContent!.replace(/\s/g, "")).toBe(HASH_41);
  expect(c).toHaveTextContent("Case #41 v3");
  expect(c).toHaveTextContent("web-srv-01");
  expect(c).toHaveTextContent("sentrix-edr");
});

test("approve sends the hash that was rendered", async () => {   // RF1
  let body: unknown;
  server.use(http.post(api("/proposals/:id/approve"), async ({ request }) => {
    body = await request.json();
    return HttpResponse.json(proposal({ status: "approved" }));
  }));
  renderAt("/proposals");
  const dialog = await openApprove(await card());
  await userEvent.click(within(dialog).getByRole("button", { name: "Approve this action" }));
  await vi.waitFor(() => expect(body).toEqual({ approval_hash: HASH_41, reason: "beaconing confirmed" }));
});

test("proposal changes while the dialog is open: approve sends the old hash; 409 hash_mismatch is shown", async () => {   // RF1
  let current = proposal();
  let sent: { approval_hash: string } | undefined;
  serve(() => [current]);
  server.use(http.post(api("/proposals/:id/approve"), async ({ request }) => {
    sent = (await request.json()) as { approval_hash: string };
    return HttpResponse.json({ error: "hash_mismatch", message: "differs", proposal: current }, { status: 409 });
  }));
  renderAt("/proposals");
  const c = await card();
  const dialog = await openApprove(c);
  current = proposal({ approval_hash: OTHER_HASH, params: { isolation: "full" } });
  await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
  await within(c).findByLabelText(`Approval hash ${OTHER_HASH}`);
  expect(within(dialog).getByLabelText(`Approving hash ${HASH_41}`)).toBeInTheDocument();
  await userEvent.click(within(dialog).getByRole("button", { name: "Approve this action" }));
  expect(await within(c).findByRole("alert")).toHaveTextContent("This proposal changed since you opened it. Review it again.");
  expect(sent?.approval_hash).toBe(HASH_41);
  expect(c).not.toHaveTextContent(/approved/i);
});

test.each([
  ["case_changed", "The case changed since this proposal was made. A new proposal will follow.", "superseded"],
  ["investigation_changed", "A newer investigation replaced this one.", "superseded"],
  ["expired", "This proposal expired (60 minutes).", "expired"],
  ["already_decided", "Someone already decided this proposal.", "rejected"],
] as const)("409 %s shows its message, refetches, and never shows 'approved'", async (code, message, after) => {   // RF2
  let loads = 0;
  let status: Proposal["status"] = "proposed";
  serve(() => {
    loads += 1;
    return [proposal({ status })];
  });
  server.use(http.post(api("/proposals/:id/approve"), () => {
    status = after;
    return HttpResponse.json({ error: code, proposal: proposal({ status: after }) }, { status: 409 });
  }));
  renderAt("/proposals");
  const c = await card();
  const dialog = await openApprove(c);
  const before = loads;
  await userEvent.click(within(dialog).getByRole("button", { name: "Approve this action" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(message);
  await vi.waitFor(() => expect(loads).toBeGreaterThan(before));
  expect(await screen.findByText(after)).toBeInTheDocument();
  expect(screen.queryByText("approved")).toBeNull();
});

test("double click on Approve sends one request; the button is disabled while pending", async () => {   // RF4
  let posts = 0;
  server.use(http.post(api("/proposals/:id/approve"), async () => {
    posts += 1;
    await delay(300);
    return HttpResponse.json(proposal({ status: "approved" }));
  }));
  renderAt("/proposals");
  const dialog = await openApprove(await card());
  const confirm = within(dialog).getByRole("button", { name: "Approve this action" });
  await userEvent.dblClick(confirm);
  expect(confirm).toBeDisabled();
  await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(posts).toBe(1);
});

test("live status: approved → executing → succeeded through polling", async () => {
  const states: Proposal["status"][] = ["approved", "executing", "succeeded"];
  let i = 0;
  serve(() => [proposal({ status: states[Math.min(i++, states.length - 1)] })]);
  renderAt("/proposals");
  const c = await card();
  expect(within(c).getByText("approved")).toBeInTheDocument();
  await screen.findByText("succeeded", { selector: ".status" }, { timeout: 8000 });
  expect(c).toBeInTheDocument();   // the same card, updated in place
}, 12000);

test("succeeded contain_host offers Undo, which creates a proposed release_host", async () => {
  const list = [proposal({ status: "succeeded" })];
  let undoBody: unknown;
  serve(() => list);
  server.use(http.post(api("/proposals/:id/undo"), async ({ request }) => {
    undoBody = await request.json();
    const undo = proposal({ proposal_id: "cccccccc-0000-0000-0000-000000000041", action_type: "release_host",
                            reverses_proposal_id: list[0].proposal_id, approval_hash: OTHER_HASH });
    list.unshift(undo);
    return HttpResponse.json(undo, { status: 201 });
  }));
  renderAt("/proposals");
  const c = await card();
  expect(within(c).queryByRole("button", { name: "Approve…" })).toBeNull();
  await userEvent.click(within(c).getByRole("button", { name: "Undo…" }));
  await userEvent.type(within(c).getByLabelText("Reason"), "false alarm");
  await userEvent.click(within(c).getByRole("button", { name: "Propose the undo" }));
  const undo = await card(/release host/i);
  expect(within(undo).getByText("proposed")).toBeInTheDocument();
  expect(undo).toHaveTextContent(`Undoes ${list[1].proposal_id}`);
  expect(undoBody).toEqual({ reason: "false alarm" });
});

test.each(["superseded", "expired", "rejected", "failed"] as const)("%s cards have no action buttons", async (status) => {
  serve(() => [proposal({ status })]);
  renderAt("/proposals");
  const c = await card();
  expect(within(c).queryAllByRole("button")).toHaveLength(0);
  expect(c).toHaveAttribute("data-final", "true");
});

test("a reason is required to approve or reject", async () => {
  renderAt("/proposals");
  const c = await card();
  await userEvent.click(within(c).getByRole("button", { name: "Reject…" }));
  const confirm = within(c).getByRole("button", { name: "Reject this action" });
  expect(confirm).toBeDisabled();
  await userEvent.type(within(c).getByLabelText("Reason"), "admin work");
  expect(confirm).toBeEnabled();
});

test("/proposals groups by status with proposed first", async () => {
  serve(() => [proposal({ proposal_id: "p-1", status: "succeeded" }), proposal({ proposal_id: "p-2" })]);
  renderAt("/proposals");
  await screen.findAllByRole("article", { name: /contain host/i });
  const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
  expect(headings).toEqual(["Waiting for a decision (1)", "Succeeded (1)"]);
});

test("case detail shows the case's proposals as cards", async () => {
  renderAt("/cases/41");
  const decisions = await screen.findByRole("region", { name: "Decision" });
  expect(await within(decisions).findByRole("article", { name: /contain host/i })).toBeInTheDocument();
});
