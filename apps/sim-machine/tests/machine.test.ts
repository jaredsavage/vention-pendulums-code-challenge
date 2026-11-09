import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FIRST_RUN,
  fromPeer,
  joinedMachine,
  own,
  peer,
  runningMachine,
} from './fixtures.ts';

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

describe('neighbours and runs', () => {
  it("only knows a neighbour's dimensions once that neighbour reports them", () => {
    const machine = joinedMachine();
    expect(machine.neighbours).toEqual([]);

    const farAway = { ...peer.properties, anchor: { x: 100, y: 0 } };
    machine.receive(fromPeer({ type: 'PROPERTIES', properties: farAway }));
    expect(machine.neighbours).toEqual([]);

    const { properties } = peer;
    machine.receive(fromPeer({ type: 'PROPERTIES', properties }));
    expect(machine.neighbours).toEqual([peer.id]);
  });

  // A measurement no physics would produce, so it can only have been passed on.
  it('passes on what its device measures, as it is', () => {
    const machine = runningMachine();
    const measurement = { angle: 0.8, position: { x: 12.5, y: -3 } };
    machine.device.measurement = measurement;

    machine.sync();

    expect(machine.state).toMatchObject(measurement);
    expect(machine.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'POSITION_UPDATE', ...measurement }),
      [peer.id],
    );
  });

  // A neighbour has a second and a half to report.
  it('pauses when a running neighbour goes quiet', () => {
    const machine = runningMachine();

    vi.advanceTimersByTime(1000);
    machine.sync();
    expect(machine.status).toBe('running');

    vi.advanceTimersByTime(1000);
    machine.sync();
    expect(machine.status).toBe('paused');
  });

  it('joins a group resume while still running, taking the new run', () => {
    const machine = runningMachine();

    machine.command({ type: 'START', runId: 'resumed-run', resume: true });

    expect(machine.status).toBe('running');
    expect(machine.state.runId).toBe('resumed-run');
  });
});

describe('being configured', () => {
  it('keeps running while dragged, and tells its peers its new size', () => {
    const machine = runningMachine();

    machine.configure({ type: 'HOLD', changes: { length: 1 }, angle: 0.3 });
    const { properties } = machine.device;

    expect(machine.status).toBe('running');
    expect(properties.length).toBe(1);
    expect(machine.broadcast).toHaveBeenCalledWith({
      type: 'PROPERTIES',
      properties,
    });
  });

  it('stays where it was left while stopped, then starts from its own start', () => {
    const machine = joinedMachine();
    const leftAt = 0.5;
    const { initialAngle } = own.properties;
    const startingAngle = (initialAngle * Math.PI) / 180;
    const { properties } = peer;

    machine.configure({ type: 'HOLD', changes: {}, angle: leftAt });
    machine.configure({ type: 'RELEASE' });

    expect(machine.state.angle).toBeCloseTo(leftAt);
    expect(machine.device.properties.initialAngle).toBe(initialAngle);

    machine.receive(fromPeer({ type: 'PROPERTIES', properties }));
    machine.command({ type: 'START', runId: FIRST_RUN, resume: false });

    expect(machine.state.angle).toBeCloseTo(startingAngle);
  });

  it('keeps where it starts when dragged while running', () => {
    const machine = runningMachine();
    const { initialAngle } = own.properties;

    machine.configure({ type: 'HOLD', changes: {}, angle: 0.5 });

    expect(machine.device.properties.initialAngle).toBe(initialAngle);
  });

  it('stops and goes back to where it starts when reset', () => {
    const machine = runningMachine();
    const { initialAngle } = own.properties;
    const startingAngle = (initialAngle * Math.PI) / 180;

    machine.configure({ type: 'HOLD', changes: {}, angle: 0.5 });
    machine.command({ type: 'RESET' });

    expect(machine.status).toBe('stopped');
    expect(machine.state.angle).toBeCloseTo(startingAngle);
  });

  it('refuses a size of zero or less, and keeps the one it had', () => {
    const machine = runningMachine();
    const result = machine.configure({
      type: 'SET_PROPERTIES',
      changes: { radius: -3.5 },
    });

    expect(result.ok).toBe(false);
    expect(machine.device.properties.radius).toBe(own.properties.radius);
  });
});
