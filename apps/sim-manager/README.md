# Sim Manager

Starts a separate process for each machine in the groups you select. Adding or removing one group leaves the others running. Environment changes go to the machines live and aren't saved.

The page embeds the supervisor dashboard in an iframe, for demo convenience. Both web apps work on their own. The Sim Manager server never talks to the supervisor.

Group and environment files live in [data/](data/). On startup, it selects the first of each alphabetically. Each machine gets its starting properties, environment and supervisor address when it's launched.

Machines send accepted property changes back to Sim Manager, which saves them to their entries in the group file after a short delay. Shut Down stops a process and keeps its saved definition; Delete removes both. Deleting the last saved machine also deletes the group. Recent edits can be lost if you quit before the delayed save completes.

New and duplicated groups start straight away. Machines added to a stopped group are saved and launch when the group starts.

[api.ts](src/server/api.ts) lists the HTTP routes and handlers. [machineProcesses.ts](src/server/machineProcesses.ts) manages the processes, and [files.ts](src/server/files.ts) the group files and environments. [src/client/](src/client/) is the page.

## Run

From the repository root:

```sh
npm run sim-manager
```

Open http://127.0.0.1:4050. This runs Sim Manager and its machines. Use `npm run dev` to start the supervisor too.

## Configuration

Resolved in [config.ts](config.ts).

| Variable             | Default                 | Purpose                                                                    |
| -------------------- | ----------------------- | -------------------------------------------------------------------------- |
| `SIM_MANAGER_HOST`   | `127.0.0.1`             | Listen address                                                             |
| `SIM_MANAGER_PORT`   | `4050`                  | Page and API port                                                          |
| `SUPERVISOR_URL`     | `http://127.0.0.1:4000` | Supervisor address for the iframe and machines                             |
| `SIM_MANAGER_DATA`   | App's `data/` directory | Group and environment files; relative paths start at the working directory |
| `MACHINE_PORT_START` | `5101`                  | First machine port                                                         |
