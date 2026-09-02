# Time&Dime

Time&Dime is a local-first, agent-operable scenario calculator. You build a timed graph of Value and Percentage cards, run it through deterministic virtual time, and compare how different scenarios change.

The application exposes its core application operations as imperative [WebMCP](https://webmachinelearning.github.io/webmcp/) tools, so a compatible browser agent can create projects, build graphs, calculate results, clone scenarios, and compare them with the same local data the user sees.

## Why it exists

Many forecasts start as a sentence: “add 10 every five seconds, then apply 6% to the next value.” Spreadsheets can represent the arithmetic, but not always the timing and graph relationship clearly. Time&Dime makes each rule visible as a card and gives both the user and an AI agent a structured way to operate it.

## Highlights

- Value and Percentage nodes with `+`, `-`, `*`, `/`, and `%` operations.
- Immediate-neighbor propagation: a card updates only the connected level directly above it.
- Value-to-Percentage updates modify `percentage.value`; Value targets modify `value`.
- Static cards ignore incoming operations but still operate upward on their own schedule.
- Optional Percentage Reference Value for fixed-base percentage calculations.
- Duration or date-time project intervals and per-node time limits.
- Decimal-string arithmetic through Decimal.js and BigInt millisecond virtual schedules under documented unit conversions.
- Local project storage with UUIDs, graph-aware clone support, and no backend.
- WebMCP tools for project/node workflows, calculation results, and scenario comparison.

## Calculation model

For a chain `A → B → C`, where A is below B and B is below C:

1. When A runs, it can update B if B is not static.
2. A never updates C directly.
3. When B later runs, it uses its then-current calculation field to update C.
4. If A and B are due at the same virtual time, Time&Dime runs bottom-to-top: A updates B first, then B operates on C.

A Value source supplies its current `value`. A Percentage source calculates an operand from either:

- each immediate target’s current `value` or `percentage.value` when Reference Value is `0`; or
- its own non-zero Reference Value, producing one shared percentage operand.

Repeating division is rounded with Decimal.js half-even rounding. Inputs are bounded to protect the browser from impractically large calculations.

## WebMCP tools

Global tools are available throughout the app. Route-scoped tools validate their page and project prerequisites again when executed.

| Tool | Scope | Behavior |
| --- | --- | --- |
| `list_projects` | Global | Lists stored project summaries newest-first. |
| `open_project` | Global | Opens a project by UUID or unique exact name. |
| `calculate_project` | Global | Calculates an in-memory snapshot without changing stored data. |
| `get_calculation_result` | Global | Returns the latest detailed result and staleness state. |
| `clone_project` | Global | Clones a project with new project/node UUIDs and remapped relations. |
| `compare_scenarios` | Global | Calculates 2–5 projects and compares selected final node values. |
| `open_create_project` | Home | Opens the Create Project page. |
| `create_project` | Create page | Creates and opens a Duration or Date & time project. |
| `create_initial_node` | Project route | Creates the first Value or Percentage card after verifying that the project is empty. |
| `create_value_node` | Project | Places a Value card above, right, or below a target. |
| `create_percentage_node` | Project | Places a Percentage card above, right, or below a target. |
| `get_project_info` | Project | Reads current project settings and nodes. |
| `get_project_nodes` | Project | Reads structured node data and relations. |
| `edit_project_node` | Project | Edits one user-controlled node field. |
| `delete_project_node` | Project | Deletes one node and reconnects its graph level. |
| `delete_project` | Project | Deletes the current project. |

Tool annotations follow the current WebMCP draft: `readOnlyHint` declares state behavior, and `untrustedContentHint` marks outputs containing user-authored names or descriptions. See [docs/WEBMCP.md](docs/WEBMCP.md).

## Run locally

Requirements: Node.js `^22.18.0` or `>=24.12.0` and npm.

```bash
npm ci
npm run dev
```

Open the Vite URL shown in the terminal. WebMCP features require a browser build that exposes `document.modelContext.registerTool`; the visual application still works when that API is unavailable.

## Verify

```bash
npm test
npm run build
```

The tests cover precise arithmetic paths, immediate-only graph propagation, static behavior, same-time ordering, non-persisting project calculation, workload rejection, clone relation remapping, and WebMCP handlers with mocked browser APIs.

## Architecture

- Vue 3 + Vue Router for the interface.
- Browser `localStorage` for project records.
- Decimal.js for high-precision calculation fields stored as canonical strings.
- BigInt for millisecond schedules.
- An event-driven virtual-time scheduler for responsive calculation.
- Imperative WebMCP tools registered from the same pages that own each operation.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the graph and scheduling details.

## Data and privacy

Time&Dime has no application backend, user accounts, or cloud sync. Project records are stored unencrypted in the current browser profile’s `localStorage`. Same-origin JavaScript can access that data, and an invoked WebMCP read tool intentionally returns selected project content to the connected agent. Do not store secrets in project names or descriptions.

## Known limitations

- WebMCP is a draft API and is not available in every browser.
- Date-time values are currently interpreted as UTC.
- Scheduling is virtual-time simulation, not real-world waiting.
- Calculation tools reject schedules above their interactive safety limits.
- Project data is browser-local and has no built-in backup or cross-device sync.
- The current visible output display is not yet wired to the detailed calculation result.

## AI-assisted development

Codex was used as a pair-programming agent for implementation, review, tests, and documentation. Product behavior and graph semantics were directed by the project author. The runtime calculator itself is deterministic; it does not use a generative model. See [docs/hackathon-build/build-notes.md](docs/hackathon-build/build-notes.md).

## Hackathon materials

- [Devpost submission draft](devpost-submission.md)
- [Demo and screenshot plan](docs/DEMO.md)
- [WebMCP implementation notes](docs/WEBMCP.md)

## License

[MIT](LICENSE) © 2026 Jeevanjot Singh Vital.
