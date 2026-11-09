# Use fixture data for simulation manager tests

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** GPT-6.1 Sol

Allow a data directory override and test group independence with two one-machine fixtures, without using demo groups.

Added SIM_MANAGER_DATA and two one-machine group fixtures plus an environment. Simplified the independence test to add and remove the second group, comparing the first machine directly. Both process tests now use fixtures instead of demo data. Updated the app README and testing guide.

Verification: npm run check passed (17 tests, types, lint, builds) after a concurrent sim-machine rename settled. format:check flags only existing AGENTS.md formatting. Nothing committed.
