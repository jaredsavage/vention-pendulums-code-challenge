# T077: Server-sent events to browsers

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

Live data from servers to browsers uses server-sent events. Socket.IO stays between services.

Outcome: The supervisor streams snapshots from `GET /api/state/stream`, replacing its `/ui` namespace, and the client uses `EventSource`. The supervisor and the machine share an identical `EventStream` class, which skips snapshots for a browser that falls behind. The terminal status script polls `GET /api/state`, since Node has no built-in `EventSource`.

Verification: `npm run check` passed (59 tests), with a new stream test. Browser: 61 snapshots a second from the stream. Nothing committed.
