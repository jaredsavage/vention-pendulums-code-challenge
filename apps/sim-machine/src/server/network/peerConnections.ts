import { EventEmitter } from 'node:events';
import type { Socket as ClientSocket } from 'socket.io-client';
import type { Namespace, Socket as ServerSocket } from 'socket.io';
import { connectSocket } from '@repo/network';
import {
  introductionSchema,
  peerMessageSchema,
  type Introduction,
  type MachineIdentity,
  type PeerMessage,
  type PeerPayload,
} from '@repo/protocol';

type PeerSocket = ClientSocket | ServerSocket;

// What the machine hears from its peers.
interface PeerEvents {
  message: [message: PeerMessage];
  connected: [peerId: string];
  disconnected: [peerId: string];
  connectionsChanged: [peerIds: string[]];
}

// Every pair of machines shares one socket: the machine with the lower ID
// calls the higher one, then both ends send and listen on it.
//
// Not handled: a peer that moves to a new address mid-run, and a message that
// claims to come from a different machine.
export class PeerConnections extends EventEmitter<PeerEvents> {
  private readonly introduction: Introduction;
  private readonly sockets = new Map<string, PeerSocket>();
  private readonly calls = new Map<string, ClientSocket>();
  private members: MachineIdentity[] = [];

  constructor(namespace: Namespace, introduction: Introduction) {
    super();
    this.introduction = introduction;
    this.answerCalls(namespace);
  }

  setMembers(members: MachineIdentity[]) {
    this.members = members;

    this.hangUpOnLeavers();
    this.callNewMembers();
    this.reportConnections();
  }

  // Skip positions when the connection is busy; keep control messages.
  broadcast(payload: PeerPayload, recipients?: string[]) {
    const message = this.envelope(payload);
    const skippable = message.type === 'POSITION_UPDATE';
    const peerIds = recipients ?? [...this.sockets.keys()];

    for (const peerId of peerIds) {
      const socket = this.sockets.get(peerId);
      const sender = skippable ? socket?.volatile : socket;

      sender?.emit('message', message);
    }
  }

  close() {
    for (const socket of [...this.calls.values(), ...this.sockets.values()]) {
      socket.disconnect();
    }
  }

  private answerCalls(namespace: Namespace) {
    const admit = (socket: ServerSocket, next: (error?: Error) => void) => {
      const caller = introductionSchema.safeParse(socket.handshake.auth);

      next(caller.success ? undefined : new Error('Invalid introduction.'));
    };

    const onConnection = (socket: ServerSocket) => {
      const { machine } = introductionSchema.parse(socket.handshake.auth);

      this.listen(machine.id, socket);
      this.add(machine.id, socket);
    };

    namespace.use(admit);
    namespace.on('connection', onConnection);
  }

  private callNewMembers() {
    const ownId = this.introduction.machine.id;

    for (const { id, url } of this.members) {
      const weCall = id > ownId && !this.calls.has(id);
      if (weCall) {
        const socket = connectSocket(`${url}/peers`, this.introduction);

        this.calls.set(id, socket);
        this.listen(id, socket);
        socket.on('connect', () => this.add(id, socket));
      }
    }
  }

  private hangUpOnLeavers() {
    for (const [peerId, socket] of this.calls) {
      const left = !this.members.some(({ id }) => id === peerId);
      if (left) {
        this.calls.delete(peerId);
        socket.disconnect();
      }
    }
  }

  private add(peerId: string, socket: PeerSocket) {
    this.sockets.set(peerId, socket);
    this.reportConnections();
    this.emit('connected', peerId);
  }

  // A peer that restarts calls again on a new socket, so only the newest one
  // counts.
  private listen(peerId: string, socket: PeerSocket) {
    const onMessage = (raw: unknown) => {
      const message = peerMessageSchema.safeParse(raw);
      if (message.success) {
        this.emit('message', message.data);
      }
    };

    const onDisconnect = () => {
      const replaced = this.sockets.get(peerId) !== socket;
      if (replaced) return;

      this.sockets.delete(peerId);
      this.reportConnections();
      this.emit('disconnected', peerId);
    };

    socket.on('message', onMessage);
    socket.on('disconnect', onDisconnect);
  }

  private reportConnections() {
    const connected = this.members
      .map(({ id }) => id)
      .filter((id) => this.sockets.has(id));

    this.emit('connectionsChanged', connected.sort());
  }

  private envelope(payload: PeerPayload): PeerMessage {
    const { machine, groupId } = this.introduction;

    return { ...payload, senderId: machine.id, groupId };
  }
}
