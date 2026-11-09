# Development

Run everything from the repository root:

```sh
npm run dev
```

The [README](../README.md#run-it) covers getting started.

## While editing

The supervisor is hooked into Vite's hot reload when using `npm run dev` or `npm run supervisor`, so client changes show up straight away. Server changes need an app restart.

Sim Manager's page needs a rebuild, then a browser refresh:

```sh
npm run build --workspace @repo/sim-manager
```

Running `npm run dev` or `npm run sim-manager` again also rebuilds that page.

## Running separately

From the repository root, in separate terminals:

```sh
npm run supervisor
```

```sh
npm run sim-manager
```

Each app's README covers its settings and running it alone: [Supervisor](../apps/supervisor/README.md), [Sim Manager](../apps/sim-manager/README.md), [Sim Machine](../apps/sim-machine/README.md).

[Testing](testing.md) covers the checks and tests.
