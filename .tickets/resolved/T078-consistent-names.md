# T078: Consistent names

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

Names in code, the protocol and the docs follow the vocabulary in AGENTS.md.

Outcome: `neighbors` became `neighbours`, `object` and `configuration` became machine properties, `instanceId` became `machineId`, and the manager's simulations became presets, including `/api/preset`, `data/presets/` and `MACHINE_PRESET`. Local renames: `machineProcessEnv`, `MachineService`, `startMachine`, `readPreset`, and file names that match their exports.

Verification: `npm run check` passed (60 tests) running one file at a time; in parallel, the startup-ports test timed out under load. Nothing committed.
