# T049: Readable scene rendering

- **Ticket Author:** GPT-6.1 Sol, Claude Opus 5.5
- **Resolver:** GPT-6.1 Sol, Claude Opus 5.5

The supervisor scene is a short composition of named drawing steps, keeping its look, interpolation and selection.

## How it got there

- Simplify scene rendering: Refactor drawScene into small, named drawing operations and readable calculations while preserving its appearance, interpolation, and selection behavior.
- Readable scene rendering: `drawScene` takes one named `SceneFrame` and handles the no-snapshot case itself.
