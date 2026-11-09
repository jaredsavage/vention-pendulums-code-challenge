import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { testGroup } from './fixtures.ts';
import { Pendulum } from '../src/server/pendulum.ts';

let pendulum: Pendulum;

beforeEach(() => {
  vi.useFakeTimers();
  const { machines, environment } = testGroup();
  pendulum = new Pendulum(machines[0]!.properties, environment);
});

afterEach(() => {
  pendulum.pause();
  vi.useRealTimers();
});

// Long enough for a few physics steps.
function swing() {
  vi.advanceTimersByTime(200);
}

describe('pendulum controls', () => {
  it('holds its position while paused and carries on when resumed', () => {
    pendulum.run();
    swing();
    pendulum.pause();
    const pausedAngle = pendulum.measurement.angle;

    swing();
    expect(pendulum.measurement.angle).toBe(pausedAngle);

    pendulum.run();
    swing();
    expect(pendulum.measurement.angle).not.toBe(pausedAngle);
  });

  it('moves when held, without changing where it starts', () => {
    const startingAngle = pendulum.measurement.angle;
    pendulum.run();

    pendulum.hold(0.5);
    swing();
    expect(pendulum.measurement.angle).toBe(0.5);

    pendulum.release();
    swing();
    expect(pendulum.measurement.angle).not.toBe(0.5);

    pendulum.reset();
    expect(pendulum.measurement.angle).toBe(startingAngle);
  });
});
