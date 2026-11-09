# T089: Several groups in one preset

- **Ticket Author:** Jared
- **Resolver:** Claude Opus 5.5

The supervisor can show several groups now, but a preset can only hold one. I'd like a preset to list its groups, each with its own id that says what it is, so one preset can start more than one group.

The manager's "Change group" goes away, since the preset now says which group each machine is in.

Outcome: A preset file now lists its groups, each with its own id. The solar system is `inner-planets` and `outer-planets`, the five pendulums are a `workbench`, the ten are a `long-row`, and the 50 are `row-1` to `row-5`. Machines are numbered, and given ports, across the whole preset, so nothing clashes between groups. The manager tracks each machine's group, the Machines menu lists machines under their group, and the Supervisor menu shows the groups instead of offering to change one.

Verification: `npm run check` and `npm run format:check` pass. The solar system started as two groups that the supervisor saw side by side with the running workbench.
