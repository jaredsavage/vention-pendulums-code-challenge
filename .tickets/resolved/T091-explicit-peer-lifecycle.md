# T091: Give peer observations an explicit lifetime

- **Ticket Author:** GPT-6 (Codex)
- **Resolver:** Claude Opus 5.5

Make connection, introduction, replacement, and removal explicit transitions between peer transport and machine coordination. Retain separate ownership of sockets and reported measurements, with one clear place that invalidates observations when their source changes.

## Evidence and scope

In `peers.ts`, `attach()` reports a connection before properties arrive, and `dropMovedClients()` only reconciles outgoing clients. In `machine.ts`, membership changes retain the peer map, while `peersChanged()` only replaces IDs; a removed or restarted peer can leave old properties and positions behind. These are static-review findings, not reproduced failures.

## Completion criteria

- Reconcile both incoming and outgoing connections against membership changes, preserving the documented ability to receive an introduction before membership arrives.
- Explicitly invalidate a departed/replaced connection's measurements, properties, freshness, and recovery readiness as appropriate. Delayed disconnects or acknowledgements from an old socket must not affect its replacement.
- Distinguish connected from introduced: starting requires the necessary peers and their reported properties; unknown geometry never means a peer is safely out of reach.
- Keep sockets/session validation in transport and neighbour/collision decisions in coordination. Name the transport `PeerConnections` if that makes its ownership clearer; avoid a generic event bus or a second measurement cache.
- Add focused tests for removal, same-ID replacement, changed address, delayed old-socket callbacks, and connection before properties. Preserve collision recovery and supervisor reconnection tests.
- Update discovery semantics in `docs/message-types.md`, run both required checks, and perform the readability review.

Implement after T090.

## Outcome

`Peers` is now `PeerConnections`. Everything heard from a peer ends with its connection, including when a restarted peer replaces it, and a replaced socket's late disconnect or failed acknowledgement no longer counts. A machine won't start until every peer is connected and has reported its properties, so unknown geometry can't pass as out of reach.

Incoming connections from peers that have left are ignored, not closed: closing one would stop Socket.IO reconnecting it, and a restarting supervisor briefly reports small groups. The machine that dialled closes them. Recovery readiness needs no clearing of its own, because losing a peer pauses the machine, which ends the recovery.

Verified with tests on real sockets in `peerConnections.test.ts`, lifecycle tests, and hard kills of real processes with 5 and 50 machines.
