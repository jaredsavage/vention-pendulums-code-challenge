import type { CanvasViewport } from './viewport.ts';

// Dots fade out as they crowd together, between these spacings in pixels.
const FULL_SPACING = 16;
const HIDDEN_SPACING = 6;

// The stylesheet draws each dot 1px in from its tile's corner, so tiles start
// 1px early to put the dot on the metre.
const DOT_INSET = 1;

// The grid's the canvas background, one dot per tile and a tile per metre.
export function alignGrid(canvas: HTMLCanvasElement, viewport: CanvasViewport) {
  const { scale, origin } = viewport;
  const fade = (scale - HIDDEN_SPACING) / (FULL_SPACING - HIDDEN_SPACING);
  const opacity = Math.min(1, Math.max(0, fade));

  const tilesX = origin.x - DOT_INSET;
  const tilesY = origin.y - DOT_INSET;

  canvas.style.setProperty('--canvas-grid-spacing', `${scale}px`);
  canvas.style.setProperty('--canvas-grid-x', `${tilesX}px`);
  canvas.style.setProperty('--canvas-grid-y', `${tilesY}px`);
  canvas.style.setProperty('--canvas-grid-opacity', String(opacity));
}

export function hideGrid(canvas: HTMLCanvasElement) {
  canvas.style.removeProperty('--canvas-grid-spacing');
}
