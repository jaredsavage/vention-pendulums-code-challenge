# T084: Make zero-degree wind blow right

- **Ticket Author:** GPT-6.1 Sol
- **Resolver:** GPT-6.1 Sol

Use the usual 2D screen direction for wind: zero points right, and positive angles turn clockwise. Keep the −180° to +180° controls and leave pendulum angles as they are.

Updated the simulated device and protocol documentation. Direction tests cover all four directions and both representations of left.

Verified with npm run check (72 tests), npm run format:check, and a readability review.
