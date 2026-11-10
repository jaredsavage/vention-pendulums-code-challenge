# Testing

I focused on the machine boundaries and how the group behaves. Enough to check the important parts without testing every possible variation.

```sh
npm run check
npm run format:check
```

The first checks types, lint, builds and tests. The second checks formatting.

## What's covered

- **Reported state.** Machines use what their device measures and what peers report. The supervisor leaves unreported state unknown and sends commands to the right machines.
- **Supervisor commands.** Bad commands and unknown groups are turned away, a group takes one command at a time, a refusal stops the whole group, a new group starts once its machines have gathered, and Edit mode blocks starting the group.
- **Collision recovery.** Stopping, waiting for peers, restarting, and cancelling recovery. Also starting early when a peer restarts first, so another collision isn't missed.
- **Connections.** Machines connect to peers, receive their properties, disconnect when a peer leaves, and reconnect when one returns.
- **Processes and saved groups.** Sim Manager starts and stops groups independently, changes environments without replacing machines, and carries on after a change fails. Creating, duplicating, renaming, reloading and deleting groups; saving property changes; adding machines to running or stopped groups; and keeping Shut Down separate from Delete. Deleting the last saved machine removes its group too.
- **Physics and interaction.** Gravity, wind, drag, pausing, holding and resetting a pendulum, refusing invalid sizes, and zooming around the mouse position. Also fixed-size physics steps when timers run late, with limited catch-up after a stall.

The [integration test](../tests/distributed.test.ts) starts a supervisor and three machines as separate Node programs, using the demo's entry points. It checks that a collision stops the whole group, including a distant machine, then waits for the five-second restart. Smaller tests use a controlled clock.

Sim Manager's tests also launch real machine processes, using fixture groups rather than demo data.

## Checked by hand

The browser controls, dragging, machine panel and network view. No automated browser tests, and the network tests don't cover every connection failure. The [README](../README.md#things-im-not-wild-about) covers the broader limits.
