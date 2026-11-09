# T068: Inline single-use page sections

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

Too many files. Display-only sections used in one place become JSX values declared above the page layout, instead of components in their own files. Parts with their own state and handlers stay separate.

Outcome: The machine page's `EnvironmentSettings`, `CollisionSettings` and `MachineConnections`, and the one-entry `labels.ts`, are now `environmentSection`, `collisionSection`, `connectionsSection` and `statusLabels` in its `App.tsx` (12 client files to 9). The simulation manager's `SimulationControls` is a `simulationControls` value in its `App.tsx` (9 to 8). The supervisor's `MachineList` is a `machineList` table in its `App.tsx`, with its three label helpers at the top of the file. Separate files remain for parts with state or handlers: the properties editor, registration form, machine controls, preview, pickers, scene and dock.

Verification: `npm run check` passed (65 tests). `format:check` reports only `meta/Musings.md`. Browser, on an isolated supervisor, client and machine: the machine page showed all six sections and the connections table, the supervisor's machine table listed the machine with the selected row highlighted, and the running manager's header showed its controls. No console errors. Nothing committed.
