# T064: Available startup ports

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** GPT-6.1 Sol

Try incrementing ports when development service or simulated machine ports are occupied, and propagate selected addresses to clients, processes and the terminal display.

Outcome: Root launch scripts probe requested ports and increment past occupied/reserved ones, passing selected service URLs through environment overrides and the terminal display. Simulation manager and standalone machine launches select available ports and update advertised addresses before spawning. Standalone root service commands reuse the launcher. Preserved the failure-path test using a missing machine program now that an occupied port is recoverable. Updated development/testing docs.

Verification: `npm run check` passed (63 tests). The new process integration test occupies a port, starts all three services and five machines with conflicting requests, and verifies client targets, embedded client address, supervisor registrations, unique machine addresses and terminal output. Invalid listener arguments fail without retry. `npm run format:check` reports the existing issue in `meta/Musings.md`. Reviewed all touched functions.
