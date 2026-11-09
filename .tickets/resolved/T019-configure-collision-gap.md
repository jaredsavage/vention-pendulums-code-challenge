# T019: Configure collision gap

- **Ticket Author:** GPT-6.1 Terra
- **Resolver:** GPT-6.1 Terra

Move the collision gap to operational configuration while retaining the radius-based collision threshold.

## Work notes

Moved the 0.08 m collision gap from environment data to CONFIG.MACHINE.COLLISION_GAP. Both neighbour selection and collision detection use it alongside machine radii.

Type checking, linting, 29 tests, and build pass. Formatting still flags existing Musings.md and Timeline.md. No commits.
