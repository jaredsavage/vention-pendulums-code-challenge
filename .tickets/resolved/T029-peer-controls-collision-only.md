# T029: Peer controls are collision-only

- **Ticket Author:** DeepSeek V4.1 Flash 1017
- **Resolver:** DeepSeek V4.1 Flash 1017

Stop propagating manual Pause and Stop to peers. Peer messages carry collision recovery only, and a paused or stopped machine keeps reporting its static position so neighbours do not pause on staleness.

## Work notes

- `Machine.pause` and `Machine.stop` no longer broadcast. Manual Pause and Stop now affect only the machine that receives the command; the supervisor still sends group commands to every member.
- Removed the peer `PAUSE` message and the `reason` field from peer `STOP`. A peer STOP is now always a collision report that starts recovery.
- `syncNeighbours` reports the current position on every tick and only checks collisions while running. Paused and stopped machines therefore keep their neighbours' `lastSeen` fresh, so a local control does not become group-wide through the staleness timeout.
- Added lifecycle tests for local control staying off the network and for paused position reports.

## Verification

Ran a separate stack on 4400/4401 with machines on 4402-4406, configured the anchors apart, and started the group:

- Pausing `pendulum-01` left the other four running after 2.5 seconds.
- Stopping `pendulum-02` left the other three running after 2 seconds.
- Collision recovery still stops the whole group; the distributed test suite passes.

The verification stack was stopped afterwards and the existing stack on 4000/4001/5173 was left untouched. `npm run check` passes with 42 tests. Nothing committed.
