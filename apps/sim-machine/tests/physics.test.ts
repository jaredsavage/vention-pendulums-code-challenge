import { describe, expect, it } from 'vitest';
import { testGroup } from './fixtures.ts';
import { advanceMotion, type Motion } from '../src/server/physics.ts';

const { machines, environment } = testGroup();
const properties = machines[0]!.properties;
const stepSeconds = 1 / 60;

// Check the physical relationships, rather than copying the integration maths.
describe('pendulum physics', () => {
  it('swings back towards vertical under gravity, regardless of mass', () => {
    const tilted: Motion = { angle: 0.5, angularVelocity: 0 };
    const vacuum = { ...environment, airDensity: 0 };
    const heavierBob = { ...properties, mass: properties.mass * 2 };

    const next = advanceMotion(tilted, properties, vacuum, stepSeconds);
    const heavierNext = advanceMotion(tilted, heavierBob, vacuum, stepSeconds);

    expect(next.angularVelocity).toBeLessThan(0);
    expect(heavierNext).toEqual(next);
  });

  it('pushes a resting pendulum in the direction of the wind', () => {
    const resting: Motion = { angle: 0, angularVelocity: 0 };
    const rightWind = {
      ...environment,
      gravity: 0,
      windSpeed: 5,
      windDirection: 0,
    };
    const leftWind = { ...rightWind, windDirection: 180 };

    const right = advanceMotion(resting, properties, rightWind, stepSeconds);
    const left = advanceMotion(resting, properties, leftWind, stepSeconds);

    expect(right.angularVelocity).toBeGreaterThan(0);
    expect(left.angularVelocity).toBeLessThan(0);
  });

  it('slows down faster in air than in a vacuum', () => {
    const swinging: Motion = { angle: 0, angularVelocity: 2 };
    const vacuum = { ...environment, airDensity: 0 };

    const inAir = advanceMotion(swinging, properties, environment, stepSeconds);
    const inVacuum = advanceMotion(swinging, properties, vacuum, stepSeconds);

    expect(inAir.angularVelocity).toBeLessThan(inVacuum.angularVelocity);
  });
});
