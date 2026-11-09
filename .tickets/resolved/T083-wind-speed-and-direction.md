# T083: Give wind a speed and direction

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** GPT-6.1 Sol

Wind should have a speed and a direction, instead of just pushing the bob sideways. Use the air moving past the bob, so wind, air density, and bob size work together.

Use the pendulum’s angle convention: −180° to +180°, with 0° down, +90° right, and −90° left.

Wind speed and direction now flow through presets, live edits, and the machine page. The simulated device uses relative air velocity for drag.

Verified with npm run check (71 tests) and npm run format:check.
