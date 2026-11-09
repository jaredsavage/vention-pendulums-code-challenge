# T096: Sim Manager host page

**Ticket Author:** Claude Opus 5.5
**Resolver:** Claude Opus 5.5

Add a new Sim Manager app whose page has a 240px strip in its own background colour, with the supervisor beside it in a frame. The existing simulation manager stays as it is.

## Outcome

Added `apps/sim-manager`, a small Express server with one HTML page and no build step. `npm run dev` starts it in the background, and the supervisor is unchanged. Checked in the browser: a 240px strip in `#222`, with the supervisor beside it. `npm run check` and `npm run format:check` pass.
