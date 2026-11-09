# T048: Simplify the Machine class

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

Make `Machine` in `apps/machine-simulator/src/machine/machine.ts` easier to follow: fewer positional arguments, named conditions, one start path, and less public mutable state.

## Completion criteria

- The six positional constructor arguments become a named shape.
- The "all peers connected" check (`peers.length !== members.length - 1`), written out three times, has one name.
- `start` and `startLocally` share their common steps instead of resetting slightly different state.
- Fields that only the class changes are private.
- `positionChanged()` has a name that says it advances the sequence.
- "neighbor" and "neighbour" are consistent within the file. Leave the protocol's `neighbors` field to its own ticket.

Outcome: `Machine` takes one named `MachineOptions` object. `allPeersConnected` names the peer-count check. Both start paths share `run()`; `startNewRun()` and `clearRunHistory()` replace `reset()` and `beginRun()`, and collision restarts use the same two steps. `positionChanged()` is now `advanceSequence()`. `runId`, `sequence`, `peers`, `stopOnCollision`, `lastSeen` and the recovery and collision helpers are private. Fields the tests read (`status`, `recovery`, `peerPositions` and others) stay public. Inside the file it's "neighbour" throughout, including the `neighbours` getter and the stale-neighbour message; the protocol's `neighbors` field is unchanged.

Small behaviour changes: resuming now clears the run history like a new start does, and a collision restart broadcasts its first position straight away.

Verification: `npm run check` passed (58 tests). Nothing committed.

Final batch, after T047 to T053: `npm run check` passed (58 tests, 13 files) and `format:check` reports only `meta/Musings.md`. Browser run with `npm run dev` and five pendulums: clicking an anchor and a table row each selected a machine, the machine page loaded validated configuration and environment, neighbour links and the selection ring drew during a run, and the group collided, recovered and restarted. No new console errors after a reload. Nothing committed.
