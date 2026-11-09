# T047: Rename and simplify peer connections

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

`Neighbors` in `apps/machine-simulator/src/machine/neighbors.ts` connects to every machine in the group, so rename it to match the vocabulary (peers, not neighbours) and simplify how it's constructed.

## Completion criteria

- The class and file are named for peers.
- The eight positional constructor arguments, five of them callbacks, become a smaller, named shape.
- `setMembership` is split into its three jobs: dropping removed clients, dropping removed connections, and connecting to new members.

Outcome: `neighbors.ts` is now `peers.ts` with class `Peers`. The five constructor callbacks are one named `PeerHandlers` object. `setMembership` reads as three steps: `dropMovedClients`, `dropRemovedConnections` and `connectToNewMembers`, with `connectTo` holding one member's socket setup. Internal state is private, and `connectedPeerIds` replaces reaching into `connections` from outside. Compound conditions are named, and the "fail unless closing" check is one `fail()`.

Verification: `npm run check` passed (58 tests, including the distributed tests with real peer sockets). Nothing committed.

Final batch, after T047 to T053: `npm run check` passed (58 tests, 13 files) and `format:check` reports only `meta/Musings.md`. Browser run with `npm run dev` and five pendulums: clicking an anchor and a table row each selected a machine, the machine page loaded validated configuration and environment, neighbour links and the selection ring drew during a run, and the group collided, recovered and restarted. No new console errors after a reload. Nothing committed.
