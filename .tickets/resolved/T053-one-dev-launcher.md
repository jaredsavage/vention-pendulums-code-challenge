# T053: One dev launcher

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

`scripts/dev.ts` and `apps/supervisor/scripts/dev.ts` repeat the same spawn-and-shutdown logic. If the supervisor's own `dev` script isn't needed on its own, remove it; otherwise share the launching code.

Outcome: Running the supervisor without the simulator is documented and needed for machines started elsewhere, so the mode stays but the second launcher is gone. `scripts/dev.ts` takes `--without-simulator`, and `npm run dev:supervisor` uses it. `apps/supervisor/scripts/dev.ts` and the supervisor workspace's `dev` script are removed, and `development.md` uses `npm run dev:supervisor` and `npm run simulator` for independent operation. Inside the launcher, a named `stop()` decides between the simulation manager's graceful shutdown and a plain kill.

Verification: `npm run dev:supervisor` started the supervisor and client without the simulation manager and freed every port on shutdown. `npm run dev` started all three; see the final batch. Nothing committed.

Final batch, after T047 to T053: `npm run check` passed (58 tests, 13 files) and `format:check` reports only `meta/Musings.md`. Browser run with `npm run dev` and five pendulums: clicking an anchor and a table row each selected a machine, the machine page loaded validated configuration and environment, neighbour links and the selection ring drew during a run, and the group collided, recovered and restarted. No new console errors after a reload. Nothing committed.
