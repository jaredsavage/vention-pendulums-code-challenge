# T050: Remove unused group selection

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

Remove the multi-group selection that nothing uses from the supervisor client. `useMachines('')` is always called with an empty group ID, and the `groups` it returns is never read.

## Completion criteria

- `useMachines` takes no group ID and returns only what the client reads.
- `groupSelection.ts` and its test are removed, or reduced to the one rule still needed: pick the first group that has machines.

Outcome: `useMachines()` takes no group ID and no longer returns `groups`. `groupSelection.ts` is reduced to `activeGroup`, which picks the first group that has machines; a comment says why (the supervisor keeps listing the old, empty group after a preset change). Its test and the management test use `activeGroup`.

Verification: typecheck, lint and the supervisor tests pass; full checks are recorded with the final batch. Nothing committed.

Final batch, after T047 to T053: `npm run check` passed (58 tests, 13 files) and `format:check` reports only `meta/Musings.md`. Browser run with `npm run dev` and five pendulums: clicking an anchor and a table row each selected a machine, the machine page loaded validated configuration and environment, neighbour links and the selection ring drew during a run, and the group collided, recovered and restarted. No new console errors after a reload. Nothing committed.
