# T070: Shut down a machine

- **Ticket Author:** GPT-6
- **Resolver:** GPT-6

Add a machine-page shutdown control that exits that machine while leaving other simulated machines running.

Outcome: Added the machine shutdown control and kept other managed machines running after a clean exit. Selecting the preset again restores the group.

Verification: The management integration tests and build passed. The full check passed typecheck and lint but failed startup-port and distributed-recovery tests. Format check reports the existing meta/Musings.md.
