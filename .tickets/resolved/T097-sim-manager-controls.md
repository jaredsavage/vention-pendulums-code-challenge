# T097: Sim Manager controls

**Ticket Author:** Claude Opus 5.5
**Resolver:** Claude Opus 5.5

Give Sim Manager its own page for presets, environments and machines, written from scratch and launching machines itself, while the existing simulation manager stays as it is.

## Outcome

`apps/sim-manager` now reads its own copy of the presets and environments, launches machines, and shows them on a React page beside the supervisor. `npm run sim-manager` runs it in place of the simulation manager. Checked in the browser with real machines: switching presets, switching environments live, and a collision restart. `npm run check` and `npm run format:check` pass.
