import type { MachineProperties, Point } from '@repo/protocol';

export interface Bob {
  position: Point;
  radius: number;
}

// Whether two pendulums could ever touch, wherever they swing, with the
// threshold as slack. Those that could are neighbours.
export function couldCollide(
  first: MachineProperties,
  second: MachineProperties,
  threshold: number,
) {
  const anchorDistance = distance(first.anchor, second.anchor);
  const firstReach = first.length + first.radius;
  const secondReach = second.length + second.radius;
  const reachable = firstReach + secondReach + threshold;

  return anchorDistance <= reachable;
}

// The space between two bob surfaces, or zero once they touch.
export function surfaceGap(first: Bob, second: Bob) {
  const separation = distance(first.position, second.position);
  const radii = first.radius + second.radius;

  return Math.max(0, separation - radii);
}

function distance(from: Point, to: Point) {
  return Math.hypot(from.x - to.x, from.y - to.y);
}
