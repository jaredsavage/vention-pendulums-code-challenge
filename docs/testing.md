# Testing

I focused on the machine boundaries and how the group behaves. Enough to check the important parts without testing every possible variation.

```sh
npm run check
npm run format:check
```

The first checks types, lint, builds and tests. The second checks formatting.

## What's covered

- **Reported state.** Machines use what their device measures and what peers report. The supervisor leaves unreported state unknown and sends commands to the right machines.
- **Supervisor commands.** Bad commands and unknown groups are turned away, a group takes one command at a time, a refusal stops the whole group, and a new group starts once its machines have gathered.
- **Collision recovery.** Stopping, waiting for peers, restarting, and cancelling recovery. Also starting early when a peer restarts first, so another collision isn't missed.
- **Connections and processes.** Peers arriving, leaving and reconnecting. Sim Manager adding or removing a group without disturbing another, changing the environment without replacing machines, and carrying on after a change fails. Also saving, creating and copying group files, and adding and ending machines.
- **Physics and interaction.** Gravity, wind, drag, pausing, holding and resetting a pendulum, refusing invalid sizes, and zooming around the mouse position.

The [integration test](../tests/distributed.test.ts) starts a supervisor and three machines as separate Node programs, using the demo's entry points. It checks that a collision stops the whole group, including a distant machine, then waits for the five-second restart. Smaller tests use a controlled clock.

Sim Manager's tests also launch real machine processes, using fixture groups rather than demo data.

## Checked by hand

The browser controls, dragging, machine panel and network view. No automated browser tests, and the network tests don't cover every connection failure. The [README](../README.md#things-im-not-wild-about) covers the broader limits.
