import type { Socket } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';
import { connectSocket } from '@repo/network';
import {
  IDLE_RUN_ID,
  supervisorStateSchema,
  type Result,
} from '@repo/protocol';
import { startSupervisor } from '../src/server/server.ts';

const properties = {
  type: 'pendulum' as const,
  anchor: { x: 1, y: 2 },
  length: 2,
  mass: 1,
  initialAngle: 20,
  radius: 0.14,
  dragCoefficient: 0.47,
};

// What a machine reports each tick, before it has ever run.
const reportedState = {
  runId: IDLE_RUN_ID,
  angle: 0,
  position: { x: 0, y: 0 },
  status: 'stopped',
  reason: 'Ready',
  properties,
  environment: null,
  connectedPeers: [],
  neighbours: [],
  messagesPerSecond: 0,
  stopOnCollision: true,
  collision: null,
  restartAt: null,
};

let supervisor: Awaited<ReturnType<typeof startSupervisor>>;
const sockets: Socket[] = [];

afterEach(async () => {
  for (const socket of sockets.splice(0)) {
    socket.disconnect();
  }

  await supervisor?.close();
});

async function snapshot() {
  const response = await fetch(`${supervisor.url}/api/state`);

  return supervisorStateSchema.parse(await response.json());
}

function send(path: string, body: unknown) {
  return fetch(`${supervisor.url}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function post(path: string, body: unknown) {
  const response = await send(path, body);

  return response.json() as Promise<Result>;
}

async function statusOf(path: string, body: unknown) {
  const response = await send(path, body);

  return response.status;
}

// A stand-in machine that introduces itself the way a real one does.
function connectMachine(groupId: string, id: string, port: number) {
  const socket = connectSocket(`${supervisor.url}/machines`, {
    groupId,
    machine: { id, name: id, url: `http://127.0.0.1:${port}` },
  });
  sockets.push(socket);

  return socket;
}

// Registered once the supervisor tells it who's in its group.
async function registerMachine(groupId: string, id: string, port: number) {
  const socket = connectMachine(groupId, id, port);

  await new Promise((resolve) => socket.once('membership', resolve));

  return socket;
}

// Answers every command sent on the event the same way, accepting them unless
// told otherwise, and keeps a list of them.
function recordCommands(
  socket: Socket,
  event: 'command' | 'configure',
  answer: Result = { ok: true },
) {
  const received: unknown[] = [];

  socket.on(event, (command, acknowledge: (result: Result) => void) => {
    received.push(command);
    acknowledge(answer);
  });

  return received;
}

// The supervisor learns from machines; it has no group files or device knowledge.
describe('supervisor discovery', () => {
  it('leaves machine properties unknown until the machine reports them', async () => {
    supervisor = await startSupervisor({ port: 0 });
    expect((await snapshot()).groups).toEqual([]);

    const socket = await registerMachine('factory', 'machine-01', 5101);
    expect((await snapshot()).groups[0]?.machines[0]?.state).toBeNull();

    socket.emit('state', reportedState);

    await expect
      .poll(async () => (await snapshot()).groups[0]?.machines[0]?.state)
      .toMatchObject({ properties });
  });

  it('sends a group command only to machines in that group', async () => {
    supervisor = await startSupervisor({ port: 0 });
    const first = await registerMachine('first', 'machine-01', 5101);
    const second = await registerMachine('second', 'machine-01', 5102);
    const firstCommands = recordCommands(first, 'command');
    const secondCommands = recordCommands(second, 'command');

    const result = await post('/api/groups/first/command', { type: 'STOP' });

    expect(result).toEqual({ ok: true });
    expect(firstCommands).toEqual([{ type: 'STOP' }]);
    expect(secondCommands).toEqual([]);
  });

  it('sends a machine command only to that machine', async () => {
    supervisor = await startSupervisor({ port: 0 });
    const dragged = await registerMachine('factory', 'machine-01', 5101);
    const other = await registerMachine('factory', 'machine-02', 5102);
    const draggedCommands = recordCommands(dragged, 'configure');
    const otherCommands = recordCommands(other, 'configure');

    const hold = { type: 'HOLD', changes: { length: 1 }, angle: 0.3 };
    const path = '/api/groups/factory/machines/machine-01/command';
    const result = await post(path, hold);

    expect(result).toEqual({ ok: true });
    expect(draggedCommands).toEqual([hold]);
    expect(otherCommands).toEqual([]);
  });
});

// The supervisor passes commands on, but keeps a group from being left half
// started, and from getting two commands at once.
describe('supervisor commands', () => {
  it('turns away a bad command, and a command for an unknown group', async () => {
    supervisor = await startSupervisor({ port: 0 });
    await registerMachine('factory', 'machine-01', 5101);

    const jump = { type: 'JUMP' };
    const stop = { type: 'STOP' };
    const badCommand = await statusOf('/api/groups/factory/command', jump);
    const unknownGroup = await statusOf('/api/groups/nowhere/command', stop);

    expect(badCommand).toBe(400);
    expect(unknownGroup).toBe(404);
  });

  it('stops the whole group when one machine refuses to start', async () => {
    supervisor = await startSupervisor({ port: 0 });
    const willing = await registerMachine('factory', 'machine-01', 5101);
    const refusing = await registerMachine('factory', 'machine-02', 5102);
    const refusal = { ok: false, error: 'Required peers are not ready.' };
    const willingCommands = recordCommands(willing, 'command');
    const refusingCommands = recordCommands(refusing, 'command', refusal);

    const start = { type: 'START', runId: 'run-1', resume: false };
    const status = await statusOf('/api/groups/factory/command', start);

    expect(status).toBe(409);
    expect(willingCommands).toEqual([start, { type: 'STOP' }]);
    expect(refusingCommands).toEqual([start, { type: 'STOP' }]);
  });

  it('turns away a group command while another is still going', async () => {
    supervisor = await startSupervisor({ port: 0 });
    const slow = await registerMachine('factory', 'machine-01', 5101);
    let answerFirst = () => {};
    const firstArrived = new Promise<void>((arrived) => {
      slow.on('command', (_command, acknowledge: (result: Result) => void) => {
        answerFirst = () => acknowledge({ ok: true });
        arrived();
      });
    });

    const first = post('/api/groups/factory/command', { type: 'PAUSE' });
    await firstArrived;
    const second = await post('/api/groups/factory/command', { type: 'STOP' });
    answerFirst();

    expect(second).toEqual({
      ok: false,
      error: 'Another group command is in progress.',
    });
    expect(await first).toEqual({ ok: true });
  });

  it('tells a machine that joins the collision setting its group was given', async () => {
    supervisor = await startSupervisor({ port: 0 });
    const first = await registerMachine('factory', 'machine-01', 5101);
    recordCommands(first, 'command');
    const turnOff = { type: 'SET_COLLISION_STOPPING', enabled: false };
    await post('/api/groups/factory/command', turnOff);

    const joining = connectMachine('factory', 'machine-02', 5102);
    const commands = recordCommands(joining, 'command');

    await expect.poll(() => commands).toContainEqual(turnOff);
  });

  it('starts a new group once its machines have gathered', async () => {
    supervisor = await startSupervisor({ port: 0 });
    const socket = await registerMachine('factory', 'machine-01', 5101);
    const commands = recordCommands(socket, 'command');

    socket.emit('state', reportedState);

    await expect
      .poll(() => commands, { timeout: 4000 })
      .toContainEqual(expect.objectContaining({ type: 'START' }));
  });
});
