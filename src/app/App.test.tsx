import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { api } from "../test/handlers";
import { renderAt } from "../test/render";
import { server } from "../test/server";

test("navigation shows the five screens and the analyst name", async () => {
  renderAt("/");
  const nav = screen.getByRole("navigation");
  for (const name of ["Queue", "Proposals", "Rules", "Pipeline health"]) {
    expect(nav).toHaveTextContent(name);
  }
  expect(screen.getByRole("link", { name: "Queue" })).toHaveAttribute("href", "/");
  expect(screen.getByText(/signed in as analyst/i)).toBeInTheDocument();
  expect(await screen.findByText("#41")).toBeInTheDocument();
});

test("main navigation marks the current page and every link has a decorative icon", async () => {
  renderAt("/");
  expect(screen.getByRole("link", { name: "Queue" })).toHaveAttribute("aria-current", "page");
  for (const name of ["Queue", "Proposals", "Rules", "Pipeline health"]) {
    const icon = screen.getByRole("link", { name }).querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  }
  await screen.findByText("#41");
});

test("an API failure shows ErrorState with retry, not a blank page", async () => {
  let calls = 0;
  server.use(http.get(api("/queue"), () => {
    calls += 1;
    return HttpResponse.json({ error: "pipeline_unavailable", message: "down" }, { status: 502 });
  }));
  renderAt("/");
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent(/portal backend is not answering/i);
  const before = calls;
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  await vi.waitFor(() => expect(calls).toBeGreaterThan(before));
});
