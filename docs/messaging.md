# Messaging

The message definitions live in [protocol](../packages/protocol/src/).

Browsers send requests over HTTP and receive live state over server-sent events. Machines use Socket.IO to talk to the supervisor and their peers. Sim Manager uses HTTP to manage machine processes.

## Discovery

A machine registers with its group, ID, name and address. The supervisor returns `membership`: the group's machine names, IDs and addresses. In each pair, the machine with the lower ID opens the peer connection.

## Commands

The dashboard sends commands through the supervisor. Group commands go to every connected machine in the group:

| Command                  | What it does                                   |
| ------------------------ | ---------------------------------------------- |
| `START`                  | Start a new run, or resume with `resume: true` |
| `PAUSE`                  | Pause movement and cancel collision recovery   |
| `STOP`                   | Stop and cancel collision recovery             |
| `RESET`                  | Stop, and go back to the starting angle        |
| `SET_COLLISION_STOPPING` | Enable or disable stopping on collision        |

These go to one machine:

| Command          | What it does                                                      |
| ---------------- | ----------------------------------------------------------------- |
| `SET_PROPERTIES` | Apply property changes                                            |
| `HOLD`           | Hold the pendulum still, with optional angle and property changes |
| `RELEASE`        | Release the held pendulum                                         |

Normally, dragging a pendulum only moves it: a `HOLD` at the new angle, with no changes. In the dashboard's Edit mode, a drag asks for property changes instead, the starting angle included. A machine never changes its own properties to match where it's held.

Commands return `{ ok, error? }`. A machine can refuse a change, like a length of zero. The dashboard shows the error. Accepted changes appear in the machine's reports.

The supervisor answers with 200, or 409 when a machine refuses or another group command is still going. A bad command gets 400, and an unknown group 404.

## Between machines

| Message           | Contains                                                   | Sent to    |
| ----------------- | ---------------------------------------------------------- | ---------- |
| `PROPERTIES`      | Machine properties, on connection and whenever they change | All peers  |
| `POSITION_UPDATE` | Current bob position and angle                             | Neighbours |
| `STOP`            | Collision details and the two machine IDs                  | All peers  |
| `RESTART_READY`   | Readiness to restart after a collision                     | All peers  |

Every peer message includes the group and sender IDs. Everything except `PROPERTIES` also carries a run ID.

## Collision recovery

The machine detecting a collision stops and sends `STOP`. Each machine then sends `RESTART_READY`. Once it's heard ready from everyone, it counts down five seconds and starts again. Pausing or stopping cancels recovery.

Machines derive the next run ID from the previous one, so they agree on it and can ignore old messages.

Each machine counts down on its own clock. If a peer starts first, a message from that run ends the countdown and starts the machine right away. If that message is another STOP, it stops again immediately.

Group changes, a peer disconnecting, or a neighbour going quiet pause active machines. Starting requires all peers connected and their properties received.

## Reports

Machines send their state to the supervisor, which forwards it to the dashboard. Unreported state stays unknown. `status` drives behaviour; `reason` explains it for people reading the page.

Position updates and state reports target 60 Hz. The pages show measured rates; see [timer limitations](notes/node-timer-resolution-limit.md).

| Value                                         | Unit                                             |
| --------------------------------------------- | ------------------------------------------------ |
| Position, length, radius, collision threshold | Metres; positive Y points down                   |
| Measured and held angle                       | Radians from straight down                       |
| Initial angle                                 | Degrees                                          |
| Mass                                          | Kilograms                                        |
| Gravity                                       | m/s²                                             |
| Wind speed                                    | m/s                                              |
| Wind direction                                | Degrees clockwise from right: 0° right, 90° down |
| Air density                                   | kg/m³                                            |
| Restart deadline                              | Unix milliseconds                                |

Sim Manager answers group and environment changes with HTTP 202 and `{ ok: true }`, or 400 with an error. Its live stream reports progress. Shutting down a process is separate from sending a machine STOP.
