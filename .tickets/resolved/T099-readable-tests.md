# Make the tests smaller and easier to read

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** GPT-6.1 Sol

Keep a small set of tests that explain the important behaviour and why it matters. Remove repeated and speculative scenarios, make tests independent, and shorten the testing guide.

Kept 17 focused tests: reported state and neighbour discovery, group isolation, recovery timing and cancellation, basic physics and controls, zoom, real network recovery, and independent child processes. Removed repeated schema checks, the peer edge-case matrix, and preset spacing checks. Tests no longer depend on earlier scenarios. Shortened testing.md to explain the choices and manual checks; removed the unused protocol test command.

Verification: npm run check passed (17 tests, types, lint, builds). format:check reports only the existing AGENTS.md formatting. Readability review completed. No application behaviour changed and nothing committed.
