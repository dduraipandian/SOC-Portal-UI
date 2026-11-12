import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { components } from "../api/schema";
import { api } from "../test/handlers";
import { renderAt } from "../test/render";
import { server } from "../test/server";

type Health = components["schemas"]["Health"];
const ago = (s: number) => new Date(Date.now() - s * 1000).toISOString();

function healthy(over: Partial<Health> = {}): Health {
  return {
    consumer_lag: [{ group: "normalizer", topic: "alerts.raw", lag: 0 }, { group: "rules", topic: "cases.enriched", lag: 3 }],
    outbox: { backlog: 2, oldest_unsent_age_s: 4.2, failed: 0 },
    dlq: { messages: 0 },
    last_pull: { "sentrix-edr": ago(10), "keyline-idp": ago(20), "nimbus-cloud": ago(30) },
    ...over,
  };
}

const serve = (h: () => Health) => server.use(http.get(api("/ops/health"), () => HttpResponse.json(h())));
const region = (name: string) => screen.findByRole("region", { name });

test("renders lag per group/topic, outbox, DLQ and last pull per vendor", async () => {
  serve(() => healthy());
  renderAt("/health");
  const lag = await region("Consumer lag");
  expect(within(lag).getByRole("row", { name: /rules cases.enriched 3/ })).toBeInTheDocument();
  expect(within(await region("Outbox")).getByText("2")).toBeInTheDocument();
  expect(await region("Dead-letter queue")).toHaveTextContent("0");
  const pulls = await region("Last pull per vendor");
  expect(within(pulls).getByRole("row", { name: /sentrix-edr/ })).toHaveTextContent(/s ago/);
  expect(screen.queryAllByText("warning")).toHaveLength(0);
});

test("thresholds: lag > 100, outbox age > 60 s, DLQ > 0, pull older than 2 min are warnings", async () => {
  serve(() => healthy({
    consumer_lag: [{ group: "correlator", topic: "alerts.normalized", lag: 101 }, { group: "rules", topic: "cases.enriched", lag: 100 }],
    outbox: { backlog: 9, oldest_unsent_age_s: 61, failed: 1 },
    dlq: { messages: 2 },
    last_pull: { "sentrix-edr": ago(121), "keyline-idp": ago(119), "nimbus-cloud": ago(5) },
  }));
  renderAt("/health");
  const lag = await region("Consumer lag");
  expect(within(lag).getByRole("row", { name: /correlator/ })).toHaveTextContent("warning");
  expect(within(lag).getByRole("row", { name: /rules/ })).not.toHaveTextContent("warning");
  expect(await region("Outbox")).toHaveTextContent("warning");
  expect(await region("Dead-letter queue")).toHaveTextContent("warning");
  const pulls = await region("Last pull per vendor");
  expect(within(pulls).getByRole("row", { name: /sentrix-edr/ })).toHaveTextContent("warning");
  expect(within(pulls).getByRole("row", { name: /keyline-idp/ })).not.toHaveTextContent("warning");
});

test("a vendor never pulled shows 'never' as a warning", async () => {
  serve(() => healthy({ last_pull: { "sentrix-edr": ago(5), "keyline-idp": null, "nimbus-cloud": ago(5) } }));
  renderAt("/health");
  const row = within(await region("Last pull per vendor")).getByRole("row", { name: /keyline-idp/ });
  expect(row).toHaveTextContent("never");
  expect(row).toHaveTextContent("warning");
});

test("health endpoint down: last good values stay with their age and an error banner; recovers", async () => {   // RF5
  serve(() => healthy());
  renderAt("/health");
  await region("Consumer lag");
  server.use(http.get(api("/ops/health"), () => HttpResponse.json({ error: "pipeline_unavailable" }, { status: 502 })));
  await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent(/showing data from \d+ s ago/i);
  expect(within(await region("Consumer lag")).getByRole("row", { name: /rules/ })).toBeInTheDocument();
  serve(() => healthy());
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  await vi.waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  expect(screen.getByText(/updated \d+ s ago/)).toBeInTheDocument();
});
