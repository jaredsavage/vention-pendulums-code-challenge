import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextRunId } from '../src/machine.ts';
import {
  FIRST_RUN,
  collide,
  fromPeer,
  own,
  peer,
  runningMachine,
} from './fixtures.ts';

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

// The first machine to see a collision stops the group. Once every machine
// has stopped, they all restart together five seconds later.
describe('collision recovery', () => {
  it("stops the group on the tick a neighbour's bob reaches its own", () => {
    const machine = runningMachine();

    collide(machine);

    expect(machine.state.status).toBe('waiting-for-peers');
    expect(machine.send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'STOP' }),
    );
  });

  it('waits for everyone, then waits five seconds before restarting', () => {
    const machine = runningMachine();
    collide(machine);

    machine.receive(fromPeer({ type: 'RESTART_READY', runId: FIRST_RUN }));
    expect(machine.state.status).toBe('restart-countdown');

    vi.advanceTimersByTime(4999);
    machine.tick();
    expect(machine.state.status).toBe('restart-countdown');

    vi.advanceTimersByTime(1);
    machine.tick();
    expect(machine.state.status).toBe('running');
    expect(machine.state.runId).not.toBe(FIRST_RUN);
  });

  it('lets a manual Stop cancel an automatic restart', () => {
    const machine = runningMachine();
    collide(machine);

    machine.command({ type: 'STOP' });
    machine.receive(fromPeer({ type: 'RESTART_READY', runId: FIRST_RUN }));
    vi.advanceTimersByTime(10000);
    machine.tick();

    expect(machine.state.status).toBe('stopped');
  });

  it('carries on through a collision when collision stopping is off', () => {
    const machine = runningMachine();
    machine.command({ type: 'SET_COLLISION_STOPPING', enabled: false });

    collide(machine);

    expect(machine.state.status).toBe('running');
  });

  it('ignores a stop meant for an earlier run', () => {
    const machine = runningMachine();
    const earlierRun = 'earlier-run';
    const collision = [own.id, peer.id];

    machine.receive(
      fromPeer({ type: 'STOP', runId: earlierRun, details: 'Hit', collision }),
    );

    expect(machine.state.status).toBe('running');
  });

  // Each machine counts down on its own, so a peer can restart and stop again
  // before this one has restarted at all.
  it('starts before its countdown ends when a peer restarts, and hears it stop', () => {
    const machine = runningMachine();
    collide(machine);
    machine.receive(fromPeer({ type: 'RESTART_READY', runId: FIRST_RUN }));

    expect(machine.state.status).toBe('restart-countdown');

    const nextRun = nextRunId(FIRST_RUN);
    const elsewhere = { x: 10, y: 0 };
    machine.receive(
      fromPeer({
        type: 'POSITION_UPDATE',
        runId: nextRun,
        angle: 0,
        position: elsewhere,
      }),
    );

    expect(machine.state.status).toBe('running');
    expect(machine.state.runId).toBe(nextRun);
    expect(machine.state.restartAt).toBeNull();

    const startingAngle = machine.report.angle;
    machine.swing(0.1);
    expect(machine.report.angle).not.toBe(startingAngle);

    const collision = [peer.id, own.id];
    machine.receive(
      fromPeer({ type: 'STOP', runId: nextRun, details: 'Hit', collision }),
    );

    expect(machine.state.runId).toBe(nextRun);
    expect(machine.state.status).toBe('waiting-for-peers');
  });
});
