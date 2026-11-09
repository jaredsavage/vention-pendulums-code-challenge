# T076: Environments apply live

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

Selecting a saved environment applies its values to the running machines, without restarting them.

Outcome: The simulation manager sends the preset's values as a live patch and remembers the choice for later launches. Saved environments and their values are part of its state, so `GET /api/environments` is gone. The environment picker reads its values from one place and lost its preset fetch, pending counter and special case.

Verification: `npm run check` passed, with a test that selecting Mars keeps every machine's session. Browser: Mars applied live with all five machines online. Nothing committed.
