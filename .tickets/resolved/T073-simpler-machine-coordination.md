# T073: Simpler machine coordination

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

Keep every machine feature, but remove the machinery that repeated itself or guarded against failures Socket.IO already prevents.

Outcome: Peer positions and received update rates live only in `Machine`, and `neighbourUpdateHz` is now the slowest neighbour's received rate. Surface distance moved into `collision.ts` as `surfaceGap`, shared by the collision check and the page. Peer controls are sent once with a timed acknowledgement; the retries, the duplicate-message map and `messageId` are gone. Collision restart is one round: once a machine has readiness from everyone, it counts down. `RESTART_CONFIRMED` is gone from the protocol.

Verification: `npm run check` passed (65 tests), including real processes colliding and restarting. Nothing committed.
