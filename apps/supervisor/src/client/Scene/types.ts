import type { Point } from '@repo/protocol';

// In metres when given to the scene, and in pixels once it's on screen.
export interface Pendulum {
  id: string;
  anchor: Point;
  bob: Point;
  length: number;
  radius: number;
  number?: number;
  icon?: string;
  selected?: boolean;
  offline?: boolean;
  // Air velocity at the bob, in metres per second even on screen. Left out, or
  // zero, when there's no wind.
  wind?: Point;
}

// The ids of two pendulums to join with a line.
export type Link = [string, string];
