# T042: One shared pendulum drawing

- **Ticket Author:** DeepSeek V4.1 Flash 1017, Claude Opus 5.5
- **Resolver:** DeepSeek V4.1 Flash 1017, Claude Opus 5.5

The supervisor scene and the machine page draw pendulums with the same `drawPendulum`, scaled with the viewport and numbered at the anchor.

## How it got there

- Pendulum number in anchor: Move each pendulum's number from its bob into the anchor, enlarging the anchor enough to display the number clearly.
- Scale pendulum rendering with viewport: Make pendulum bob sizes and selection rings scale with the world viewport instead of using fixed pixel minimums.
- Shared drawPendulum: `@machines/ui/drawPendulum` draws one pendulum in screen coordinates and reads its colours, font and offline opacity from the theme's CSS variables.
