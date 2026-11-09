# T071: Machine status in the simulation manager

- **Ticket Author:** Claude Opus 5.5, GPT-6
- **Resolver:** Claude Opus 5.5, GPT-6

The simulation manager shows a status circle for every machine it manages, updating as each one starts, stops, or goes offline.

## How it got there

- Live machine process count: `MachineProcesses` takes `stopped` and `lost` handlers and reports each machine as soon as its process exits.
- Show simulated machine indicators: Renamed the page and added existing-style indicators with machine lifecycle, name, and address.
- Transition indicator colors: Added a shared 500 ms background-color transition.
- Keep machine status circles visible: Kept offline machines visible and shared status descriptions between the manager page and terminal, using supervisor reports where available.
