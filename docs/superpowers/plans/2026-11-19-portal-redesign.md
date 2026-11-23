# Portal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the SOC portal a modern dark-first look and a case page led by summary and investigation, with alerts shown inside the case.

**Architecture:** Same React app, same `openapi.yaml`, same API hooks. Replace the CSS with a tokenised system, add a few small presentational components, and re-order the case page. Tables stay real `<table>`s (styled as row cards) so existing role-based tests keep working.

**Tech Stack:** React 18, react-router 6, TanStack Query, Vitest + Testing Library + msw, plain CSS (no new dependencies; icons are inline SVG).

**Spec:** `docs/superpowers/specs/2026-11-19-portal-redesign-design.md`

## Global Constraints

- Run everything from `portal_ui/`; Node 22+ (`npm test`, `npm run typecheck`).
- No new npm dependencies. Fonts stay `@fontsource/public-sans` and `@fontsource/jetbrains-mono`.
- No change to `openapi.yaml`, `src/api/*`, or backend calls.
- Dark is the default theme; `@media (prefers-color-scheme: light)` switches to light. No toggle.
- Severity (levels 1 to 5) is the only loud colour; keep `--sev-1..5` token names.
- Status is never conveyed by colour alone (keep `StatusBadge` text and `data-status`).
- Keep the uncommitted agent-steps work; do not revert it.
- Existing accessible names stay unless a task says otherwise: nav links, regions "Investigation", "Enrichment", "Analyst verdict" form, buttons "Run investigation", "Refresh", "Try again".
- Every UI text and data value from the API is rendered as text (no `dangerouslySetInnerHTML`); `safety.test.ts` must keep passing.

## Review Focus

- A case with zero alerts: Alerts section shows "No alerts in this case." and count 0.
- A case with no completed investigation (pending, investigating, failed): Summary shows the agent status, not an empty verdict.
- An alert with no process, file or network detail: its row expands to a short "No further detail." line, no empty lists.
- Alert text containing markup (the XSS fixture) renders as text inside Alerts.
- Queue with all cases closed: severity strip shows zeros and "needs attention" shows none, with no layout break.
- Phone width (375px): sidebar becomes a top bar, case columns stack, no horizontal page scroll.

---

### Task 1: Tokens, theme and shell

**Files:**
- Modify: `src/styles.css` (rewrite the token block and shell/table/badge/button/card rules; keep every existing class name that components use)
- Modify: `src/app/Layout.tsx`
- Create: `src/components/Icon.tsx`
- Test: `src/app/App.test.tsx`

**Interfaces:**
- Produces: `Icon({ name }: { name: "queue" | "proposals" | "rules" | "health" }): JSX.Element` (decorative inline SVG, `aria-hidden="true"`); CSS tokens `--bg, --surface, --surface-2, --line, --text, --text-2, --accent, --radius, --shadow` plus existing `--sev-*`, `--refuse*`, `--warn*`; utility classes `.card` (surface, radius, 1px line) and `.page-head`.

- [ ] **Step 1: Baseline.** Run `git switch -c portal-redesign`, then `npm test` and `npm run typecheck`. Expected: all pass. Commit the existing uncommitted work as `wip: agent step totals` so the redesign diff is clean.
- [ ] **Step 2: Add test** in `App.test.tsx`: `"main navigation marks the current page"`: render at `/`, assert `getByRole("link", { name: "Queue" })` has `aria-current="page"`, and that each of the four nav links contains an `svg` with `aria-hidden="true"`. Run `npx vitest run src/app/App.test.tsx`; expect FAIL on the svg assertion.
- [ ] **Step 3: Implement `Icon`** with a `switch` on `name` returning a 18px stroke-only SVG (currentColor); use it in `Layout.tsx` before each label. Keep the link text unchanged so accessible names stay "Queue", "Proposals", "Rules", "Pipeline health".
- [ ] **Step 4: Rewrite `styles.css`**: dark tokens as `:root` default, light tokens inside `@media (prefers-color-scheme: light)`; sidebar 208px, sticky, active link with accent pill; `.content` max-width 1280px; tables as row cards (`border-collapse: separate; border-spacing: 0 6px`, each `tr` a surface with radius, severity colour via a 3px inset left edge set from a `data-sev` attribute when present); buttons, inputs, `.chip`, `.status`, `.panel` restyled; focus ring and reduced-motion rules kept; under 760px the rail becomes a top bar.
- [ ] **Step 5: Verify.** `npm test` and `npm run typecheck` pass. Start the app with `npm run dev`, open it in the browser pane, screenshot dark and light (`resize_window` colorScheme) at desktop and 375px width. Expected: no horizontal page scroll, readable contrast.
- [ ] **Step 6: Commit** `style: new design tokens, dark-first theme and shell`.

### Task 2: Alerts inside the case

**Files:**
- Create: `src/screens/case/Alerts.tsx`
- Modify: `src/screens/case/Timeline.tsx` (events only), `src/screens/CaseDetail.test.tsx`, `src/styles.css`
- Test: `src/screens/CaseDetail.test.tsx`

**Interfaces:**
- Consumes: `Case`, `Alert`, `suppressions()` from `src/screens/case/types.ts`; `Severity`, `Section`, `formatUtc`.
- Produces: `Alerts({ c }: { c: Case }): JSX.Element`, a `Section` titled exactly `"Alerts"` (so the region name is `Alerts`), with a separate `<span className="count">` beside the heading showing the number of alerts. `Timeline({ c })` keeps region name `"Timeline"` but lists only `closed` and `merged` events.

- [ ] **Step 1: Update and add tests** in `CaseDetail.test.tsx`. Change the existing alert assertions (the `awk -F: ...` and `curl ...` lookups at the top, and the XSS check that uses `section("Timeline")`) to query `section("Alerts")`. Add: `"alerts are listed newest last with severity, category, source, technique and time"`, `"expanding an alert shows command, parent and ancestors"` (click the row's `<summary>` and assert the command text is visible), `"an alert explained by a rule says so"` (`Explained by rule #… v…`), `"a case with no alerts says so"` (override the case handler with `alerts: []`; expect `No alerts in this case.`), `"an alert without detail expands to No further detail."`. Run `npx vitest run src/screens/CaseDetail.test.tsx`; expect FAIL (no Alerts region).
- [ ] **Step 2: Implement `Alerts.tsx`.** One `<details className="alert-row" data-suppressed>` per alert; `<summary>` is a single line: severity number badge, category (underscores to spaces), source, technique, time (`formatUtc`), entity chips. Body: reuse the dl markup from the old `AlertBody` (move it here, delete from `Timeline.tsx`), or `No further detail.` when no process, file or network. Left edge colour comes from `data-level`. Sort ascending by time as today.
- [ ] **Step 3: Slim `Timeline.tsx`** to events only; hide the section when there are none.
- [ ] **Step 4: Style** `.alert-row` (card, hover, open state, mono for `.cmd`); a `.count` pill next to the section title.
- [ ] **Step 5: Run** `npm test` and `npm run typecheck`; expect PASS.
- [ ] **Step 6: Commit** `feat: show alerts as expandable rows in the case`.

### Task 3: Case page layout and summary

**Files:**
- Create: `src/screens/case/Summary.tsx`
- Modify: `src/screens/CaseDetail.tsx`, `src/screens/case/Investigation.tsx` (drop the duplicate verdict block, keep evidence and run button), `src/screens/case/AgentSteps.tsx` (wrap steps in `<details open>`), `src/styles.css`
- Test: `src/screens/CaseDetail.test.tsx`

**Interfaces:**
- Consumes: `useInvestigations(caseId)` from `src/api/hooks.ts` (same query as `Investigation`, so it is de-duplicated); `Schemas["InvestigationView"]` fields `verdict`, `confidence`, `rationale`, `case_version`; `agent_status`.
- Produces: `Summary({ c }: { c: Case }): JSX.Element`, a `Section` named `"Summary"`.

- [ ] **Step 1: Write failing tests**: `"summary leads with the agent verdict, confidence and rationale"` (within region "Summary": verdict text, `NN% confidence`, rationale text); `"summary says the agent has not finished when there is no verdict"` (investigations handler returns `latest: null`, `agent_status: "pending"`; expect text `No completed investigation yet` and the status badge); `"summary flags a verdict written for an older case version"` (latest.case_version < c.version shows `Based on v{n}; the case is now v{m}`). Run; expect FAIL.
- [ ] **Step 2: Implement `Summary.tsx`** with those three states plus the failed state (show `last_failure.error` briefly). Large verdict word styled by verdict (malicious uses `--sev-5`, benign neutral).
- [ ] **Step 3: Rewrite `CaseDetail.tsx` order** in the left column: `Summary`, `Investigation`, `Alerts`, `Timeline`, `Enrichment`, `RuleTrace`, `RelatedCases`. Header becomes a `.page-head` card: title, severity, status, entity chips, opened/updated. Right column unchanged (`ProposalList`, `VerdictForm`), sticky. In `Investigation.tsx` remove the rows now shown in Summary (verdict, rationale) but keep `Evidence hash`, evidence table, history and run button; update the existing test at line ~27-31 only if it asserted the removed rows (verdict text now lives in Summary).
- [ ] **Step 4: Run** `npm test`, `npm run typecheck`; expect PASS.
- [ ] **Step 5: Look at it.** Open `/cases/41` against the msw-less dev server only if a backend is available; otherwise render via the unit-test fixtures and use the browser pane on the Vite dev server with the backend URL pointing at the lab if running. Screenshot desktop dark/light and 375px.
- [ ] **Step 6: Commit** `feat: case page leads with summary and investigation`.

### Task 4: Queue

**Files:**
- Create: `src/screens/queue/SeverityStrip.tsx`
- Modify: `src/screens/Queue.tsx`, `src/styles.css`
- Test: `src/screens/Queue.test.tsx`

**Interfaces:**
- Produces: `SeverityStrip({ items }: { items: Schemas["QueueItem"][] }): JSX.Element`, five counters labelled `Severity 5`..`Severity 1` plus `Needs attention`, counting only `status === "open"` items; `needsAttention(c: QueueItem): boolean` exported from the same file, true when `c.status === "open"` and `c.agent_status` is `"done"` or `"failed"`.

- [ ] **Step 1: Write failing tests**: `"the strip counts open cases by severity"`; `"needs attention counts open cases whose agent finished or failed"`; `"a closed-only queue shows zeros"`; `"an attention case carries an Attention marker in its row"`. Existing row and cell-index tests must stay valid, so do not add or reorder `<td>` columns (put the marker inside the Case cell). Run; expect FAIL.
- [ ] **Step 2: Implement** `SeverityStrip` and `needsAttention`; render the strip above the filters; mark attention rows with `<StatusBadge status="warn" label="needs attention" />` in the first cell; set `data-sev={c.severity}` on each `<tr>`; restyle filters as one compact toolbar (labels stay, so `getByLabelText` tests keep working).
- [ ] **Step 3: Run** `npm test`, `npm run typecheck`; expect PASS.
- [ ] **Step 4: Commit** `feat: queue severity strip and attention marker`.

### Task 5: Other screens, final checks

**Files:**
- Modify: `src/screens/Proposals.tsx`, `Rules.tsx`, `Health.tsx`, `src/components/ProposalCard.tsx` only for class names; `src/styles.css`
- Modify: `README.md` (one line on the theme)

- [ ] **Step 1:** Apply `.page-head` and `.card` to the headings and panels of Proposals, Rules and Health; keep all text, roles and labels.
- [ ] **Step 2: Verify.** `npm test`, `npm run typecheck`, `npm run build`; expected all succeed. Walk every route in the browser pane at desktop and 375px, light and dark; read console messages and expect no errors.
- [ ] **Step 3: Commit** `style: apply new look to proposals, rules and health`.
