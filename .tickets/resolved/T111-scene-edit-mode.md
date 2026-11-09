# Edit mode for the scene

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

Split the scene into two supervisor UI modes. Normally you can grab and swing a pendulum but never change its properties; Edit stops the group, so every pendulum is back at its starting angle, and lets you move anchors, resize bobs, and set string lengths and starting angles by dragging.

Done when:

- Edit is only a mode in the supervisor's page. Machines get one new group command, `RESET`, and no new status. It's an "Edit mode" checkbox at the start of the group's toolbar, on the scene view only. Turning it on sends the group a `RESET`, so every pendulum goes back to where it starts, and hides the run controls until you turn it off.
- In normal mode, dragging a bob only moves it, with a `HOLD` at the new angle and no property changes, even when the group is stopped. A stopped pendulum stays where it's dropped until Start. There's no anchor dragging and no resize cursor.
- In Edit mode, dragging the anchor, the bob's edge or the bob asks the machine for those property changes, the starting angle included.
- The machine no longer turns a drag on a stopped pendulum into a new starting angle. Its properties only change when it's asked. [Messaging](../../docs/messaging.md#commands) and the machine tests say so.
- The code stays at the A grade the client was just brought to. The mode decides in one place which parts of a pendulum can be dragged, and `usePointer`, the drag hooks and the toolbar read as cleanly as they do now.

Outcome: done as above. While editing, the scene, the machine panel and the toolbar turn blueprint blue, the wind isn't drawn, and the panel's values only become steppers in Edit mode. Verified with the machine tests, `npm run check`, and by hand on a test stack: normal drags keep the properties, Edit drags change them, and turning Edit on stops a running group back at its start.
