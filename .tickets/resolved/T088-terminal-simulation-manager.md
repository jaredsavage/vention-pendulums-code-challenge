# T088: Run the simulation manager in the terminal

- **Ticket Author:** Jared
- **Resolver:** Claude Opus 5.5

The manager's page put the whole supervisor inside an iframe, which made it confusing to tell which part was which. I'd like the manager to be a terminal app instead, with no server or page of its own, and with as little code as we can get away with.

Outcome: The manager runs in the terminal it's started from, and its menus call the manager directly. They cover machines and their own commands, presets, the environment, and the supervisor's address and group. It starts the default preset when it opens, and there's no "No preset" any more. Its server, HTTP API, browser page and status scripts are gone. Machines serve their own icons, so nothing else has to host them, and machine ports skip the supervisor's port. `npm run dev` starts the supervisor in the background and then runs the manager, and quitting the manager stops everything. The supervisor no longer needs CORS or the "embedded in the manager" title.

Verification: `npm run check` and `npm run format:check` pass. `npm run dev` launched five pendulums that the supervisor saw and autostarted, a solar-system machine served its icon, and Ctrl+C left no ports open. The menus themselves still need a try by hand.
