# T022: Workspace boundaries

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** GPT-6.1 Sol

Separate supervisor, machine-simulator, and protocol workspaces. Make the supervisor independent of simulator processes and discover machines through registration and requested properties.

## Work notes

Implemented independent packages and startup commands, network discovery/property requests, and a separate manager page. The manager owns only simulated machine processes. Updated architecture and run instructions.

Verified: type checking, linting, build, 34 tests, workspace checks, and browser controls. Existing formatting warnings remain only in Musings.md and Timeline.md. No commits created.
