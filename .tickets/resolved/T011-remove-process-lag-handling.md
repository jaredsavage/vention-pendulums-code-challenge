# T011: Remove process lag handling

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** GPT-6.1 Sol

Remove process-lag detection, elapsed-time thresholds, and catch-up scheduling. Advance the simulation with a simple fixed-step timer.

## Work notes

Replaced lag detection and accumulator/catch-up scheduling with a timer calling simulation.tick at stepMs. Removed maxElapsedMs, maxCatchUpMs, and schedulerIntervalMs, and updated the timing documentation.

No references remain in source, config, tests, scripts, or current documentation. Type checking, linting, 24 tests, and build pass. Changed files pass formatting; existing issues in `src/controller/index.ts` and `src/shared/config.ts` remain untouched. Restarted the local stack. No commits.
