# T074: A flatter supervisor

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

Remove the layers between the supervisor's data and its controls, and let machines decide which commands they can follow.

Outcome: `describeGroup`, `MachineControls` and `groupSelection` are gone; the dashboard's controls sit in `App.tsx`. The server forwards each command to every connected machine and stops the group if any refuses, instead of checking on their behalf. The supervisor forgets a group once its last member leaves. The client measures the snapshot rate itself, so the server no longer sends one. `http.ts` lost the unused one-group route and the dead `catch`.

Verification: `npm run check` passed (58 tests). Browser: start, collision, restart countdown and stop on an isolated supervisor with two machines. Nothing committed.
