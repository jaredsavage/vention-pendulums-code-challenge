# T040: Readable pendulum device

- **Ticket Author:** Jared
- **Resolver:** Claude Opus 5.5

Rework the simulated pendulum so it reads as a short composition of named physics steps, with the least code needed and no change in behaviour.

## Work notes

- `physics.ts`: RK4 now reads as start, two midpoint, and end rates averaged into one step. Acceleration is named by source (gravity, wind, damping). `coordinates` is now `bobCoordinates`.
- `simulatedPendulum.ts`: the physics step is its own 60 Hz constant instead of `NEIGHBOUR_POSITION_UPDATE_HZ`, so changing the network rate no longer changes the physics. The timer only runs while the pendulum is moving, which removes the `running` flag. Properties are stored directly instead of behind a getter.
- `physics.test.ts`: updated for the rename, and braces added to the loop.

## Verification

Typecheck, lint, Prettier, the simulator build, and all 47 tests passed against the code as it was before the concurrent supervisor-address changes. Nothing committed.
