# T085: Wind in the scene

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

Show the wind around each pendulum in the scene, on the supervisor and the machine page, from what each machine reports.

Outcome: Small orbs drift with the wind through a patch centred on where each bob has been over the last few seconds, and the bobs pass over them. Their speed grows with the logarithm of the wind speed, so light and strong wind both stay readable. Each orb keeps the wind it set out with, so changes ripple in rather than jump, and nothing is drawn when there's no wind. Machines report their environment to the supervisor like properties, only when it changes, and a machine that doesn't answer keeps it unknown. The machine page's scene is now 200 by 200.

How it got there: arrows that stopped and folded at the bob, then three lines, then orbs. Each followed the bob's swing, so they moved backwards against the background, until the patch was anchored to the bob's recent position instead.

Verification: `npm run check` and `npm run format:check` pass, and the orbs were checked in the supervisor with live wind, including a resize.
