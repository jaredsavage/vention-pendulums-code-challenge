# Add a pendulum to a running group

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

Add New Machine to each group's heading in Sim Manager's process list. It launches one more machine into the group, with the next free number and port, copied from the group's rightmost machine with its anchor one spacing further right. It joins like any other machine, so a running group pauses for the change. Each process also gets End, which stops just that one.

With [Edit mode](T111-scene-edit-mode.md) and [Update and Copy](T112-save-as-new-group.md), this makes a loop: add a pendulum, place it, save.

Outcome: done as above. The spacing is the gap between the two rightmost anchors, or a full swing's width when the group has one machine, so the new one never starts overlapping. Verified with a Sim Manager test that adds a machine to a one-machine group and ends it again, `npm run check`, and by hand on a test stack.
