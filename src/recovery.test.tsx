// Review finding 5: every screen that says "It retries on its own" must actually recover without a click.
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { caseDetail, rule } from "./test/fixtures";
import { api } from "./test/handlers";
import { renderAt } from "./test/render";
import { server } from "./test/server";

const down = () => HttpResponse.json({ error: "pipeline_unavailable" }, { status: 502 });

test("rules screen recovers from an outage on its own", async () => {
  let calls = 0;
  server.use(http.get(api("/rule-suggestions"), () => (++calls <= 1 ? down() : HttpResponse.json([rule()]))));
  renderAt("/rules");
  expect(await screen.findByRole("alert")).toHaveTextContent(/retries on its own/);
  expect(await screen.findByRole("article", {}, { timeout: 12000 })).toBeInTheDocument();
  expect(screen.queryByRole("alert")).toBeNull();
});

test("rule tables recover from an outage on its own", async () => {
  let calls = 0;
  server.use(http.get(api("/rules"), () => (++calls <= 1 ? down() : HttpResponse.json([rule({ status: "active" })]))));
  renderAt("/rules");
  (await screen.findByRole("tab", { name: "Active" })).click();
  await screen.findByRole("alert");
  expect(await screen.findByRole("row", { name: /build-01 nightly/ }, { timeout: 12000 })).toBeInTheDocument();
});

test("case detail recovers from an outage on its own and keeps updating", async () => {
  let calls = 0;
  server.use(http.get(api("/cases/41"), () => {
    calls += 1;
    return calls <= 1 ? down() : HttpResponse.json(caseDetail({ version: calls }));
  }));
  renderAt("/cases/41");
  await screen.findByRole("alert");
  expect(await screen.findByRole("heading", { name: /Case #41/ }, { timeout: 12000 })).toBeInTheDocument();
  const first = calls;
  await screen.findByText(`v${first + 1}`, {}, { timeout: 12000 });
});
