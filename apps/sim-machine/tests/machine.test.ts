import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FIRST_RUN,
  fromPeer,
  introducedMachine,
  joinedMachine,
  own,
  peer,
  runningMachine,
} from './fixtures.ts';
import type { Machine } from '../src/machine.ts';

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

// Long enough for the pendulum to move.
function swing(machine: Machine) {
  machine.swing(0.2);
}

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

  it('tells its neighbours where its pendulum is', () => {
    const machine = runningMachine();
    machine.configure({ type: 'HOLD', changes: {}, angle: 0.8 });

    machine.tick();
    const { angle, position } = machine.report;

    expect(angle).toBe(0.8);
    expect(machine.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'POSITION_UPDATE', angle, position }),
      [peer.id],
    );
  });

  // A neighbour has a second and a half to report.
  it('pauses when a running neighbour goes quiet', () => {
    const machine = runningMachine();

    vi.advanceTimersByTime(1000);
    machine.tick();
    expect(machine.state.status).toBe('running');

    vi.advanceTimersByTime(1000);
    machine.tick();
    expect(machine.state.status).toBe('paused');
  });

  // It can hear a peer before its own connection to that peer is up, and
  // couldn't tell it anything yet.
  it("won't start until its own connection to each peer is up", () => {
    const machine = introducedMachine();
    const { properties } = peer;

    machine.receive(fromPeer({ type: 'PROPERTIES', properties }));
    const result = machine.command({
      type: 'START',
      runId: FIRST_RUN,
      resume: false,
    });
    expect(result.ok).toBe(false);

    machine.peerConnected(peer.id);
    const retried = machine.command({
      type: 'START',
      runId: FIRST_RUN,
      resume: false,
    });
    expect(retried.ok).toBe(true);
  });

  it('joins a group resume while still running, taking the new run', () => {
    const machine = runningMachine();

    machine.command({ type: 'START', runId: 'resumed-run', resume: true });

    expect(machine.state.status).toBe('running');
    expect(machine.state.runId).toBe('resumed-run');
  });

  it('joins a group resume while stopped, from its starting angle', () => {
    const machine = joinedMachine();
    const { initialAngle } = own.properties;
    const startingAngle = (initialAngle * Math.PI) / 180;
    const { properties } = peer;

    machine.receive(fromPeer({ type: 'PROPERTIES', properties }));
    machine.command({ type: 'START', runId: 'resumed-run', resume: true });

    expect(machine.state.status).toBe('running');
    expect(machine.state.runId).toBe('resumed-run');
    expect(machine.report.angle).toBeCloseTo(startingAngle);
  });
});

describe('its pendulum', () => {
  it('holds still while paused, and swings on when resumed', () => {
    const machine = runningMachine();
    swing(machine);

    machine.command({ type: 'PAUSE' });
    const pausedAngle = machine.report.angle;
    swing(machine);
    expect(machine.report.angle).toBe(pausedAngle);

    machine.command({ type: 'START', runId: FIRST_RUN, resume: true });
    swing(machine);
    expect(machine.report.angle).not.toBe(pausedAngle);
  });

  it('stays where it is held, and swings from there once let go', () => {
    const machine = runningMachine();

    machine.configure({ type: 'HOLD', changes: {}, angle: 0.5 });
    swing(machine);
    expect(machine.report.angle).toBe(0.5);

    machine.configure({ type: 'RELEASE' });
    swing(machine);
    expect(machine.report.angle).not.toBe(0.5);
  });
});

describe('being configured', () => {
  it('keeps running while dragged, and tells its peers its new size', () => {
    const machine = runningMachine();

    machine.configure({ type: 'HOLD', changes: { length: 1 }, angle: 0.3 });
    const { properties } = machine.state;

    expect(machine.state.status).toBe('running');
    expect(properties.length).toBe(1);
    expect(machine.send).toHaveBeenCalledWith({
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

    expect(machine.report.angle).toBeCloseTo(leftAt);
    expect(machine.state.properties.initialAngle).toBe(initialAngle);

    machine.receive(fromPeer({ type: 'PROPERTIES', properties }));
    machine.command({ type: 'START', runId: FIRST_RUN, resume: false });

    expect(machine.report.angle).toBeCloseTo(startingAngle);
  });

  it('keeps where it starts when dragged while running', () => {
    const machine = runningMachine();
    const { initialAngle } = own.properties;

    machine.configure({ type: 'HOLD', changes: {}, angle: 0.5 });

    expect(machine.state.properties.initialAngle).toBe(initialAngle);
  });

  it('stops and goes back to where it starts when reset', () => {
    const machine = runningMachine();
    const { initialAngle } = own.properties;
    const startingAngle = (initialAngle * Math.PI) / 180;

    machine.configure({ type: 'HOLD', changes: {}, angle: 0.5 });
    machine.command({ type: 'RESET' });

    expect(machine.state.status).toBe('stopped');
    expect(machine.report.angle).toBeCloseTo(startingAngle);
  });

  it('refuses a size of zero or less, and keeps the one it had', () => {
    const machine = runningMachine();
    const result = machine.configure({
      type: 'SET_PROPERTIES',
      changes: { radius: -3.5 },
    });

    expect(result.ok).toBe(false);
    expect(machine.state.properties.radius).toBe(own.properties.radius);
  });
});

const SETTINGS_URL = 'http://127.0.0.1:4050/api/machines/pendulum-01/settings';

describe('its settings', () => {
  it('keeps them whenever its properties change, not when it is only swung', () => {
    const machine = runningMachine();
    const settings = { url: SETTINGS_URL, save: vi.fn(), remove: vi.fn() };
    machine.settings = settings;

    machine.configure({ type: 'HOLD', changes: {}, angle: 0.3 });
    expect(settings.save).not.toHaveBeenCalled();

    machine.configure({ type: 'SET_PROPERTIES', changes: { length: 1 } });
    expect(settings.save).toHaveBeenCalledOnce();
  });

  it('can only be destroyed when something keeps its settings', () => {
    const machine = runningMachine();
    const settings = { url: SETTINGS_URL, save: vi.fn(), remove: vi.fn() };

    expect(machine.configure({ type: 'DESTROY' }).ok).toBe(false);

    machine.settings = settings;
    expect(machine.configure({ type: 'DESTROY' }).ok).toBe(true);
    expect(settings.remove).toHaveBeenCalledOnce();
  });
});
