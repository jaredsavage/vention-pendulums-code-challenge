# T052: A live terminal status display

- **Ticket Author:** GPT-6.1 Sol, GPT-6.1 Terra, DeepSeek V4.1 Flash 1017, GPT-6 Astra, Claude Opus 5.5
- **Resolver:** GPT-6.1 Sol, GPT-6.1 Terra, DeepSeek V4.1 Flash 1017, GPT-6 Astra, Claude Opus 5.5

The dev launcher shows each service and machine in a small cli-table3 layout, with live updates and status colours from one table.

## How it got there

- Terminal status: Show simulator and supervisor status in a clear terminal layout, with service addresses and live machine states.
- Terminal section descriptions: Align the combined UI link with the terminal layout and add a short explanation beneath each section title.
- Live terminal status: Use the supervisor's existing state stream for terminal machine updates.
- Colour status messages in the dev display: Remove row separators from the cli-table3 status tables and colour status values by meaning.
- Readable terminal status: Layout leads status.ts; machine decisions have explicit names, table alignment lives in statusTable.ts, and live display handlers are named functions.
- Remove redundant status labels: Use existing status names directly, with simple text formatting at display time, instead of maintaining duplicate labels.
- Use cli-table3 for terminal status: Added cli-table3, deleted statusTable.ts, and removed custom widths, padding, status colors, and label formatting.
- Simplify status watcher: Named subscriptions and HTTP reads, explicit response parsing, and one abort signal for requests and polling.
- Status colours in the terminal display: `colorStatus` looks up a `STATUS_COLORS` table keyed by the status name, using the part before " · " so "Ready · 5 machines connected" stays green.
