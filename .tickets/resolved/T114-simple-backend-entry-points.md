# Simple backend entry points

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** GPT-6.1 Sol

Put each app's HTTP routes and named handlers in api.ts, and its socket connections and handlers in sockets.ts. Keep the route and event lists together, preserve behaviour, and remove the files they replace. Local branch only; no commits or pushes.

All three apps now have api.ts with named handler variables and grouped route lists. Supervisor and Sim Machine have sockets.ts; Sim Manager uses HTTP only. Removed the replaced HTTP/connection modules, simplified machine startup, and updated the app READMEs and agent instructions.

Verification: npm run check passed (42 tests), npm run format:check and git diff --check passed. Public route lists match the starting branch. Live machine API checks passed for text pages, icon, health, properties, environment updates, invalid input and shutdown. Local branch: codex/simple-backend. Nothing committed or pushed.
