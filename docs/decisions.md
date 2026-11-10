# Design decisions

A few choices I made along the way, and why. The [README](../README.md#how-it-fits-together) has the overview, and [Messaging](messaging.md) covers how the parts talk to each other.

## The world is a 2D plane

One starting angle, so we're working in 2D. Keeps the physics, collision checks and drawing simple. Going to 3D would mean revisiting those and adding depth to the reported positions. The machines would still communicate the same way.

## The world is metric

I went with metres, with y pointing down like it does in Godot. Makes it easier to draw, since the world and screen point the same way.

The origin is on the ground, so anything above it has a negative y value.

## A simulated machine is a machine

I wanted each simulated machine to behave like a real one. They handle their own movement, report their measurements, and respond to commands over the network. The supervisor has no idea they're simulated.

The physics stay inside each machine. Other machines and the pages get those measurements over the network. The dashboard smooths the drawing between reports.

A real machine speaking the same protocol could take its place without changing the supervisor. More setup than running everything in one simulation, but keeps that boundary clear.

## Machines report their own properties

The supervisor introduces machines by name and address. Each machine reports its own anchor position and dimensions. Until a machine reports them, they're unknown.

Peers get those properties when they connect, and again whenever they change. The supervisor gets them with every state report. A few extra bytes each time, but keeps them current without another set of messages.

Group files give simulated machines their starting properties. After that, everyone asks the machine over the network. Same way they would with a real one.

## The supervisor can ask a machine to change itself

You can drag a pendulum or edit its properties from the dashboard. The supervisor passes the request to that machine, which makes the change and reports back. We're always seeing what the machine reports.

## One kind of device

We only have pendulums, so the dashboard is written to draw and configure those. If we added other machine types, we could have each machine describe its settings and build the forms from that. More work than we need here, and we'd still need to figure out how to draw them.

## Communication

The pages send requests over HTTP and get live updates through server-sent events. The browser already has `EventSource` for that, including reconnection, so there's no extra client library.

Machines use Socket.IO to talk to their peers and the supervisor, over WebSocket. Saves us writing the connection handling ourselves. A real machine would need a Socket.IO client too.

Each machine opens its own connection to every peer, so a pair shares two. Simpler than agreeing who calls whom, and fine for groups this size. Sim Manager uses HTTP to manage machine processes.

## Checking incoming data

I use Zod to check files and messages as they come in, including in the browser. Shared message definitions live in `protocol`, so both ends use the same shapes and types. Definitions only one app needs stay with that app.

Zod is only for data coming from outside the program. Anything the program makes itself, like a drag in progress, is a plain TypeScript type. The compiler already checks those.

## Keeping state in memory

The supervisor can rebuild its view from machine reports when they reconnect, so I haven't added a database. It also remembers the last collision setting requested for each group, so new machines get it too. That setting and Edit mode reset when the supervisor restarts.

Machines can save property changes through an address they're given at startup. For a simulated machine that's Sim Manager, which writes them into the group file. The supervisor stays out of it, and a machine doesn't know what's on the other end.

## Shared Edit mode

Edit mode lives on the supervisor so every open dashboard agrees. While it's on, the supervisor refuses START requests, so another page can't start the group mid-edit.

## Each app has its own styling

I wanted Sim Manager to look different from the supervisor. One lives in simulation, the other thinks it's dealing with the real world.

Initially, I had a shared theme, but it meant overriding a lot of it for Sim Manager. So each app got its own stylesheet. A few colours and fonts repeated, but keeps it simple.
