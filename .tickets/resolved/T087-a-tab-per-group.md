# T087: A tab per group

- **Ticket Author:** Jared
- **Resolver:** Claude Opus 5.5

The supervisor only ever showed one group, so if a second group was running, it was just invisible. I'd like a header across the top for the supervisor itself, and a tab for each group under it.

Outcome: The header shows the connection, how many groups and machines are online, and the settings that apply to every group: Auto start groups and Neighbour links. Each group gets its own tab, named after it, with its status, its commands right above the scene, and its machine table. Tabs open and close as groups come and go, and a new one doesn't take focus. The client is split into small parts, each with one job: the dock, the group dashboard, the group's scene, the machine table, and the supervisor hook.

Verification: `npm run check` and `npm run format:check` pass. In the browser, moving a machine into a second group opened a tab for it without taking focus, and moving it back closed the tab.
