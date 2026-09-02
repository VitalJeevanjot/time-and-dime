# AI-assisted build notes

## Roles

Jeevanjot Singh Vital directed the product, visual design, node semantics, scheduling rules, and WebMCP workflows.

Codex acted as a pair-programming agent. It inspected the repository, proposed implementations, edited code, reviewed edge cases, wrote automated tests, ran builds, and prepared documentation. Specialized review agents examined graph propagation, precision arithmetic, scheduling, WebMCP workflow design, and hackathon readiness.

## Important human-directed decisions

- Calculations propagate only to the immediate level above.
- A Value card can change a non-static Percentage card’s `percentage.value`.
- Static prevents incoming changes but does not disable outgoing scheduled operations.
- Percentage calculations use each target field unless a non-zero Reference Value is supplied.
- WebMCP calculation tools must not persist node changes; `calculate_project` may cache its result in memory, while the visible Play action persists results.

## Verification evidence

```bash
npm test
npm run build
```

Automated coverage includes immediate propagation, same-time ordering, static nodes, Percentage bases, decimal precision paths, workload limits, graph cloning, and WebMCP handlers with mocked browser APIs.

## Runtime AI disclosure

Time&Dime does not embed or call a generative model. Its calculations are deterministic. AI participation happens when an external compatible agent discovers and invokes the page’s WebMCP tools.
