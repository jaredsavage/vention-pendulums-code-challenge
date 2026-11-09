# T051: Explicit defaults for loadGroup

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

`loadGroup` in `apps/machine-simulator/src/setup.ts` computes its defaults inside its parameter list, which `Agents.md` says not to do. Work out the defaults where the function is called, or at the top of the function, and pass them in explicitly.

Outcome: `loadGroup` takes a named, optional `GroupSource` (`presetPath`, `environmentDirectory`, `environmentReference`) and works out each missing value in plain statements at the top, with a comment saying where the defaults come from. `loadGroup()` with no arguments still loads the configured setup. `defaultEnvironmentReference` no longer computes its directory in its parameter list. The manager's calls name what they pass instead of passing `undefined` positionally, and the config test uses the named form.

Verification: typecheck, lint and the config tests pass; full checks are recorded with the final batch. Nothing committed.

Final batch, after T047 to T053: `npm run check` passed (58 tests, 13 files) and `format:check` reports only `meta/Musings.md`. Browser run with `npm run dev` and five pendulums: clicking an anchor and a table row each selected a machine, the machine page loaded validated configuration and environment, neighbour links and the selection ring drew during a run, and the group collided, recovered and restarted. No new console errors after a reload. Nothing committed.
