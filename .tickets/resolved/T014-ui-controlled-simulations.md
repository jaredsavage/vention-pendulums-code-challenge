# T014: UI-controlled simulations

- **Ticket Author:** DeepSeek V4.1 Flash 1017
- **Resolver:** DeepSeek V4.1 Flash 1017

Let the UI select and control a simulation from a dropdown. A supervisor owns the controller and machine processes, stops the current stack when the selection changes, and reports startup/shutdown states while the new simulation loads.

## Work notes

Added a supervisor service that lists `config/groups/*.json`, starts the selected controller and machine processes, and stops the current stack before switching. `npm run dev` now starts only the supervisor and Vite; no controller or machines run until a simulation is selected. `npm run supervisor` starts the supervisor alone.

Added a top-right simulation dropdown with a “No simulation” option. Selecting a simulation starts its stack and applies its environment; selecting another stops the current controller and instances first. Machine cards show “Starting up…” and “Shutting down…” from supervisor lifecycle state, then switch to controller state when ready. A failed child marks the simulation failed and stops the remaining processes.

Verified the supervisor starts idle with no controller, starts `five-pendulums` to five online machines, the UI Start control runs the simulation, “No simulation” returns to idle and stops the controller, and switching simulations replaces the controller process. Type checking, linting, 27 tests, and build pass. Changed files pass formatting; newly added `Musings.md` and `Timeline.md` remain unformatted. No commits.
