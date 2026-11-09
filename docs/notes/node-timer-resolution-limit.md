# Node.js timer resolution

I originally aimed for 480 Hz between machines, but ran into Node's timer resolution. On my Windows machine (Node 24), timers were waking about every 15.6 ms regardless of time requested, limiting updates to about 64 Hz. A few ways I tried to get past it:

| Approach         | Result                            |
| ---------------- | --------------------------------- |
| `setInterval`    | ~64 Hz                            |
| `Atomics.wait`   | ~64 Hz                            |
| Staggered timers | ~507 callbacks/s, but in bursts   |
| `setImmediate`   | ~480 Hz, but maxed out a CPU core |

I managed to hit 480 Hz using `setImmediate`, but it absolutely pins the CPU.

I settled on ordinary timers targeting 60 Hz. Low CPU usage, and enough for the challenge. Timers aren't exact, so the pages show the measured update rate, which is quite a bit lower.

It would be interesting to explore higher update rates. That said, [estimating when and where an impact will happen](time-of-impact-estimation.md) would make more sense.
