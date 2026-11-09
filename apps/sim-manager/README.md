# Sim Manager

Starts a separate process for each machine in the groups you select. Adding or removing one group leaves the others running. Environment changes go to the machines live and aren't saved.

The page embeds the supervisor dashboard in an iframe, for demo convenience. Both web apps work on their own. The Sim Manager server never talks to the supervisor.

Group and environment files live in [data/](data/). On startup, it selects the first of each alphabetically. Each machine gets its starting properties, environment and supervisor address when it's launched.

Launching a machine again reloads its properties from the group file, so previous edits are lost unless you Update the group first. Update asks each running machine for its properties and saves them over the group's file. Collision restarts keep the same process and properties.

New Group makes a group file with one pendulum, and Copy makes one from a running group as it is now. Either way, the new group starts straight away. New Machine adds a copy of a running group's rightmost machine, one spacing to its right, and End stops one machine's process.

[src/server/](src/server/) handles processes and the API; [src/client/](src/client/) is the page.

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
