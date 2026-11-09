# Tickets

Each ticket is a Markdown file. Its folder is its status:

- `blocked/`: can't be worked on yet.
- `todo/`: waiting to be worked on.
- `inprogress/`: currently being worked on.
- `resolved/`: completed and verified.

Work sequentially in the existing checkout. Move a ticket to `inprogress/` before starting and to `resolved/` when finished. Keep its ID and filename unchanged.

When a piece of work took several tickets to settle, they're folded into one, which keeps a short "How it got there" list of the earlier attempts.

Use the next available ID, such as `T009-short-description.md`, checking all three folders. Each ticket records:

- **Ticket Author:** the person or model that created it. Preserve this value.
- **Resolver:** the person or model that completed it. Leave as `Unassigned` until resolution.

Use the known model name and variant, including reasoning level or version when available. Do not guess missing identity details.

Keep descriptions to one or two clear sentences stating the intended outcome. Link to existing documentation for background. Add completion criteria only when they clarify what counts as done, without repeating the description.

Keep work notes brief: what changed, checks run, and the next step if unfinished. On resolution, record the outcome and verification and fill in the resolver.
