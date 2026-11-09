# T012: Machine device boundary

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** GPT-6.1 Sol

Confine simulation to the simulated pendulum device. Keep machine coordination, telemetry, controller, and browser independent of how a machine produces its measured position.

## Work notes

MachineDevice separates commands and measurements from coordination. SimulatedPendulum alone owns physics and its timer. Removed shared simulation steps, matched-step histories, and browser-generated fallback positions. Collisions use latest measured positions; short contact between reports may be missed. Renamed shared/UI modules, group file, and environment overrides to machine terminology; documented the boundary in Agents.md.

Added the short boundary note at `docs/arch-notes/simulation-boundary.md`.

Type checking, linting, 27 tests, and build pass, including measurement-only device and simulator lifecycle coverage. Browser-verified controls, selection, and rendering; restarted the stack. Changed files pass formatting; existing issues in `src/controller/index.ts` and `src/shared/config.ts` remain untouched. No commits.
