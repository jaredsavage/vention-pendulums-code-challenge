# Use ordinary update timers

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** GPT-6.1 Sol

Use setInterval for machine reports and supervisor browser updates. Show the measured rate and keep the documentation consistent.

Machine reports and supervisor browser updates now use setInterval, cleared on shutdown. Removed the helper, export and README entry; simplified the timer note.

Verification: readability review, no remaining helper references in live code/docs, npm run check (30 tests) and npm run format:check passed. Nothing committed.
