# T056: Tell each simulated machine its definition

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

The simulation manager passes each machine process its own definition, and the machine stops reading preset and environment files. A simulated machine then starts the way a real one would: told who it is, rather than looking itself up in a preset.

## Completion criteria

- The manager gives each machine its ID, name, port, address, group ID, properties, environment and collision setting, as one validated value instead of file paths.
- `src/machine/index.ts` no longer calls `loadGroup()` and imports nothing from `setup.ts`. `MACHINE_CONFIG`, `MACHINE_ENVIRONMENTS` and `MACHINE_ENVIRONMENT` are no longer machine settings.
- Starting one machine by hand (`npm run machine`) still works, or is replaced by a documented equivalent.
- `development.md` and `architecture.md` describe how a machine receives its definition.

Outcome: The machine reads one `MACHINE_DEFINITION` value through its config and validates it with `machineDefinitionSchema` (`src/machine/definition.ts`): group ID, member, port, collision setting and environment. `src/machine/index.ts` no longer calls `loadGroup()` or imports `setup.ts`. On the manager's side, `launch.ts` builds a machine's definition and process environment, used by the manager and by `startMachine.ts`, which replaces the old `npm run machine -- <id>` entry. `MACHINE_CONFIG`, `MACHINE_ENVIRONMENTS` and `MACHINE_ENVIRONMENT` are now simulation-manager settings only. The unused `environmentPath` is gone. `development.md` and `architecture.md` describe the definition.

Verification: `npm run check` passed (58 tests), including the management test that spawns real machines. `npm run machine -- pendulum-02` started one machine with its identity and environment, and an unknown ID lists the valid ones. Nothing committed.
