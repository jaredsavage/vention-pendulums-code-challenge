# T065: The simulation manager page

- **Ticket Author:** DeepSeek V4.1 Flash 1017, Claude Opus 5.5, GPT-6, GPT-6.1 Sol
- **Resolver:** DeepSeek V4.1 Flash 1017, GPT-6.1 Sol, GPT-6, Claude Opus 5.5

Preset, environment and settings controls share one dropdown style. The environment editor applies gravity, wind and damping live, and can save a new preset.

## How it got there

- Environment selector: Add an environment dropdown beside the simulation selector.
- Editable environment with live propagation: Let the simulation manager edit gravity, wind, and damping, apply them to running machines without a restart, and update the machine page live.
- Slim down the simulation manager page: Simulation manager page now contains only preset/environment/supervisor selection and status/errors, backed by a typed module.
- Simulation manager controls: Removed both headings, renamed the field Supervisor, and right-aligned Save beneath the input.
- Simulation manager status placement: Moved the status beneath the title and out of the simulation form.
- Simulation manager error placement: Moved both error messages beneath the title and status.
- Rename Montreal environment to Earth: Renamed the environment file to earth.json and updated test references.
- Wind slider: Each machine has `POST /api/wind`.
- Environment preset editor: Added an expandable Environment picker with a small label, preset choices, live sliders and numeric inputs for gravity/wind/damping, modified state, and Save as new preset.
- Matching settings dropdowns: Preset, Environment and Supervisor now share a SettingsDropdown with small labels and native exclusive expansion.
- Dropdown arrows and outside dismissal: Shared theme renders right-aligned chevrons with open/closed directions.
