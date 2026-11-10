import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { everyStep } from '../src/fixedSteps.ts';

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

describe('fixed steps', () => {
  it('steps through the time that passed, the same size every time', () => {
    const step = vi.fn();
    const stop = everyStep(10, step);

    vi.advanceTimersByTime(1000);
    stop();

    const tenEqualSteps = Array.from({ length: 10 }, () => [0.1]);

    expect(step.mock.calls).toEqual(tenEqualSteps);
  });

  // A stalled process shouldn't come back and race through everything it missed.
  it('catches up only a little after a stall', () => {
    const step = vi.fn();
    const stop = everyStep(10, step);

    vi.setSystemTime(Date.now() + 5000);
    vi.advanceTimersByTime(100);
    stop();

    expect(step.mock.calls.length).toBeLessThanOrEqual(3);
  });
});
