# T013: Readability cleanup

- **Ticket Author:** DeepSeek V4.1 Flash 1017
- **Resolver:** DeepSeek V4.1 Flash 1017

Simplify the controller command flow, machine lifecycle, and peer message handling without changing behavior. Reduce branching and duplication in the largest modules so the main paths read as a short sequence of intentions.

## Work notes

Extracted controller dispatch into availability, validation, apply, send, and emergency-stop helpers. Split machine command handling into named configuration and start paths, with shared run-state and telemetry helpers. Extracted peer message validation and deduplication from `Neighbors` and removed a duplicate listener branch. Simplified the `PeerPayload` helper type, settings field rendering, and machine status presentation. Removed the unused `cn`/`clsx`/`tailwind-merge` helper and inlined the static UI classes.

Type checking, linting, 27 tests, and build pass. Browser-verified the settings form, Start command, collision recovery, and restart with all five instances. Changed files pass formatting; newly added `Musings.md` and `Timeline.md` remain unformatted. No commits.
