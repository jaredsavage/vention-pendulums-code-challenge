# T030: Apply parameter changes while running

- **Ticket Author:** DeepSeek V4.1 Flash 1017
- **Resolver:** DeepSeek V4.1 Flash 1017

Allow machine properties to be saved while the device is running without resetting its motion or run.

## Work notes

- `Machine.configure` no longer requires a stopped instance. A stopped edit still resets the device and run as before.
- A running or paused edit uses the new `MachineDevice.updateProperties`, which replaces the object and recomputes the measurement without resetting motion, the accumulator, the run ID, or the sequence counter.
- The machine bumps its sequence and broadcasts the updated position, then announces `propertiesChanged` so peers and the supervisor refresh geometry, neighbour sets, and collision thresholds.
- `initialAngle` is stored but does not reset current motion; it applies on the next fresh start.
- Updated lifecycle and distributed tests for running edits.

## Verification

Ran a separate five-machine stack with all machines running under one run, then changed `pendulum-01` to length 2.5 and radius 0.2 through `POST /api/configuration`:

- Response was `{ ok: true }`.
- The machine stayed `running` with the same run ID and a continuing sequence.
- The supervisor reported the new `length=2.5` and `radius=0.2`.
- All five machines were still running 2.5 seconds later.

`npm run check` passes with 45 tests. Nothing committed.
