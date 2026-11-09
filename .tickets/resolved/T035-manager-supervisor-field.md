# T035: Supervisor field on the simulation manager

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** DeepSeek V4.1 Flash 1017

Add a Supervisor field to the simulation manager page, filled in with the configured default. Machines it starts use that address, and changing it moves any running machines to the new supervisor.

Depends on [T036](T036-small-configuration.md) and [T067](T067-machine-registration.md).

## Completion criteria

- Running machines are moved through the machine's own route from T067, the same way environment settings are applied. No restart.
- The embedded supervisor client keeps using `SUPERVISOR_CLIENT_URL`. Pointing machines at a different supervisor doesn't change that window; note it as a known limit.

## Work notes

- Manager state carries `supervisorUrl` and `supervisorClientUrl`.
- Added `POST /api/supervisor`; it applies the address to running machines without restarting them and uses it for future instances.
- Added the Supervisor field to the simulation manager page.
- The embedded client stays on the configured `SUPERVISOR_CLIENT_URL`; architecture notes this limit.
- Updated docs and the manager test.

## Verification

The process-management test moves five running machines to a second supervisor and back, checking both supervisor groups. `npm run check` passes with 52 tests.
