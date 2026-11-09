import type { Namespace, Socket } from 'socket.io';
import {
  introductionSchema,
  machineStateSchema,
  type Introduction,
  type Result,
} from '@repo/protocol';
import { shareCollisionSetting } from './commands.ts';
import type {
  GroupRegistry,
  MachineGroup,
  RegisteredMachine,
} from './groups.ts';

export function connectMachines(machines: Namespace, registry: GroupRegistry) {
  machines.use((socket, next) => {
    const parsed = introductionSchema.safeParse(socket.handshake.auth);
    if (!parsed.success) {
      return next(new Error('Invalid machine registration.'));
    }

    next();
  });

  // The middleware has already checked it, so this just gets it typed.
  machines.on('connection', (socket) => {
    const introduction = introductionSchema.parse(socket.handshake.auth);
    const group = registry.getOrCreate(introduction.groupId);
    const entry = registerMachine(group, introduction, socket);

    observeMachine(socket, entry, group, registry);
    registry.publishMembership(group);
    shareCollisionSetting(group, socket);
  });
}

// An ID already in the group is the same machine restarting, so it replaces
// the old entry. Sim Manager hands out unique IDs, so nothing else shares one.
function registerMachine(
  group: MachineGroup,
  introduction: Introduction,
  socket: Socket,
): RegisteredMachine {
  const { id } = introduction.machine;
  const previous = group.machines.get(id);
  const entry: RegisteredMachine = { introduction, socket, state: null };

  group.machines.set(id, entry);
  previous?.socket?.disconnect(true);

  return entry;
}

function observeMachine(
  socket: Socket,
  entry: RegisteredMachine,
  group: MachineGroup,
  registry: GroupRegistry,
) {
  const { id } = entry.introduction.machine;

  function receiveState(raw: unknown) {
    const parsed = machineStateSchema.safeParse(raw);
    const currentConnection =
      group.machines.get(id) === entry && entry.socket === socket;
    if (!currentConnection || !parsed.success) return;

    entry.state = parsed.data;
  }

  function unregister(acknowledge: (result: Result) => void) {
    const currentRegistration = group.machines.get(id) === entry;
    if (currentRegistration) {
      group.machines.delete(id);
      registry.publishMembership(group);
    }

    acknowledge({ ok: true });
  }

  function disconnect() {
    const replaced = group.machines.get(id) !== entry;
    if (replaced) return;

    entry.socket = null;
    registry.publish();
  }

  socket.on('state', receiveState);
  socket.on('unregister', unregister);
  socket.on('disconnect', disconnect);
}
