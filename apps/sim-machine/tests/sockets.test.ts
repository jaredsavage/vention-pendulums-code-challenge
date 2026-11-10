import { once } from 'node:events';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Socket } from 'socket.io';
import { afterEach, describe, expect, it } from 'vitest';
import { createSocketServer } from '@repo/network';
import type { MachineIdentity, Result } from '@repo/protocol';
import { Machine } from '../src/machine.ts';
import { connectSockets } from '../src/sockets.ts';
import { createState } from '../src/state.ts';
import { testGroup } from './fixtures.ts';

const GROUP = 'sockets-test';
const { machines, environment } = testGroup();

const closers: (() => Promise<unknown>)[] = [];

afterEach(async () => {
  for (const close of closers.splice(0).reverse()) {
    await close();
  }
});

async function listen(port = 0) {
  const http = createServer();
  const io = createSocketServer(http);
  http.listen(port, '127.0.0.1');
  await once(http, 'listening');

  const address = http.address() as AddressInfo;
  const url = `http://127.0.0.1:${address.port}`;

  return { io, port: address.port, url };
}

// Stands in for the supervisor: it only remembers each machine's socket, so
// the test can tell them who's in the group.
async function startSupervisor() {
  const { io, url } = await listen();
  const machineSockets = new Map<string, Socket>();

  io.of('/machines').on('connection', (socket) => {
    const { machine } = socket.handshake.auth as { machine: MachineIdentity };

    machineSockets.set(machine.id, socket);
    socket.on('unregister', (acknowledge: (result: Result) => void) =>
      acknowledge({ ok: true }),
    );
  });

  closers.push(() => io.close());

  return { url, machineSockets };
}

type Supervisor = Awaited<ReturnType<typeof startSupervisor>>;

async function startMachine(supervisor: Supervisor, index: number, port = 0) {
  const server = await listen(port);
  const { id, name, properties } = machines[index]!;
  const identity = { id, name, url: server.url };
  const definition = {
    groupId: GROUP,
    machine: { ...identity, properties },
    port: server.port,
    stopOnCollision: true,
    environment,
  };

  const machine = new Machine(createState(definition));
  const sockets = connectSockets(server.io, machine, supervisor.url);
  const close = async () => {
    await sockets.close();
    await server.io.close();
  };

  await expect.poll(() => supervisor.machineSockets.has(id)).toBe(true);
  closers.push(close);

  return { identity, machine, close, port: server.port };
}

type Started = Awaited<ReturnType<typeof startMachine>>;

// What the supervisor does when the group changes.
function introduce(supervisor: Supervisor, members: Started[]) {
  const identities = members.map(({ identity }) => identity);

  for (const { identity } of members) {
    const socket = supervisor.machineSockets.get(identity.id);
    socket?.emit('membership', { id: GROUP, machines: identities });
  }
}

function connectedPeers({ machine }: Started) {
  return machine.report.connectedPeers;
}

describe('sockets between machines', () => {
  it('connects to every peer and hears its properties', async () => {
    const supervisor = await startSupervisor();
    const a = await startMachine(supervisor, 0);
    const b = await startMachine(supervisor, 1);

    introduce(supervisor, [a, b]);

    await expect.poll(() => connectedPeers(a)).toEqual([b.identity.id]);
    await expect.poll(() => connectedPeers(b)).toEqual([a.identity.id]);
    await expect.poll(() => a.machine.neighbours).toEqual([b.identity.id]);
  });

  it('hangs up on a peer that leaves the group', async () => {
    const supervisor = await startSupervisor();
    const a = await startMachine(supervisor, 0);
    const b = await startMachine(supervisor, 1);
    introduce(supervisor, [a, b]);
    await expect.poll(() => connectedPeers(a)).toEqual([b.identity.id]);

    introduce(supervisor, [a]);

    const peerB = () => a.machine.state.peers.get(b.identity.id);
    await expect.poll(() => peerB()?.connected).toBe(false);
  });

  it('reconnects to a peer that restarts at the same address', async () => {
    const supervisor = await startSupervisor();
    const a = await startMachine(supervisor, 0);
    const b = await startMachine(supervisor, 1);
    introduce(supervisor, [a, b]);
    await expect.poll(() => connectedPeers(a)).toEqual([b.identity.id]);

    await b.close();
    await expect.poll(() => connectedPeers(a)).toEqual([]);

    const restarted = await startMachine(supervisor, 1, b.port);
    introduce(supervisor, [a, restarted]);

    await expect.poll(() => connectedPeers(a)).toEqual([b.identity.id]);
  });
});
