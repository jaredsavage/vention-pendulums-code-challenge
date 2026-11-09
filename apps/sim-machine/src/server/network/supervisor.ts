import type { Socket } from 'socket.io-client';
import { connectSocket } from '@repo/network';
import {
  commandSchema,
  groupMembersSchema,
  machineCommandSchema,
  type Introduction,
  type MachineState,
  type Result,
} from '@repo/protocol';
import { log } from '../log.ts';
import type { Machine } from '../machine.ts';
import type { PeerConnections } from './peerConnections.ts';

const UNREGISTER_TIMEOUT_MS = 2000;

type Acknowledge = (result: Result) => void;

// This machine's link to its supervisor.
export interface SupervisorStatus {
  url: string;
  connected: boolean;
}

export class SupervisorConnection {
  private readonly url: string;
  private readonly socket: Socket;

  constructor(
    url: string,
    introduction: Introduction,
    machine: Machine,
    peers: PeerConnections,
  ) {
    this.url = url;
    this.socket = connectSocket(`${url}/machines`, introduction);
    this.listen(machine, peers);
  }

  get status(): SupervisorStatus {
    return { url: this.url, connected: this.socket.connected };
  }

  publishState(state: MachineState) {
    this.socket.volatile.emit('state', state);
  }

  // Leaves the group, unless the supervisor has already gone.
  async close() {
    const { socket } = this;

    if (socket.connected) {
      try {
        await socket.timeout(UNREGISTER_TIMEOUT_MS).emitWithAck('unregister');
      } catch {
        // The supervisor may have gone in the meantime, and that's fine.
      }
    }

    socket.disconnect();
  }

  private listen(machine: Machine, peers: PeerConnections) {
    function joinGroup(raw: unknown) {
      const members = groupMembersSchema.safeParse(raw);
      if (!members.success) return;

      const { machines } = members.data;

      log(`group now has ${machines.length} machines`);
      machine.updateMembership(members.data);
      peers.setMembers(machines);
    }

    function followCommand(raw: unknown, acknowledge: Acknowledge) {
      const command = commandSchema.safeParse(raw);
      if (!command.success) {
        acknowledge({ ok: false, error: 'Invalid command.' });

        return;
      }

      log(`supervisor sent ${command.data.type}`);
      acknowledge(machine.command(command.data));
    }

    // A drag sends HOLD many times a second, which would flood the log.
    function configure(raw: unknown, acknowledge: Acknowledge) {
      const command = machineCommandSchema.safeParse(raw);
      if (!command.success) {
        acknowledge({ ok: false, error: 'Invalid machine command.' });

        return;
      }

      if (command.data.type !== 'HOLD') {
        log(`supervisor sent ${command.data.type}`);
      }

      acknowledge(machine.configure(command.data));
    }

    this.socket.on('membership', joinGroup);
    this.socket.on('command', followCommand);
    this.socket.on('configure', configure);
  }
}
