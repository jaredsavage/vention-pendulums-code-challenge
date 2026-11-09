# T061: Wrap the pendulum angle

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

A pendulum pushed over the top (for example by strong wind) reported angles past 360°. Keep the measured angle between −180° and 180°.

Outcome: `advanceMotion` in `physics.ts` wraps the angle after each step with `atan2(sin, cos)`, so every reading agrees: the machine page, the supervisor table and the measurements sent to peers. The scene and collision checks use positions, so nothing depended on a continuous angle. The RK4 comment no longer claims it's faster than Euler's method; it's more accurate per step. `message-types.md` gives the angle range.

Verification: `npm run check` passed (61 tests), including a new physics test that a pendulum swinging past the top comes back with a negative angle above −π. Nothing committed.
