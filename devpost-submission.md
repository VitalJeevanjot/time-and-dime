# Time&Dime — Devpost submission draft

This is a local draft, not a submitted Devpost entry. Select the exact event and verify its live rules, dates, eligibility, judging criteria, required fields, and repository policy before adapting this text to the official form.

## Official form fields — TODO

- Project title: `Time&Dime`
- Tagline: `A local-first, WebMCP-enabled timed scenario calculator.`
- Event/category/track: `TODO after event selection`
- Team members: `TODO`
- Technologies: `Vue 3, Vite, JavaScript, Decimal.js, WebMCP, localStorage`
- Try-it-out instructions: `TODO after deployment decision`

## Problem

Forecasts are often described as timed chains—“add 10 every five seconds, then apply 6% to the next value”—but a conventional calculator hides the timing and relationship between rules. It is also difficult for an AI assistant to operate those scenarios safely when the application exposes only pixels and free-form text.

## Solution

Time&Dime makes each rule a visible Value or Percentage card in a directed graph. Cards run on virtual millisecond schedules and affect only the immediately connected level above. The same application also exposes structured imperative WebMCP tools for creating, inspecting, calculating, cloning, and comparing scenarios.

## Why this matters

The graph makes a multi-step scenario explainable to a person, while typed WebMCP operations make it operable by a compatible browser agent. Local-first storage keeps experimentation lightweight, and deterministic arithmetic keeps numeric results independent of generative-model output.

## What it does

- Creates Duration or Date & time projects.
- Builds horizontal and vertical graphs from Value and Percentage cards.
- Applies operations one immediate level at a time; a lower card never skips an intermediate level.
- Supports static calculation fields, per-node time limits, and fixed or target-relative Percentage bases.
- Uses canonical decimal strings and BigInt virtual schedules under documented time-unit conversions.
- Provides structured calculation summaries and detailed per-node results.
- Clones projects with new UUIDs and compares selected nodes across scenarios.
- Exposes project and node workflows through imperative WebMCP tools.

## Architecture

Time&Dime is a Vue 3/Vite single-page application with no application backend. One `localStorage` entry is used per project UUID. Decimal.js performs calculation-field arithmetic from canonical strings; BigInt represents schedule milliseconds. An event-driven virtual-time scheduler orders simultaneous nodes bottom-to-top, and the propagation layer updates only unique immediate parents. Route and app components register WebMCP tools that reuse the same storage, validation, graph, and calculation modules.

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## How we used Codex

Codex served as an active pair-programming agent: it inspected the evolving repository, implemented product requirements, reviewed graph and scheduler edge cases, wrote automated tests, ran production builds, and prepared documentation. Specialized review passes checked propagation semantics, WebMCP contracts, clone safety, calculation bounds, and submission readiness. The author directed the product, design, graph semantics, and acceptance decisions.

## How AI appears in the product

Time&Dime does not embed a generative model and does not ask AI to produce numeric results. A compatible external browser agent can discover and invoke the page’s WebMCP tools. The calculator itself remains deterministic and validates every tool input again at execution time.

## Challenges

- Preserving decimal precision before browser inputs or JSON arguments could coerce values to `Number`.
- Defining deterministic ordering when multiple graph levels run at the same virtual timestamp.
- Preventing a lower node from bypassing its immediate parent during propagation.
- Cloning graph data without reusing node UUIDs or breaking relation arrays.
- Bounding agent-triggered calculation work while returning useful detailed results.
- Applying the current WebMCP trust and state annotations accurately.

## Accomplishments

- Immediate-only Value and Percentage propagation with static-field protection.
- Bounded, non-persisting project calculation with node meanings and schedule counts.
- Graph-safe cloning and cross-project scenario comparison tools.
- Automated calculation, graph, storage, and WebMCP-handler coverage.
- Hackathon-oriented documentation, CI, demo steps, and an OSI-approved MIT license.

## What we learned

Agent-friendly interfaces work best when tool boundaries reflect application operations, output trust is explicit, selectors are stable, and calculation values avoid lossy JSON-number conversion. A visual graph also forces ambiguous spreadsheet-like rules—especially timing and propagation direction—to become concrete.

## Automated testing

```bash
npm ci
npm test
npm run build
```

The suites cover precision paths, immediate propagation, static nodes, target-relative Percentage behavior, same-time ordering, safety limits, clone relation remapping, and WebMCP handlers with mocked browser APIs.

## Manual testing instructions

1. Run `npm ci` and `npm run dev`, then open the Vite URL.
2. Create a short positive Duration project.
3. Create a Value root, add a Percentage node below it, and a Value node below that.
4. Verify that the bottom Value changes only the Percentage field and never jumps directly to the root.
5. Run Play and confirm the visible result is persisted.
6. In a browser with `document.modelContext.registerTool`, call `list_projects`, `open_project`, `calculate_project`, and `get_calculation_result`.
7. Clone the project, change a node, and call `compare_scenarios`.

Full walkthrough: [docs/DEMO.md](docs/DEMO.md).

## Demo video outline

1. Problem and one-sentence product pitch.
2. Create a three-second scenario and its first Value node.
3. Add Percentage and Value cards; explain immediate-only propagation.
4. Calculate through WebMCP and inspect the detailed result.
5. Clone the project, change the clone, and compare scenarios.
6. Close with local-first privacy, precise arithmetic, and next steps.

## Links

- Public repository: `TODO — the current repository is private; confirm event policy before publishing`
- Live demo: `TODO — deploy with SPA route fallback, or explicitly document a local-demo fallback`
- Demo video: `TODO — record and add a public/viewable URL if required`

## Media to capture

- Home page with project cards.
- Mixed Value/Percentage graph with no private data.
- Detailed `get_calculation_result` response.
- `compare_scenarios` response with a compatible-node difference.

## Known limitations

- WebMCP is a draft API and requires a compatible browser implementation.
- Project data is browser-local, unencrypted, and has no built-in backup or sync.
- Date-time inputs are interpreted as UTC.
- Duration months and years use documented 30-day and 365-day conversions.
- The visible output display is not yet wired to the detailed calculation-result view.
- Calculation tools reject projects above interactive node, relation, run, update, runtime, and response-size limits.

## Submission readiness notes

- Automated tests and a production build pass locally.
- README, architecture, WebMCP notes, demo plan, CI, and MIT license are present.
- Screenshots, a demo video, a live-demo/public fallback, and a selected Devpost event are still missing.
- No registration, rules acknowledgment, or submission has been performed through the guided workflow yet.

## Official requirement checklist

- [ ] Select the exact Devpost hackathon.
- [ ] Register and review/acknowledge the live rules.
- [ ] Confirm eligibility, deadline, team limits, AI policy, license policy, repository visibility, and required form fields.
- [ ] Confirm judging criteria and tailor this draft to them.
- [ ] Replace every `TODO` with verified information.
- [ ] Capture screenshots containing no private local data.
- [ ] Record and test the demo video link if required.
- [ ] Add and test the live demo or local-demo fallback.
- [ ] Run the final readiness check.
- [ ] Review the exact payload, submit only after explicit confirmation, and verify the entry on Devpost.
