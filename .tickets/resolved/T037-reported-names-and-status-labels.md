# T037: Use reported names, and one set of status labels per app

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** DeepSeek V4.1 Flash 1017

Show the name each machine reports, and keep status labels in one place per app. Setup names machines `Pendulum 01`, but the supervisor table and the manager page ignore that and rebuild `1. Pendulum` from list order and kind.

## Completion criteria

- The supervisor client and the manager page show `member.name`. The canvas anchor number can stay, but it should come from the same source.
- Status labels exist once in the supervisor client and once in the simulator. The simulator currently has two copies, in `MachineSettings.tsx` and the manager page. The two apps can't share code, so one copy each is fine.

## Work notes

- The supervisor table uses the reported member name.
- The manager page uses the managed machine name and its address from manager state.
- Added `src/client/labels.ts` for machine status and lifecycle labels; the machine page and manager page import it.
- The supervisor client keeps its existing single label map.
- The canvas keeps its member-order anchor number.

## Verification

`npm run check` passes with 52 tests and both client builds.
