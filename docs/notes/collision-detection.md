# Collision detection

Each machine checks its neighbours for collisions. If it detects a collision, it tells the whole group to stop. The supervisor stays out of that decision and shows what machines report.

## What happens now

Machines exchange physical properties when they connect, and again when those properties change. Each one uses the anchor positions, string lengths, and bob radii to work out which peers could come within reach. Those are its neighbours, and the ones it exchanges positions with.

On each tick, a machine compares its own measured position with the latest positions its neighbours reported. The check is pretty simple: how much space is left between the two bobs? If it's within the configured collision threshold, it's a collision.

It uses reported measurements, only through the network. It doesn't read another machine's simulation data or try to run its physics.

## Who should calculate it?

I kept this on the machines, because the challenge asks that they monitor their neighbours and coordinate stopping and restarting directly with one another.

Using a machine-to-machine mesh follows the guidelines of the challenge, but my preference leans towards having an overseer. For a larger system, I think we'd need to have centralized collision detection.

## Between updates

Two pendulums can make contact between position updates. [Estimating time of impact](time-of-impact-estimation.md) could help catch those missed collisions, but isn't implemented.

## As groups grow

Position updates only go to neighbours, but every machine still connects to every other machine in its group. That's because a collision sends STOP to everyone, including machines nowhere near the colliding pair.

It's straightforward for a small group. As the group grows, so does the number of connections. Passing messages through other machines, or using a central service, could reduce the connections each machine needs, but would change how STOP and restart readiness reach the group.

## Stopping and starting again

After a collision, the machines wait until everyone is ready, then count down five seconds and start again. [Messaging](../messaging.md#collision-recovery) covers how they coordinate it.
