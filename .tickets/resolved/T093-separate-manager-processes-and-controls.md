# T093: Separate process management from terminal machine controls

- **Ticket Author:** GPT-6 (Codex)
- **Resolver:** Claude Opus 5.5

Keep `SimulationManager` focused on preset selection and process lifecycle, with terminal live commands and reads in a small, explicit HTTP client. Resolve machine identity to current state when a menu renders or an action runs, rather than capturing an old machine snapshot.

## Evidence and scope

`manager.ts` combines process startup/relaunch, preset persistence, environment requests, local motion controls, and HTTP error handling. `menus.ts` captures a `ManagedMachine` in `machineRow()` while `updateMachine()` replaces those objects, so an open details menu can keep using an old lifecycle or address.

## Completion criteria

- Keep launch, relaunch, shutdown, failure cleanup, and preset replacement together. Keep the existing `MachineProcesses` owner of child handles.
- Extract cohesive machine HTTP operations, not one wrapper per call. Preserve the terminal's local machine controls and environment editing without routing them through group coordination.
- Give process launch and local motion Start distinct internal names. The existing terminal Start action may still relaunch an offline machine.
- Menu closures retain an ID and resolve the latest machine on every render/action; handle removal explicitly. Reuse the current assigned address.
- Verify an open details menu across shutdown/relaunch and a changed address, plus startup failure and preset replacement cleanup. Avoid introducing parallel authoritative lifecycle stores.
- Update the simulation-manager README, run both required checks, and perform the readability review.

Implement after T092, then continue with T094 in the same checkout.

## Outcome

`machineClient.ts` holds the live requests to running machines, and `SimulationManager` keeps presets and process lifecycle. `relaunchMachine` is the process launch, and `commandMachine(address, 'start')` only sets a running machine moving. The terminal's Start picks between them, so it still brings back an offline machine. Menus hold an ID and look the machine up on every render and action, and say so if it's gone. A relaunched machine asks for the address it had, instead of re-picking from the preset.

Verified with `menus.test.ts` for an open details menu across a changed address, going offline and removal, and `manager.test.ts` with real child processes for shutdown, relaunch at the same address and preset replacement. Startup failure has no test of its own; that code didn't change. The menus were tested with a stand-in screen, not by pressing keys in a terminal.
