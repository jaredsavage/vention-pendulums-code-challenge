# T055: Workspaces in apps/ and packages/, under @repo

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

Applications live in `apps/`, shared code in `packages/`, and every workspace uses the `@repo` scope.

## How it got there

- Move workspaces into apps/ and packages/: Workspaces are now in `apps/supervisor`, `apps/machine-simulator` and `packages/protocol`, and `projects/` is gone.
- Rename the package scope to @repo: `@repo/protocol`, `@repo/ui`, `@repo/supervisor` and `@repo/machine-simulator` replace the `@machines` names in every `package.json`, the lockfile, all imports, the scripts, `README.md` and `docs/development.md`.
