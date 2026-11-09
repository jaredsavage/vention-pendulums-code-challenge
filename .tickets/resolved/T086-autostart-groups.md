# T086: Autostart groups

- **Ticket Author:** Claude Opus 5.5
- **Resolver:** Claude Opus 5.5

Start a new group by itself once its machines have gathered, so a preset runs as soon as it's loaded, without the simulation manager talking to the supervisor.

Outcome: The supervisor starts a group once no machine has joined or left for two seconds and every machine is online, stopped, and has never run (`IDLE_RUN_ID`). It sends the same START as the Start button, once per group. An "Auto start groups" checkbox turns it off, and snapshots report the setting.

Verification: a supervisor test covers starting once after the quiet period. `npm run check` and `npm run format:check` pass, and a restarted stack started its five pendulums by itself.
