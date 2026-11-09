# T054: A bare shared theme with a metre grid

- **Ticket Author:** GPT-6.1 Sol, DeepSeek V4.1 Flash 1017, Claude Opus 5.5
- **Resolver:** GPT-6.1 Sol, DeepSeek V4.1 Flash 1017, Claude Opus 5.5

Every page uses one plain theme from `packages/ui`, with a dotted canvas grid where adjacent dots are one metre apart.

## How it got there

- Simplify the interface: Replace decorative styling and copy with a minimal Tailwind and shadcn/ui interface focused on the simulation, controls, and settings.
- Minimal UI: Reduce UI styling and markup to the minimum needed for the controls, canvas, requested machine cards, and settings.
- Monochrome presentation: Render the client with a black background and white UI and scene elements, removing the per-machine colour treatment.
- Shared UI theme: `@machines/ui` exports `themes/default.css`, and the style guide's stylesheet and sample page moved there from `StyleGuide/`.
- Shared dotted canvas background: Added a shared CSS radial-gradient grid for all canvases, with 1 cm spacing and 20% foreground dots.
- Metre-scaled canvas grid: Both canvases use a shared grid function to set CSS spacing and origin from their world-to-screen scale.
