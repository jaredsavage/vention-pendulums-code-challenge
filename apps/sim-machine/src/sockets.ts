import type { Server } from 'socket.io';
import type { Socket } from 'socket.io-client';
import { connectSocket } from '@repo/network';
import {
  commandSchema,
  groupMembersSchema,
  machineCommandSchema,
  peerMessageSchema,
  type MachineIdentity,
  type PeerPayload,
  type Result,
} from '@repo/protocol';
import { log } from './log.ts';
import type { Machine } from './machine.ts';

const UNREGISTER_TIMEOUT_MS = 2000;

type Acknowledge = (result: Result) => void;

export type MachineSockets = ReturnType<typeof connectSockets>;

// Each machine opens a connection to the supervisor and an outgoing connection
// to each peer. Peer messages arrive through separate incoming connections.
export function connectSockets(
  io: Server,
  machine: Machine,
  supervisorUrl: string,
) {
  const { identity, group } = machine.state;
  const introduction = { groupId: group.id, machine: identity };
  const supervisor = connectSocket(`${supervisorUrl}/machines`, introduction);
  const peers = new Map<string, Socket>();

  // Positions can be dropped when a connection is busy; nothing else can.
  const send = (payload: PeerPayload, recipients = [...peers.keys()]) => {
    const message = { ...payload, senderId: identity.id, groupId: group.id };
    const droppable = message.type === 'POSITION_UPDATE';

    for (const id of recipients) {
      const socket = peers.get(id);
      const sender = droppable ? socket?.volatile : socket;

      sender?.emit('message', message);
    }
  };

  const connectTo = ({ id, url }: MachineIdentity) => {
    const socket = connectSocket(`${url}/peers`, introduction);

    socket.on('connect', () => {
      log(`${id} connected`);
      machine.peerConnected(id);
    });

    socket.on('disconnect', () => {
      log(`${id} disconnected`);
      machine.peerDisconnected(id);
    });

    peers.set(id, socket);
  };

  // Hangs up on machines that left, and connects to ones that joined.
  const joinGroup = (raw: unknown) => {
    const parsed = groupMembersSchema.safeParse(raw);
    if (!parsed.success) return;

    const members = parsed.data.machines;
    const memberIds = members.map(({ id }) => id);
    log(`group now has ${members.length} machines`);
    machine.updateMembership(parsed.data);

    for (const [id, socket] of peers) {
      if (!memberIds.includes(id)) {
        socket.disconnect();
        peers.delete(id);
      }
    }

    for (const member of members) {
      const isNew = member.id !== identity.id && !peers.has(member.id);
      if (isNew) {
        connectTo(member);
      }
    }
  };

  const command = (raw: unknown, acknowledge: Acknowledge) => {
    const parsed = commandSchema.safeParse(raw);
    if (!parsed.success) {
      acknowledge({ ok: false, error: 'Invalid command.' });

      return;
    }

    log(`supervisor sent ${parsed.data.type}`);
    acknowledge(machine.command(parsed.data));
  };

  const configure = (raw: unknown, acknowledge: Acknowledge) => {
    const parsed = machineCommandSchema.safeParse(raw);
    if (!parsed.success) {
      acknowledge({ ok: false, error: 'Invalid machine command.' });

      return;
    }

    // Drag updates arrive many times a second and would flood the log.
    if (parsed.data.type !== 'HOLD') {
      log(`supervisor sent ${parsed.data.type}`);
    }

    acknowledge(machine.configure(parsed.data));
  };

  const peerMessage = (raw: unknown) => {
    const parsed = peerMessageSchema.safeParse(raw);
    if (!parsed.success) return;

    const message = parsed.data;
    if (message.type !== 'POSITION_UPDATE') {
      log(`${message.senderId} sent ${message.type}`);
    }

    machine.receive(message);
  };

  const publishState = () => {
    supervisor.volatile.emit('state', machine.report);
  };

  // Leaves the group, unless the supervisor has already gone.
  const close = async () => {
    for (const socket of peers.values()) {
      socket.disconnect();
    }

    try {
      await supervisor.timeout(UNREGISTER_TIMEOUT_MS).emitWithAck('unregister');
    } catch {
      // The supervisor may have gone in the meantime.
    }

    supervisor.disconnect();
  };

  // Group membership and commands from the supervisor.
  supervisor.on('membership', joinGroup);
  supervisor.on('command', command);
  supervisor.on('configure', configure);

  // What peers send on their own sockets.
  io.of('/peers').on('connection', (socket) => {
    socket.on('message', peerMessage);
  });

  machine.send = send;

  return {
    publishState,
    close,
    supervisorUrl,
    get supervisorConnected() {
      return supervisor.connected;
    },
  };
}
