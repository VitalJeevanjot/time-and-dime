# Architecture

## Data flow

```text
Vue pages and cards
        │
        ├── projectStorage.js ── browser localStorage
        │
        ├── WebMCP registrations ── browser agent
        │
        └── projectCalculation.js
               ├── BigInt timing extraction
               ├── virtual-time scheduler
               ├── immediate graph propagation
               └── Decimal.js arithmetic
```

Projects are stored under one localStorage entry per project UUID, with a separate ordered UUID index. Nodes contain their own UUIDs and relation arrays.

## Graph direction

`relations.aboveCardIds` lists the cards immediately above a node. A run never performs a transitive traversal. Each source applies its own operation to every unique, non-static ID in that one array.

- Value target: update `value`.
- Percentage target: update `percentage.value`.
- Static target: ignore the incoming update.
- Static source: still operates upward when its schedule runs.

Horizontal cards share the same immediate above/below relation arrays. When multiple cards run at one virtual timestamp, ordering is bottom-to-top and then project-array order within a horizontal level.

## Percentage behavior

When `referenceValue` is zero, the operand is calculated independently for each immediate target:

```text
target calculation field × percentage ÷ 100
```

When Reference Value is non-zero, that value replaces the target field as the percentage base. The source operation then applies the resulting operand to each target.

## Precision

Node calculation fields are canonical decimal strings. Decimal.js performs arithmetic with dynamically sized precision and half-even rounding for repeating division. Modulus follows remainder-style rounding toward zero. Division and modulus by zero fail the source operation without partially changing that source’s targets.

Time conversion uses BigInt milliseconds. Months equal 30 days and years equal 365 days in duration mode. Date-time mode parses timestamps as UTC and measures offsets from the project start.

## Two calculation paths

The visible Play button runs the project against live page state and persists calculated node changes.

`calculate_project`, `get_calculation_result`, and `compare_scenarios` use `projectCalculation.js`. That engine clones the project twice, validates the graph and exact workload, simulates only the working clone, and returns JSON-safe string counters. It never calls `updateProject`.

## Clone safety

Cloning creates a new project UUID and a new UUID for every node. Only after every source relation has been validated does the storage layer remap `aboveCardIds` and `belowCardIds` and perform one save.
