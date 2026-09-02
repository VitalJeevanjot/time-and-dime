# WebMCP implementation

Time&Dime uses the imperative WebMCP API: each tool is registered with `document.modelContext.registerTool()` and an abort signal tied to the component that owns it.

## Registration model

- `App.vue` registers cross-project tools once so they survive route changes.
- `StartPage.vue` exposes the Create Project navigation operation.
- `CreateProjectPage.vue` exposes project creation.
- `ProjectPage.vue` always exposes `set_project_toolset` and a small workflow-specific set of current-project tools.
- Page-scoped registrations are aborted on unmount, preventing stale tools from operating on a page that is no longer visible.

The project page defaults to the `build` toolset. An agent can call `set_project_toolset`
to switch without navigating or reloading:

- `build`: `get_project_nodes`, plus `create_initial_node` while empty or the Value and Percentage creation tools after the first node exists.
- `edit`: `get_project_nodes`, `edit_project_node`, and `delete_project_node`.
- `project`: `go_to_home`, `get_project_info`, and `delete_project`.

The six cross-project tools remain available. This keeps a project page at no more than ten
active tools and avoids sending mutually exclusive creation schemas to the browser agent.
When the project changes between empty and non-empty, the build tools refresh automatically.

## Standard annotations

The current draft standardizes two tool annotations:

- `readOnlyHint: true` only when execution does not modify any state. Navigation, cached calculation results, storage writes, and deletions therefore use `false`.
- `untrustedContentHint: true` when output may contain user-authored names, descriptions, or node data.

Mutating tools use `readOnlyHint: false`. Delete definitions also include `destructiveHint` as a compatibility extension, but the current draft standardizes only the two hints above. Safety and agent behavior do not rely on the extension: delete descriptions state permanence and the standardized hints remain present.

## Recommended agent workflows

### Discover and open

1. Call `list_projects`.
2. Call `open_project` with the returned UUID.
3. The default `build` toolset includes `get_project_nodes`. To read full project settings,
   call `set_project_toolset` with `project`, then call `get_project_info`.

### Create

1. Call `open_create_project`.
2. Call `create_project` with the interval-dependent fields.
3. Call `create_initial_node` while the project is empty.
4. The build toolset automatically replaces it with `create_value_node` and
   `create_percentage_node` after the first node is created.

### Edit

1. Call `set_project_toolset` with `edit`.
2. Call `get_project_nodes` when an exact UUID is needed.
3. Call `edit_project_node` or `delete_project_node`.
4. Switch back to `build` to continue adding nodes.

### Calculate

1. Call `calculate_project`; this simulates a cloned snapshot, caches the result in memory, and does not persist node changes.
2. Read the compact final values returned immediately.
3. Call `get_calculation_result` for schedules, counts, initial/final fields, descriptions, and stale-result status.

### Compare scenarios

1. Use `clone_project` to make an independent scenario.
2. Edit the cloned nodes.
3. Call `compare_scenarios` with 2–5 project IDs and optional per-project node selectors. The first project is the baseline, and each difference is `scenario − baseline` for compatible node fields.

## Precision and schemas

Calculation values are accepted as decimal strings, not JSON numbers. This prevents precision loss before Decimal.js receives a large integer or long decimal. Time fields remain bounded integers and use explicit unit enums.

Creation schemas keep `timeLimit` boundaries intentionally compact. They describe the two
accepted boundary shapes while execution code strictly validates the shape required by the
project's interval mode. Tool descriptions stay within 500 characters and parameter
descriptions within 150 characters so browser agents receive a compact configuration.

The calculation tools impose limits before scheduling:

- 500 nodes
- 5,000 upward relations
- 25,000 node runs
- 10,000 possible target updates
- 1,000,000 characters for a project input, calculation result, or workspace-tool response
- 10 seconds of calculation runtime

These limits keep agent tool calls interactive and reject a 1-millisecond-for-a-year scenario before it can monopolize the page.

## Trust boundary

WebMCP tool outputs are model input. Project text can contain arbitrary user-authored content, so read tools and mutations that echo stored data set `untrustedContentHint: true`. Tool descriptions are fixed application source, and every storage/graph selector is validated at execution time rather than trusting schema validation alone.
