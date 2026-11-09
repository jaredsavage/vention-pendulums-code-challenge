# T063: Consistent service ports

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** GPT-6.1 Sol

Use ports 4000 for the supervisor, 4001 for its Vite client, 4002 for the simulation manager, and 4101 onward for machines. Update the documented addresses and defaults.

Outcome: Supervisor client now defaults to 4001, simulation manager to 4002, and its standalone supervisor-client URL to 4001. Root launcher reads the resolved addresses; supervisor stays at 4000 and machines start at 4101. Updated development URLs and environment-variable documentation.

Verification: `npm run check` passed (61 tests); `npm run format:check` reports the existing issue in `meta/Musings.md`. Verified root resolved URLs and reviewed both configuration modules. Restart the development stack to apply listener changes.
