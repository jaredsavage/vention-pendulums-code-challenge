# T038: Types come from schemas

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** DeepSeek V4.1 Flash 1017

Every protocol type should be inferred from its Zod schema, and apps should import those types instead of redefining them.

## Completion criteria

- `protocol`: `GroupState`, `ObservedMachine`, and `Result` are inferred, not hand-written beside their schemas.
- Supervisor: `commands.ts` no longer defines its own `ObservedMachine` with the same name as the protocol type.
- Machine page: `useMachineState.ts` (`MachineState`), `MachineSettings.tsx` (`SaveResult`), and `CollisionSettings.tsx` (`Settings`) use shared types, and validate what they receive.

## Work notes

- Added `observedMachineSchema`; inferred `ObservedMachine` and `GroupState`.
- Inferred `Result` from `resultSchema`.
- Added machine settings, supervisor address, and supervisor status schemas.
- Supervisor commands import the protocol `ObservedMachine`.
- Machine page state, save results, commands, collision settings, and supervisor status are parsed with schemas.
- `useMachineState` uses the protocol `MachineState` type.

## Verification

`npm run check` passes with 52 tests and both client builds.
