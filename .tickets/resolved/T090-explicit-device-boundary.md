# T090: Make the device boundary explicit

- **Ticket Author:** GPT-6 (Codex)
- **Resolver:** Claude Opus 5.5

Construct the simulated pendulum in the machine server and give coordination a small device contract containing only the commands and reported values it uses. Keep simulation files visibly separate from coordination within this app; follow the existing [simulation boundary](../../docs/arch-notes/simulation-boundary.md).

## Evidence and scope

`machine.ts` imports and constructs `Pendulum`, accepts the full launch definition, and exposes that concrete device. Lifecycle tests construct real pendulums and replace their methods or measurements, despite the documented device boundary.

## Completion criteria

- `server.ts` assembles the device, machine, peer transport, and supervisor connection in an obvious sequence. `Machine` has no dependency on `Pendulum`, physics, ports, or icon files.
- Define the minimal device contract locally, reusing protocol types. Keep device-specific environment/hold routes with the simulated device; do not add forwarding methods solely to hide it.
- Group `pendulum.ts` and `physics.ts` under a simulation directory. Keep coordination together rather than splitting each method into a file.
- Test coordination with a measurement-only device stub; keep actual physics tests separate. Preserve local start, pause, stop, hold, and property-edit behaviour.
- Make coordination internals private where callers can use reported state instead. Do not add a device factory framework or another package.
- Update the machine README's source map, run both required checks, and review whole touched functions for readability.

Implement first; T091 follows this work.

## Outcome

Closed without implementing it. The machine simulator is only ever simulated, so the boundary is the network: a real machine would be its own program speaking the same protocol, and a device interface inside this app would protect nothing.

The docs that implied otherwise now say this: `docs/arch-notes/simulation-boundary.md`, `docs/arch-notes/machine-properties.md`, and the machine simulator's README. No code changed.
