# Portal redesign (approved 2026-11-19)

## Intent
The portal looks dated. Make it modern for an interview demo (and a possible startup later). Case details, summary
and investigation are the main content; alerts must be visible inside the case.

## Goals
- Dark-first console with a light theme, new colour/spacing tokens, cards instead of bare bordered tables.
- Slim icon+label sidebar; severity is the only loud colour (coloured left edge on alert rows).
- Case page: header, summary (verdict, confidence, why), investigation + agent steps, an Alerts section of compact
  expandable rows, then enrichment / rule trace / related cases; decisions stay in a sticky right column.
- Queue: card-style rows with severity edge, severity count strip, "needs attention" marker, compact filter toolbar.
- Proposals, Rules, Health: new styling, same structure.

## Non-goals
Separate Alerts screen, new endpoints, API/contract changes, framework change, making the portal view-only.

## Approaches
1. Keep React + tests, restyle and re-layout (chosen: the look comes from design, not framework; tests carry over).
2. Svelte 5 rewrite (about double the work, no visible gain).
3. Vanilla JS or Bootstrap (generic look, loses router/query).

## Constraints
Build on the uncommitted agent-steps edits in the working tree. Fonts stay Public Sans and JetBrains Mono.
Existing tests must pass; change selectors only where markup changes. Check light/dark and desktop/phone widths.

## Left to the builder
Exact palette values, icon set (inline SVG, no new dependency), and how the summary is derived from the latest
investigation snapshot.
