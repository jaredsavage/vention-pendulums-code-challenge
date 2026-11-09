# T069: Remove useSlowValue

- **Ticket Author:** DeepSeek V4.1 Flash 1017
- **Resolver:** Claude Opus 5.5

Remove `useSlowValue` and the separate figure refresh rate. The supervisor machine table should render snapshots as they arrive instead of displaying them at a slower rate.

## Completion criteria

- Delete `useSlowValue.ts` and read the current snapshot directly in the supervisor client.
- Remove `CLIENT_FIGURES_HZ`; the scene keeps its measured render and snapshot-rate readouts without a separate figure interval.
- Update the timing-rate guidance in `development.md`.

Outcome: Deleted `useSlowValue.ts`; the supervisor's machine table reads the current snapshot directly and updates as each one arrives. `CLIENT_FIGURES_HZ` is gone from `config/updates.ts`. The scene's render and snapshot-rate readouts now change once per one-second measuring window, so they stay legible without a separate interval. `development.md` no longer described the figure rate after the documentation restructure, so only the supervisor README needed updating.

Verification: Types and lint passed. All 60 tests passed running one file at a time; in the parallel run, the startup-ports test timed out under load, as before this change. `format:check` is clean. Browser, on an isolated supervisor and one running machine: six table readings 50 ms apart all showed a new angle. Nothing committed.
