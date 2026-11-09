# T057: Split the simulation manager into its own app

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

Move the simulation manager out of `apps/machine-simulator` into `apps/simulation-manager`, so each app is one program. Do [T056](T056-machine-told-its-definition.md) first, so the two apps share no files.

## Completion criteria

- `apps/simulation-manager` holds `setup.ts`, `data/`, the manager, and its page. `apps/machine-simulator` holds the machine process, the simulated device, `environment.ts`, and the machine page.
- Neither app imports the other. The manager finds the machine program through one setting in its own config, not a path into another app's folder.
- Each app has its own config, build and tests. The root launcher, status display and `npm` scripts start both.
- `README.md`, `architecture.md`, `development.md` and the boundary rules in `Agents.md` name the new app.

Outcome: `apps/simulation-manager` (`@repo/simulation-manager`) now holds `setup.ts`, `data/`, the manager modules (formerly `src/management/`), its page (`index.html` and `src/page.ts`), its config, its Vite build, and the preset tests. `apps/machine-simulator` keeps the machine process, the simulated device, `environment.ts` and the machine page, and its config is down to the machine's own settings. The manager runs the machine through one `MACHINE_PROGRAM` setting, which defaults to resolving `@repo/machine-simulator/program` by package name; no app imports another. The manager passes environment data through without interpreting it, and the machine validates it, so there's one environment schema. The unused `machineLifecycleLabels` (which imported from the manager) is gone. Machine tests use a two-pendulum fixture, and the preset-spacing check, which needs both presets and the collision gap, moved to `tests/preset-spacing.test.ts`. The root build, `predev`, `pretest` and `simulator` scripts, the launcher, the status scripts and the root tests point at the new app. `README.md`, `architecture.md`, `decisions.md`, `development.md`, `testing.md` and the boundary rules in `Agents.md` name it, and `MACHINE_PROGRAM` is documented.

Verification: `npm run check` passed (58 tests, 14 files; all three apps build). `format:check` reports only `meta/Musings.md`. `npm run machine --workspace @repo/simulation-manager -- pendulum-03` started one machine with its page. With `npm run dev`: the manager page served from the new app, five machines connected, switching to Mars reached the machines through their definitions (Pendulum 01 showed gravity 3.71), and a group run collided and restarted. Group stopped afterwards. Nothing committed.
