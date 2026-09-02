# Demo plan

## 60–90 second walkthrough

1. Open Time&Dime and create a three-second Duration project named “Growth Scenario.”
2. Add an initial Value node named “Total” with Value `100`.
3. Add a Percentage node directly below it: `+ 6%`, Reference Value `0`, every second.
4. Add a Value node below the Percentage card: `+ 4`, every second.
5. Explain immediate propagation: the bottom Value changes the Percentage field; it does not jump directly to Total.
6. Ask a compatible browser agent to call `calculate_project`; explain that this calculation is in memory and does not persist node changes.
7. Call `get_calculation_result` and summarize each node’s meaning, schedule, and final value.
8. Call `clone_project`, edit the clone, and use `compare_scenarios` to show the exact final-value difference.
9. Separately demonstrate the visible Play button, which runs from the project’s currently stored values and persists its result. Do not calculate that already-mutated project again unless another run is intentional.

## Suggested agent prompt

> List my projects, open Growth Scenario, calculate it, and explain the final value of each node. Then clone it as Growth Scenario – Conservative, change the Growth node to 3%, and compare the Total node across both projects.

## Screenshot checklist

- Home page with project cards.
- Project graph showing Value and Percentage cards.
- Detailed `get_calculation_result` WebMCP response.
- `compare_scenarios` response with the final-value difference.

Capture screenshots only after checking that no private project names or descriptions are visible.
