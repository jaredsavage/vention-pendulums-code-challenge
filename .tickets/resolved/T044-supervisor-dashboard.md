# T044: The supervisor dashboard

- **Ticket Author:** GPT-6.1 Sol, DeepSeek V4.1 Flash 1017, GPT-6, Claude Opus 5.5
- **Resolver:** GPT-6.1 Sol, DeepSeek V4.1 Flash 1017, GPT-6, Claude Opus 5.5

A machine table, a stable layout while waiting for data, and selecting a machine by its anchor or table row.

## How it got there

- Machine cards: Replace machine buttons with selectable cards showing a numbered color icon, machine type, status, position, and neighbours.
- Machine address: Show each machine's configured host and port on its card.
- Supervisor machine table: Replace the supervisor client's machine cards with a compact table matching the simulation manager.
- Stable supervisor startup layout: Controls, canvas, and table remain visible without group data; the canvas clears when the group disappears.
- Disable supervisor controls without connected machines: Disabled group commands and neighbour links when no machines are online, including when offline machines remain in the group.
- Remove supervisor Group heading: Removed the Group heading from the supervisor dashboard.
- Select a machine by its anchor or table row: `drawScene` returns a hit target around each anchor as well as each bob.
