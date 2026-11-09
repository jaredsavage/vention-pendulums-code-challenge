# T046: Split the machine server

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

Split `startInstance` in `apps/machine-simulator/src/machine/server.ts` into wiring the machine, peers and supervisor; the machine page's event stream; and the HTTP routes.

## Completion criteria

- No object is referenced before it's declared. Today `machine` calls into `neighbors` and `publish` calls into `supervisor` before either exists.
- One timer loop publishes state, instead of three timers each calling `publish()`.

Outcome: `server.ts` now listens, builds a `MachineInstance`, registers routes and starts one sync timer. `instance.ts` (`MachineInstance`) wires the machine, peers, supervisor and page together, and owns `sync()`, `publish()`, `configure()` and `openPage()`. Collaborators reach each other through `this` at call time instead of through local variables declared later. `routes.ts` holds the HTTP routes, and `pageStream.ts` the server-sent events for the machine page.

The machine now listens before it creates its supervisor and peer connections, so nothing can reach it half-wired. The three timers (20 Hz update, 60 Hz neighbour sync, 75 Hz page stream) are one loop at `MACHINE_SYNC_HZ` (60), matching what `architecture.md` already described. `PUBLISH_INTERVAL_MS` and `MACHINE_PAGE_UPDATE_HZ` are removed from config, and `development.md` is updated.

Verification: `npm run check` passed (58 tests, including the distributed and supervisor-switch tests that start real instances). `format:check` reports only `meta/Musings.md`. Browser: five machines connected to each other, the group started, collided and restarted, neighbour update rates read about 45 Hz, and Pendulum 01's page streamed changing positions. No console errors. Group stopped afterwards. Nothing committed.
