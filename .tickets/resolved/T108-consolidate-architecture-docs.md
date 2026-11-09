# Consolidate architecture docs

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** GPT-6.1 Sol

Keep the overview and diagram in the README. Move useful details from architecture.md into the existing focused docs, update links, and remove the overlapping document.

Moved the diagram to the README, ownership to decisions, recovery to collision detection, and lifecycle details to the app READMEs. Updated message details and links, removed architecture.md, and removed its obsolete AGENTS.md entry.

Verification: changed docs read through and local links checked; npm run check passed (30 tests), and npm run format:check passed. Nothing committed.
