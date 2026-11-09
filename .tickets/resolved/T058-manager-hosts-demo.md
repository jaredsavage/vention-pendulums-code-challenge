# T058: The simulation manager hosts the demo

- **Ticket Author:** GPT-6.1 Terra, GPT-6.1 Sol, Claude Opus 5.5
- **Resolver:** GPT-6.1 Terra, GPT-6.1 Sol, Claude Opus 5.5

The simulation manager page is the demo's entry point, with the supervisor client embedded below its controls.

## How it got there

- Combined demo page: Add a small HTML page that embeds the simulation manager and machine client for the challenge.
- Embed the floor supervisor: Simulator page embeds the independently served floor supervisor, with a separate-page link and SUPERVISOR_UI_URL setting.
- Embed the running simulation manager: Added an iframe pane for the running simulation manager beside the Supervisor pane, with its URL in the tab title.
- The simulation manager hosts the supervisor client: The simulation manager page is React (`src/client/`).
