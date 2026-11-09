# T095: Document the actual data paths and verification limits

- **Ticket Author:** GPT-6 (Codex)
- **Resolver:** Claude Opus 5.5

Make the architecture guide a short reading map from user action to command, owner, report, and display. Reconcile the testing guide with tests that actually exist, after T090 through T094 settle the implementation.

## Evidence and scope

The architecture guide explains services well but offers few code entry points for tracing a change. `docs/testing.md` claims a measurement-only stub, real child-process lifecycle coverage, and terminal-refresh coverage; current lifecycle tests patch a concrete pendulum, and `distributed.test.ts` starts services in one process rather than spawning machine programs.

## Completion criteria

- In `docs/architecture.md`, link the actual functions for startup/registration, group commands, peer collision/restart, property edits, and environment edits. Clearly distinguish command acknowledgement from later state reports.
- Include a compact ownership table for launch defaults, device measurements/settings, peer observations, supervisor snapshots, form drafts, and process lifecycle. Link protocol semantics instead of repeating them.
- Keep source-directory maps in app READMEs; keep trade-offs in `docs/decisions.md`. Remove contradictory claims in touched docs rather than adding another explanatory document.
- Audit every testing claim against named tests. Distinguish network integration in one process from child-process testing; describe untested behaviour honestly instead of adding tests merely to justify old prose.
- Run both required checks and review the documentation for repeated facts and stale names. Do not edit historical resolved tickets or `.meta/`.

Implement last. The sequence T090 to T095 is intentional; work one ticket at a time.

## Outcome

`docs/architecture.md` now traces startup, group commands, collisions, property edits and environment edits through the real functions, separates acknowledgements from later reports, and has an ownership table. `docs/testing.md` lists each area beside its test file. Claims with no test behind them moved to what isn't covered: duplicate address rejection, moving to the next free port, a machine failing during startup, and the terminal's refresh. It now says that `distributed.test.ts` runs in one process, and that `manager.test.ts` starts real child processes. T090 and T094 didn't happen, so nothing here describes them. Links and named functions were checked against the code.
