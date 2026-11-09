import { once } from 'node:events';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSocketServer } from '@repo/network';
import type { MachineIdentity } from '@repo/protocol';
import { PeerConnections } from '../src/server/network/peerConnections.ts';

const GROUP = 'peers-test';

const closers: (() => unknown)[] = [];

afterEach(async () => {
  for (const close of closers.splice(0).reverse()) {
    await close();
  }
});

// One machine's peer connections on a real socket, with no machine behind
// them. They remember who's connected and who disconnected.
async function startMachine(id: string) {
  const http = createServer();
  const io = createSocketServer(http);
  http.listen(0, '127.0.0.1');
  await once(http, 'listening');

  const { port } = http.address() as AddressInfo;
  const identity = { id, name: id, url: `http://127.0.0.1:${port}` };
  const introduction = { groupId: GROUP, machine: identity };

  const peers = new PeerConnections(io.of('/peers'), introduction);
  const connected: { peerIds: string[] } = { peerIds: [] };
  const disconnected = vi.fn();

  peers.on('connectionsChanged', (peerIds) => (connected.peerIds = peerIds));
  peers.on('disconnected', disconnected);

  closers.push(async () => {
    peers.close();
    await io.close();
  });

  return { identity, introduction, peers, connected, disconnected };
}

type Started = Awaited<ReturnType<typeof startMachine>>;

// What the supervisor does when it tells a machine who's in its group.
function introduce({ peers }: Started, members: Started[]) {
  const identities: MachineIdentity[] = members.map(({ identity }) => identity);

  peers.setMembers(identities);
}

// Introduces the machines to each other, and waits until they're all connected.
async function formGroup(...members: Started[]) {
  for (const member of members) {
    introduce(member, members);
  }

  const peerCount = members.length - 1;
  for (const member of members) {
    await expect.poll(() => connectedPeers(member)).toHaveLength(peerCount);
  }
}

function connectedPeers({ connected }: Started) {
  return connected.peerIds;
}

describe('peer connections', () => {
  it('connects even when the group reaches each machine at a different time', async () => {
    const a = await startMachine('a');
    const b = await startMachine('b');

    introduce(a, [a, b]);
    await expect.poll(() => connectedPeers(a)).toEqual(['b']);
    expect(connectedPeers(b)).toEqual([]);

    introduce(b, [a, b]);
    expect(connectedPeers(b)).toEqual(['a']);
  });

  it('keeps a connection open while the group is briefly small', async () => {
    const a = await startMachine('a');
    const b = await startMachine('b');
    await formGroup(a, b);

    introduce(b, [b]);
    introduce(b, [a, b]);

    expect(connectedPeers(b)).toEqual(['a']);
    expect(a.disconnected).not.toHaveBeenCalled();
  });

  it('forgets a peer that leaves the group', async () => {
    const a = await startMachine('a');
    const b = await startMachine('b');
    await formGroup(a, b);

    introduce(a, [a]);
    introduce(b, [b]);

    await expect.poll(() => b.disconnected).toHaveBeenCalledWith('a');
  });

  it("keeps a restarted peer's new connection when its old one closes", async () => {
    const original = await startMachine('a');
    const b = await startMachine('b');
    await formGroup(original, b);

    const restarted = await startMachine('a');
    introduce(restarted, [restarted, b]);
    await expect.poll(() => connectedPeers(restarted)).toEqual(['b']);

    original.peers.close();
    await sleep(100);

    expect(connectedPeers(b)).toEqual(['a']);
  });
});
