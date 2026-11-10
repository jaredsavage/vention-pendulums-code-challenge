# Messaging

The message definitions live in [protocol](../packages/protocol/src/).

Browsers send requests over HTTP and receive live state over server-sent events. Machines use Socket.IO to talk to the supervisor and their peers. Sim Manager uses HTTP to manage machine processes.

## Discovery

A machine registers with its group, ID, name and address. The supervisor returns `membership`: the group's machine names, IDs and addresses. Each machine opens its own connection to every peer, and sends on it.

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
| `DESTROY`        | Delete the machine, if something keeps its settings               |

Normally, dragging a pendulum only moves it: a `HOLD` at the new angle, with no changes. In the dashboard's Edit mode, a drag asks for property changes instead, the starting angle included. A machine never changes its own properties to match where it's held.

The dashboard changes Edit mode with `POST /api/groups/:groupId/editing` and `{ editing: true }` or `{ editing: false }`. The supervisor resets the group before enabling Edit mode, and refuses `START` until editing ends. When you finish editing, the dashboard turns Edit mode off, waits for the answer, then sends `START` with a new run ID.

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

Group changes, a peer disconnecting, or a neighbour going quiet pause active machines. Starting requires all peers connected and their properties received. A resume brings everyone along: running machines join the run, and stopped ones, like a machine that's just been added, join from their starting angle.

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

Sim Manager accepts group and environment requests with HTTP 202 and `{ ok: true }`, or returns a 4xx response with `{ ok: false, error }` when refused. Its live stream reports process changes. Machines use the [settings address](#settings) to save properties or request deletion. Shutting down a process is separate from sending a machine STOP.

## Settings

A machine can be told where its settings are kept. It sends its properties there with a `PUT` whenever they change, and a `DELETE` when it's deleted. Nothing waits on the answer. For simulated machines, the address is Sim Manager's `/api/machines/:id/settings` endpoint. Sim Manager saves the properties to the group file a quarter of a second after the last change. A `DELETE` removes the saved member and shuts down its process. Deleting a group's last machine deletes the group file.
