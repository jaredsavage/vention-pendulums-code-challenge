# T033: Use HTTP for manager-to-machine requests

- **Ticket Author:** DeepSeek V4.1 Flash 1017
- **Resolver:** DeepSeek V4.1 Flash 1017

Replace child-process IPC messages between the simulation manager and its machines with the same request/response HTTP approach used by the other services. Keep Socket.IO for live state and peer coordination, and keep process spawning as process management.

## Work notes

- Machine: added `POST /api/environment` and `POST /api/shutdown`; removed the child-process message handler and `src/ipc.ts`.
- Manager: posts environment changes and shutdown requests to each machine over HTTP; child processes no longer request an IPC channel.
- Documentation: described HTTP for service requests and Socket.IO for live traffic.

## Verification

`npm run check` passes with 47 tests. Added a distributed test that applies environment settings over the machine HTTP API. The management test continues to verify that simulated processes start and stop through the manager.
