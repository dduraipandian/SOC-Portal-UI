import { screen, waitFor, within } from "@testing-library/react";
import { focusManager } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { BATCH_BASELINE, EVAL_BATCHES, EVAL_RUNS, RUN_GEMINI_3, RUN_PROD_1, RUN_PROD_3 } from "../test/fixtures";
import { api } from "../test/handlers";
import { renderAt } from "../test/render";
import { server } from "../test/server";

test("the newest batch opens with its scoreboard", async () => {
  renderAt("/evals");

  const batches = await screen.findByRole("navigation", { name: "Batches" });
  const links = await within(batches).findAllByRole("link");
  expect(links.map((l) => l.textContent)).toEqual([
    expect.stringContaining("baseline before prompt fix"), expect.stringContaining("smoke"),
  ]);
  expect(links[0]).toHaveAttribute("aria-current", "page");
  expect(await screen.findByText("14 / 36")).toBeInTheDocument();

  const board = screen.getByRole("table", { name: "Scoreboard" });
  const production = within(board).getByRole("row", { name: /production/ });
  expect(within(production).getByRole("cell", { name: /^0\/1/ })).toBeInTheDocument();
});

test("an unfinished batch shows … for slots not run yet", async () => {
  renderAt("/evals");

  const board = await screen.findByRole("table", { name: "Scoreboard" });
  const qwen = within(board).getByRole("row", { name: /qwen2b/ });
  // case 3 has no run yet; case 1 has one of three
  const cells = within(qwen).getAllByRole("cell");
  expect(cells.map((c) => c.textContent)).toEqual(expect.arrayContaining(["…", "0/1 …"]));
});

const runCards = () => within(screen.getByRole("list", { name: "Runs" })).getAllByRole("button");
const why = () => screen.getByRole("region", { name: "Why" });

test("clicking a variant opens its first incorrect run and says why", async () => {
  renderAt(`/evals/${BATCH_BASELINE}`);
  await userEvent.click(await screen.findByRole("button", { name: "production" }));

  await screen.findByRole("list", { name: "Runs" });
  const pressed = runCards().filter((c) => c.getAttribute("aria-pressed") === "true");
  expect(pressed).toHaveLength(1);
  expect(pressed[0]).toHaveTextContent("case 3");
  expect(await within(await screen.findByRole("region", { name: "Why" })).findByText(/no process tree at the alert time/))
    .toBeInTheDocument();
  expect(within(why()).getByText(/no history search for what the alert is about/)).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Agent steps" })).toBeInTheDocument();
});

test("a link to a run opens that run, not the variant's default", async () => {
  // production opens on its incorrect case-3 run by default; the link names its correct case-1 run
  renderAt(`/evals/${BATCH_BASELINE}?variant=production&run=${RUN_PROD_1}`);

  await screen.findByRole("list", { name: "Runs" });
  const pressed = runCards().filter((c) => c.getAttribute("aria-pressed") === "true");
  expect(pressed.map((c) => c.textContent)).toEqual([expect.stringContaining("case 1 · #1")]);
  expect(await within(await screen.findByRole("region", { name: "Why" })).findByText(/expected benign, got benign/))
    .toBeInTheDocument();
});

test("a review is saved with the analyst", async () => {
  let sent: { body: unknown; analyst: string | null; path: string } | undefined;
  server.use(http.put(api("/evals/runs/:id/review"), async ({ request, params }) => {
    sent = { body: await request.json(), analyst: request.headers.get("X-Analyst"), path: String(params.id) };
    const reviewed = EVAL_RUNS[RUN_GEMINI_3];
    return HttpResponse.json({
      ...reviewed, outcome: "correct",
      grades: [...reviewed.grades, { grader: "rationale_human", version: 1, passed: true, details: { note: "ok", reviewer: "analyst" } }],
    });
  }));
  renderAt(`/evals/${BATCH_BASELINE}?variant=gemini-flash-lite`);

  const form = await screen.findByRole("form", { name: "Review" });
  await userEvent.click(within(form).getByRole("radio", { name: "Correct" }));
  await userEvent.type(within(form).getByRole("textbox", { name: "Note" }), "ok");
  await userEvent.click(within(form).getByRole("button", { name: "Save review" }));

  await within(why()).findByText(/analyst: ok/);
  expect(sent).toEqual({ body: { correct: true, note: "ok" }, analyst: expect.any(String), path: RUN_GEMINI_3 });
  expect(sent?.analyst).not.toBe("");
});

test("the run view loads step details from the eval run", async () => {
  const fetched: string[] = [];
  server.events.on("request:start", ({ request }) => {
    if (request.url.includes("/steps/")) fetched.push(new URL(request.url).pathname);
  });
  renderAt(`/evals/${BATCH_BASELINE}?variant=production&run=${RUN_PROD_3}`);

  const steps = await screen.findByRole("region", { name: "Agent steps" });
  await userEvent.click(steps.querySelector("summary")!);
  await userEvent.click(within(steps).getAllByRole("option")[1]);
  await within(steps).findByText(/arun\.m/);
  expect(fetched).toContain(`/api/evals/runs/${RUN_PROD_3}/steps/1`);
  server.events.removeAllListeners();
});

test("a variant whose cases have not run yet is pending, not failing", async () => {
  renderAt(`/evals/${BATCH_BASELINE}`);

  const board = await screen.findByRole("table", { name: "Scoreboard" });
  const gemma = within(board).getByRole("row", { name: /gemma-e2b/ });  // no run has counted yet
  expect(within(gemma).getByRole("cell", { name: "0 of 3, 3 pending" })).toBeInTheDocument();
});

test("a batch started meanwhile does not take over the page you are reading", async () => {
  renderAt("/evals");
  await userEvent.click(await screen.findByRole("button", { name: "production" }));
  await screen.findByRole("list", { name: "Runs" });

  // a new batch is started from the CLI; the list is fetched again when the window regains focus
  const NEW = "01a1fd00-0000-7000-8000-000000000003";
  server.use(
    http.get(api("/evals/batches"), () => HttpResponse.json([{ ...EVAL_BATCHES[0], batch_id: NEW, note: "after prompt fix" }, ...EVAL_BATCHES])),
    http.get(api(`/evals/batches/${NEW}`), () => HttpResponse.json({
      batch: { ...EVAL_BATCHES[0], batch_id: NEW, note: "after prompt fix" }, cases: [], variants: [], rows: [], runs: [],
      pending_reviews: 0, infra: 0, median_ms: 0,
    })),
  );
  focusManager.setFocused(false);
  focusManager.setFocused(true);

  const batches = screen.getByRole("navigation", { name: "Batches" });
  await within(batches).findByText("after prompt fix");
  await waitFor(() => expect(within(batches).getAllByRole("link")).toHaveLength(3));
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("baseline before prompt fix");
  expect(within(batches).getByRole("link", { name: /baseline before prompt fix/ })).toHaveAttribute("aria-current", "page");
  focusManager.setFocused(undefined);
});

test("a batch opens on its first variant's runs", async () => {
  renderAt(`/evals/${BATCH_BASELINE}`);

  expect(await screen.findByRole("region", { name: "Runs of production" })).toBeInTheDocument();
  expect(await screen.findByRole("list", { name: "Runs" })).toBeInTheDocument();
});
