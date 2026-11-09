import type { Point } from '@repo/protocol';
import type { Pendulum } from './types.ts';

// Pixels of slack around each target, so small ones are easy to click.
const BOB_HIT_MARGIN = 12;
const EDGE_HIT_MARGIN = 4;
const ANCHOR_HIT_RADIUS = 12;

// In order of priority: a bob's edge over the bob, and the bob over its anchor.
export const PARTS = ['edge', 'bob', 'anchor'] as const;
export type Part = (typeof PARTS)[number];

// A pendulum under the pointer, and which part we're on.
export interface Hit {
  pendulum: Pendulum;
  part: Part;
}

// Only the given parts count, so a bob's edge is just the bob when it can't be
// resized.
export function pendulumAt(
  pendulums: Pendulum[],
  point: Point,
  parts: readonly Part[],
): Hit | undefined {
  for (const pendulum of pendulums) {
    const part = partAt(pendulum, point, parts);
    if (part) return { pendulum, part };
  }

  return undefined;
}

function partAt(
  { anchor, bob, radius }: Pendulum,
  point: Point,
  parts: readonly Part[],
) {
  const fromBob = distance(bob, point);
  const touching: Record<Part, boolean> = {
    edge: Math.abs(fromBob - radius) <= EDGE_HIT_MARGIN,
    bob: fromBob <= radius + BOB_HIT_MARGIN,
    anchor: distance(anchor, point) <= ANCHOR_HIT_RADIUS,
  };

  return PARTS.find((part) => parts.includes(part) && touching[part]);
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
