import type { Point } from '@repo/protocol';
import type { Pendulum } from './types.ts';

// Metres of room around the pendulums, enough on top for the link arcs.
const PADDING = 0.5;

export interface Size {
  width: number;
  height: number;
}

// Pixels per metre, and where the world's origin lands on screen.
export interface CanvasViewport {
  scale: number;
  origin: Point;
}

// Pixels at the top and bottom that the page's own UI sits over.
export interface Inset {
  top: number;
  bottom: number;
}

export const NO_INSET: Inset = { top: 0, bottom: 0 };

// Fits every pendulum's whole swing into the space clear of the page's UI, and
// puts the middle of the scene in the middle of that space.
export function fitToSize(
  pendulums: Pendulum[],
  size: Size,
  inset: Inset,
): CanvasViewport {
  const bounds = sceneBounds(pendulums);

  // A hidden scene has no height, and must not end up with a negative one.
  const clearHeight = Math.max(0, size.height - inset.top - inset.bottom);
  const scale = Math.min(
    size.width / bounds.width,
    clearHeight / bounds.height,
  );

  const screenMiddle = { x: size.width / 2, y: inset.top + clearHeight / 2 };
  const origin = {
    x: screenMiddle.x - bounds.middle.x * scale,
    y: screenMiddle.y - bounds.middle.y * scale,
  };

  return { scale, origin };
}

// The space the pendulums can swing through, in metres. The anchors stay
// centred, however far one long string reaches to a side.
function sceneBounds(pendulums: Pendulum[]) {
  const middleX = anchorsMiddleX(pendulums);
  const sideReach = furthestReachFrom(middleX, pendulums) + PADDING;
  const width = sideReach * 2;

  const top = highestAnchorY(pendulums) - PADDING;
  const bottom = lowestReachY(pendulums) + PADDING;
  const height = bottom - top;
  const middleY = (top + bottom) / 2;

  return { middle: { x: middleX, y: middleY }, width, height };
}

// Halfway between the outermost anchors.
function anchorsMiddleX(pendulums: Pendulum[]) {
  const anchorXs = pendulums.map(({ anchor }) => anchor.x);
  const minAnchorX = Math.min(...anchorXs);
  const maxAnchorX = Math.max(...anchorXs);

  return (minAnchorX + maxAnchorX) / 2;
}

// How far to either side of x any bob can swing.
function furthestReachFrom(x: number, pendulums: Pendulum[]) {
  const reaches = pendulums.map(
    (pendulum) => Math.abs(pendulum.anchor.x - x) + reach(pendulum),
  );

  return Math.max(...reaches);
}

// The y axis points down, so the highest is the smallest.
function highestAnchorY(pendulums: Pendulum[]) {
  const anchorYs = pendulums.map(({ anchor }) => anchor.y);

  return Math.min(...anchorYs);
}

// As low as any bob can hang.
function lowestReachY(pendulums: Pendulum[]) {
  const lowestPoints = pendulums.map(
    (pendulum) => pendulum.anchor.y + reach(pendulum),
  );

  return Math.max(...lowestPoints);
}

// How far from its anchor the pendulum can reach, to the far edge of its bob.
function reach({ length, radius }: Pendulum) {
  return length + radius;
}

// The pendulum as it's drawn, in pixels.
export function toScreen(
  pendulum: Pendulum,
  viewport: CanvasViewport,
): Pendulum {
  const anchor = pointToScreen(pendulum.anchor, viewport);
  const bob = pointToScreen(pendulum.bob, viewport);
  const length = pendulum.length * viewport.scale;
  const radius = pendulum.radius * viewport.scale;

  return { ...pendulum, anchor, bob, length, radius };
}

// Where a point in the world is on screen, in pixels.
function pointToScreen(point: Point, { scale, origin }: CanvasViewport) {
  return {
    x: origin.x + point.x * scale,
    y: origin.y + point.y * scale,
  };
}

// Where a point on screen is in the world, in metres.
export function pointToWorld(point: Point, { scale, origin }: CanvasViewport) {
  return {
    x: (point.x - origin.x) / scale,
    y: (point.y - origin.y) / scale,
  };
}
