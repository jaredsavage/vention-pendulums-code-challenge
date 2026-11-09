# T043: Each machine has its own page

- **Ticket Author:** DeepSeek V4.1 Flash 1017, GPT-6, Claude Opus 5.5
- **Resolver:** DeepSeek V4.1 Flash 1017, GPT-6, Claude Opus 5.5

Machine settings moved out of the simulation manager and onto each machine: a small page with its properties, a live preview, its environment and collision settings, and local controls.

## How it got there

- Machine table in the simulation manager: Add a readable machine table to the simulation manager with name, address, status, position, and neighbour tracking rate.
- Move reconfiguration into the simulation manager: Remove machine configuration from the supervisor and protocol.
- Machine-local settings page: Serve a tiny React settings page from each machine at `GET /`, letting an operator edit the device's reported properties with no UI validation.
- Machine page status, position preview, and controls: Show the machine's status and a live pendulum position preview, and add direct Stop, Restart, and Pause controls to the machine page.
- Canvas preview at display rate with fixed anchor: Replace the SVG preview with a canvas that keeps a fixed anchor and scale, update it at 60 Hz or better, and place it to the right of the settings controls.
- Stacked position readout and environment settings: Stack the position readout, add the current angle in degrees, and show the machine's environment settings on its local page.
- Local machine start and fresh static positions: Replace the machine page's separate Stop and Restart buttons with one Stop/Start toggle, make Start local to the machine, and keep other machines running when one is stopped.
- Remove manager machine settings: Remove the per-machine settings form from the simulation manager and delete the code that only served it.
- Display collision gap and shrink preview: Show the collision gap among the machine's displayed properties and reduce the canvas preview to 120 px square.
- Preview below the header with properties beside it: Move the machine preview below the page header and place the properties column to its right.
- Position readout beside the preview: Place the preview's x, y, and angle readout directly beside the canvas, and keep the rest of the machine UI below that row.
- Machine settings layout: Updated the page and browser titles, moved status beneath the heading, and right-aligned both Save buttons.
- Simulated machine header controls: Renamed the page and browser title, moved controls alongside the heading, and removed the Controls heading.
- Collision stopping on the machine page: The Collision section lists "Stop on collision: On/Off" from the reported `stopOnCollision` in the state stream.
