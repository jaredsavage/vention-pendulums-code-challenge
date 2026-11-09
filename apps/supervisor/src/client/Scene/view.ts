import type { Point } from '@repo/protocol';
import type { Pendulum } from './types.ts';
import {
  fitToSize,
  type CanvasViewport,
  type Inset,
  type Size,
} from './viewport.ts';

// How far someone has zoomed and panned, on top of the view that fits
// everything. Offset is in metres from the middle of that view, so the same
// place stays in the middle when the scene changes size.
export interface View {
  zoom: number;
  offset: Point;
}

export const HOME_VIEW: View = { zoom: 1, offset: { x: 0, y: 0 } };

// Fits the pendulums to the space, then zooms and pans on top of that.
export function viewportFor(
  pendulums: Pendulum[],
  size: Size,
  inset: Inset,
  view: View,
) {
  const fitted = fitToSize(pendulums, size, inset);

  return applyView(fitted, view, size);
}

// The fitted origin moves away from the middle as we zoom, then over as we pan.
export function applyView(
  fitted: CanvasViewport,
  { zoom, offset }: View,
  { width, height }: Size,
): CanvasViewport {
  const scale = fitted.scale * zoom;
  const middle = { x: width / 2, y: height / 2 };

  const fromMiddle = {
    x: (fitted.origin.x - middle.x) * zoom,
    y: (fitted.origin.y - middle.y) * zoom,
  };
  const pan = { x: offset.x * scale, y: offset.y * scale };
  const origin = {
    x: middle.x + fromMiddle.x - pan.x,
    y: middle.y + fromMiddle.y - pan.y,
  };

  return { scale, origin };
}

// The move is in pixels, at the scene's current scale.
export function pannedBy({ zoom, offset }: View, move: Point, scale: number) {
  return {
    zoom,
    offset: { x: offset.x - move.x / scale, y: offset.y - move.y / scale },
  };
}

// Whatever is under the point stays under it. The point is in pixels from the
// middle of the scene.
export function zoomedAt(
  { zoom, offset }: View,
  point: Point,
  factor: number,
  scale: number,
) {
  // How far the point is from the middle in metres, now and after zooming.
  const current = { x: point.x / scale, y: point.y / scale };
  const next = { x: current.x / factor, y: current.y / factor };

  return {
    zoom: zoom * factor,
    offset: {
      x: offset.x + current.x - next.x,
      y: offset.y + current.y - next.y,
    },
  };
}
