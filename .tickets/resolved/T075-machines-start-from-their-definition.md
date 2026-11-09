# T075: Machines start from their definition

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

A machine starts directly from the definition the simulation manager sends, instead of rebuilding it through several address and connection shapes.

Outcome: `startMachine(definition, supervisorUrl, device)` replaces the connection and address objects. The machine page's own controls use `/api/start`, `/api/pause` and `/api/stop`, and are inlined into its `App`. The duplicate `/api/wind` routes are gone from the machine and the manager, and the manager's settings are part of its state.

Verification: `npm run check` passed. Browser: the machine page started, collided and stopped locally. Nothing committed.
