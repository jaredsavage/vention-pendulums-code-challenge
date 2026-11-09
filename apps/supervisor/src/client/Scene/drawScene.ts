import { canvasStyle } from './canvasStyle.ts';
import { drawLinks } from './drawLinks.ts';
import { drawPendulum } from './drawPendulum.ts';
import { drawScaleBar } from './drawScaleBar.ts';
import { drawWind } from './drawWind.ts';
import { alignGrid, hideGrid } from './grid.ts';
import { resizeCanvasForScreen } from './resizeCanvasForScreen.ts';
import type { Link, Pendulum } from './types.ts';
import { viewportFor, type View } from './view.ts';
import { toScreen, type CanvasViewport, type Inset } from './viewport.ts';

interface Frame {
  pendulums: Pendulum[];
  links: Link[];
  now: number;
  view: View;
  inset: Inset;
  blueprint: boolean;
}

// The frame as it was drawn, in pixels, for working with pointer events
export interface Drawn {
  pendulums: Pendulum[];
  viewport: CanvasViewport;
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  { pendulums, links, now, view, inset, blueprint }: Frame,
): Drawn | null {
  const size = resizeCanvasForScreen(ctx);
  ctx.clearRect(0, 0, size.width, size.height);

  if (pendulums.length === 0) {
    hideGrid(ctx.canvas);

    return null;
  }

  // Fitted to where the pendulums are, so the view moves with them.
  const viewport = viewportFor(pendulums, size, inset, view);
  const onScreen = pendulums.map((pendulum) => toScreen(pendulum, viewport));
  const background = blueprint ? canvasStyle.blueprint : canvasStyle.background;

  // Back to front, so the bobs pass over the links and the wind.
  alignGrid(ctx.canvas, viewport);
  drawLinks(ctx, onScreen, links);

  // A blueprint is still, so no wind.
  if (!blueprint) {
    drawWind(ctx, onScreen, now);
  }

  for (const pendulum of onScreen) {
    drawPendulum(ctx, pendulum, background);
  }

  drawScaleBar(ctx, viewport.scale, size.height);

  return { pendulums: onScreen, viewport };
}
