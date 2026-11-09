import { useLayoutEffect, useRef } from 'react';
import type { Point } from '@repo/protocol';
import type { Pendulum } from './types.ts';

// In ms. Never zero, since positionAt divides by it.
const SHORTEST_DURATION = 1;

// Each report starts an interpolation from the bob's last reported position to
// the new one, over the time the new one took to arrive, so the bob moves
// smoothly between reports.
interface Interpolation {
  from: Point;
  to: Point;
  startedAt: number;
  duration: number;
}

// Returns a function that gives the pendulums partway along their
// interpolations at any moment.
export function useInterpolation(pendulums: Pendulum[]) {
  const interpolations = useRef(new Map<string, Interpolation>());

  useLayoutEffect(() => {
    const now = performance.now();

    interpolations.current = startInterpolations(
      interpolations.current,
      pendulums,
      now,
    );
  }, [pendulums]);

  return (now: number) => pendulumsAt(pendulums, interpolations.current, now);
}

function startInterpolations(
  previous: Map<string, Interpolation>,
  pendulums: Pendulum[],
  now: number,
) {
  const interpolations = pendulums.map(({ id, bob }) => {
    const interpolation = nextInterpolation(previous.get(id), bob, now);

    return [id, interpolation] as const;
  });

  return new Map(interpolations);
}

function pendulumsAt(
  pendulums: Pendulum[],
  interpolations: Map<string, Interpolation>,
  now: number,
) {
  return pendulums.map((pendulum) => {
    const interpolation = interpolations.get(pendulum.id);
    const bob = interpolation ? positionAt(interpolation, now) : pendulum.bob;

    return { ...pendulum, bob };
  });
}

function nextInterpolation(
  previous: Interpolation | undefined,
  to: Point,
  now: number,
): Interpolation {
  if (!previous) {
    return { from: to, to, startedAt: now, duration: SHORTEST_DURATION };
  }

  const duration = Math.max(SHORTEST_DURATION, now - previous.startedAt);

  return { from: previous.to, to, startedAt: now, duration };
}

function positionAt(
  { from, to, startedAt, duration }: Interpolation,
  now: number,
) {
  const progress = (now - startedAt) / duration;
  const fraction = Math.min(1, Math.max(0, progress));

  return {
    x: from.x + (to.x - from.x) * fraction,
    y: from.y + (to.y - from.y) * fraction,
  };
}
