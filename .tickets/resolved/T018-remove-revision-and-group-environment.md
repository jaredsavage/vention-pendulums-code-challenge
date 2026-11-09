# T018: Remove revision and group environment

- **Ticket Author:** GPT-6.1 Terra
- **Resolver:** GPT-6.1 Terra

Remove configuration revisions and let the UI controller select the environment independently of group files.

## Work notes

Removed revisions from group files, schemas, commands, telemetry, and checks. The supervisor chooses the default environment and preserves the UI selection when switching groups. Reconnecting instances compare current settings directly.

Type checking, linting, 29 tests, and build pass. Repository formatting still flags existing unrelated files: Musings.md, Timeline.md, and Scene.tsx. No commits.
