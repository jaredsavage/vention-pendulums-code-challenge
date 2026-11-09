# T045: Split the simulation manager server

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

Split `startSimulationManager` in `apps/machine-simulator/src/management/server.ts` so that state, child process control and HTTP routes each have their own place, and the top level reads as a sequence of steps.

## Completion criteria

- The "reset to idle" state update and the "set every machine's lifecycle" update each exist once.
- One lock guards changes, instead of both `busy` and `pendingRequests`.
- Forwarding wrappers and one-use generics are gone: `discoverEnvironments`, the one-entry `scripts` object, and the generic arguments on `startChild`.
- `STOP_DISPLAY_MS` is removed, or kept only with a stated reason.
- Fix the possible bug where a failed start resets `supervisorUrl` to the startup value, losing a supervisor address set at runtime. Add a test for it.

Outcome: The management module is now three files. `processes.ts` (`MachineProcesses`) starts, health-checks and stops machine processes; a process that exits while still tracked is reported as lost. `manager.ts` (`SimulationManager`) holds the state and the selection, environment and supervisor changes behind one `exclusively` lock. `server.ts` is just the routes and the listener, and reuses the protocol's `supervisorAddressSchema`. The idle reset is one `IDLE` constant, and lifecycle changes go through `machinesIn`. `STOP_DISPLAY_MS`, the `closing` flag, the expected-exits set and the unused `startSimulationManager` options are gone.

Behaviour changes: a failed start keeps the supervisor address (the bug was real). A machine that exits during startup now fails the start at once instead of waiting out the 15-second health timeout. The error names the machine that failed first instead of whichever one was stopped last. A concurrent supervisor change gets "Another change is in progress." instead of a separate message.

Verification: `npm run check` passed (58 tests), including the new `tests/management.test.ts` case that blocks a machine's port, sets a supervisor address, and checks it survives the failed start. `format:check` reports only `meta/Musings.md`. Browser: on the manager page, choosing five-pendulums, switching to mars (machines report Mars gravity) and choosing No simulation all worked, with no console errors. Nothing committed.
