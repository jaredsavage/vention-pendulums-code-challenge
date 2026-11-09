# Update and copy a running group

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

Wire up the Update and Copy buttons on a running group's row in Sim Manager, and New Group in its header. Update and Copy take a snapshot of the group as it's running now: Update writes it back to the group's own file in `data/groups/`, and Copy writes it to a new file under the name you give. New Group writes a new file with one pendulum.

Sim Manager asks each running machine for its current properties, through a small read-only route on Sim Machine like `GET /api/properties`, and checks the answers with Zod. It never asks the supervisor. A machine whose process was ended isn't running, so Update drops it from the file. A new name that's already taken is refused. Planet icons don't carry over to a copy, since they come from files named after each pendulum.

Outcome: done as above. New and copied groups start straight away, and the group list is read again so they appear. Saved files are laid out like the hand-written ones. Verified with Sim Manager tests for Update, New Group and Copy, `npm run check`, and by hand on a test stack.
