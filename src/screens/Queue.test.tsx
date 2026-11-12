import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { QUEUE } from "../test/fixtures";
import { api } from "../test/handlers";
import { renderAt } from "../test/render";
import { server } from "../test/server";

const rows = () => screen.getAllByRole("row").slice(1);   // minus the header row
const ids = () => rows().map((r) => within(r).getAllByRole("cell")[0].textContent);

test("lists open cases with severity, entities, alert count and age", async () => {
  renderAt("/");
  const row = (await screen.findByRole("link", { name: "#41" })).closest("tr")!;
  expect(row).toHaveTextContent("Critical");
  expect(row).toHaveTextContent("web-srv-01");
  expect(row).toHaveTextContent("www-data");
  expect(within(row).getByTitle(/2026-11-07 10:00 UTC/)).toHaveTextContent(/ago$/);
  expect(within(row).getAllByRole("cell")[4]).toHaveTextContent("3");
});

test("orders by severity, then most recently updated", async () => {
  renderAt("/");
  await screen.findByRole("link", { name: "#41" });
  expect(ids()).toEqual(["#41", "#57", "#52", "#60"]);
});

test("merged case shows 'merged into #41' linking to /cases/41", async () => {
  renderAt("/");
  const row = (await screen.findByRole("link", { name: "#52" })).closest("tr")!;
  expect(row).toHaveAttribute("data-dim", "true");
  expect(within(row).getByRole("link", { name: "merged into #41" })).toHaveAttribute("href", "/cases/41");
  expect(row).toHaveTextContent("superseded");
});

test("severity and entity filters narrow the rows and come from the URL", async () => {
  renderAt("/?severity=4");
  await screen.findByRole("link", { name: "#41" });
  expect(ids()).toEqual(["#41", "#57"]);
  await userEvent.type(screen.getByLabelText("Exact host, user or IP"), "build-01");
  await vi.waitFor(() => expect(ids()).toEqual(["#57"]));
  await userEvent.selectOptions(screen.getByLabelText("Minimum severity"), "1");
  await userEvent.clear(screen.getByLabelText("Exact host, user or IP"));
  await vi.waitFor(() => expect(ids()).toEqual(["#41", "#57", "#52", "#60"]));
});

test("status filter asks the backend for that status", async () => {
  let asked: string | null = "unset";
  server.use(http.get(api("/queue"), ({ request }) => {
    asked = new URL(request.url).searchParams.get("status");
    return HttpResponse.json([]);
  }));
  renderAt("/?status=closed");
  expect(await screen.findByText(/no cases match/i)).toBeInTheDocument();
  expect(asked).toBe("closed");
});

test("a failed poll keeps the last rows, shows the error with their age, and recovers", async () => {   // RF5
  renderAt("/");
  await screen.findByRole("link", { name: "#41" });
  server.use(http.get(api("/queue"), () => HttpResponse.json({ error: "pipeline_unavailable" }, { status: 502 })));
  await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent(/not answering/);
  expect(alert).toHaveTextContent(/showing data from \d+ s ago/i);
  expect(screen.getByRole("link", { name: "#41" })).toBeInTheDocument();
  server.resetHandlers();
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  await vi.waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
});

test("clicking a row opens the case", async () => {
  renderAt("/");
  const link = await screen.findByRole("link", { name: "#57" });
  expect(link).toHaveAttribute("href", "/cases/57");
  await userEvent.click(link.closest("tr")!.querySelectorAll("td")[3]);
  await vi.waitFor(() => expect(screen.queryByRole("heading", { name: "Queue" })).not.toBeInTheDocument());
});


test("filters go to the backend with the limit, so they apply before it", async () => {   // review 4
  const asked: URLSearchParams[] = [];
  server.use(http.get(api("/queue"), ({ request }) => {
    asked.push(new URL(request.url).searchParams);
    return HttpResponse.json([]);
  }));
  renderAt("/?severity=5&entity=web-srv-01");
  await screen.findByText(/no cases match/i);
  const last = asked[asked.length - 1];
  expect([last.get("severity"), last.get("entity"), last.get("limit")]).toEqual(["5", "web-srv-01", "100"]);
});

test("a full page of results says there may be more", async () => {   // review 4
  const many = Array.from({ length: 100 }, (_, i) => ({ ...QUEUE[0], case_id: 1000 + i }));
  server.use(http.get(api("/queue"), () => HttpResponse.json(many)));
  renderAt("/");
  expect(await screen.findByText(/showing the 100 most recently updated matching cases/i)).toBeInTheDocument();
});
