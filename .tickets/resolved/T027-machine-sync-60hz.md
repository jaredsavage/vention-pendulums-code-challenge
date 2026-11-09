# T027: Machine sync at 60 Hz, with measured rates

- **Ticket Author:** DeepSeek V4.1 Flash 1017, GPT-6.1 Terra
- **Resolver:** DeepSeek V4.1 Flash 1017, GPT-6.1 Terra

Machines sync at 60 Hz on a plain `setInterval`, and the UI shows the rates it actually achieves. Higher rates were tried and documented as a Node.js timer limit.

## How it got there

- Report actual rendering rates: Add configured client render, machine sync, and neighbour position rates, apply them, and display measured actual rates on machine cards and below the scene.
- Try 480 Hz machine sync: Raise machine-to-machine and machine-to-supervisor update generation to 480 Hz while keeping supervisor-to-client snapshots and rendering at 60 Hz.
- High-resolution machine sync loop: Replace the coarse machine-sync scheduler with a `setImmediate`/`process.hrtime.bigint()` loop at 480 Hz and measure the cost.
- Document Node.js timer resolution: Document the Node.js timer-resolution limit and its consequences for high-frequency machine scheduling.
- Clarify timer limitation: Retained key measurements, clarified worker and timing limits, and recorded the scope decision.
