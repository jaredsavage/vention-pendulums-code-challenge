import type { Socket } from 'socket.io';
import {
  resultSchema,
  type Command,
  type MachineCommand,
  type Result,
} from '@repo/protocol';
import type { MachineGroup, GroupRegistry } from './groups.ts';

const COMMAND_TIMEOUT_MS = 2000;

// One command at a time per group, so machines never receive two that conflict.
export async function dispatchExclusively(
  group: MachineGroup,
  command: Command,
  registry: GroupRegistry,
): Promise<Result> {
  if (group.busy) {
    return { ok: false, error: 'Another group command is in progress.' };
  }

  group.busy = true;
  try {
    return await dispatchCommand(group, command, registry);
  } finally {
    group.busy = false;
  }
}

// Machines decide whether they can follow a command; the supervisor only passes
// it on. If any machine refuses, the group is stopped so it never runs half
// started.
async function dispatchCommand(
  group: MachineGroup,
  command: Command,
  registry: GroupRegistry,
): Promise<Result> {
  if (command.type === 'SET_COLLISION_STOPPING') {
    group.stopOnCollision = command.enabled;
  }

  const sockets = [...group.machines.values()].flatMap(({ socket }) =>
    socket ? [socket] : [],
  );
  if (sockets.length === 0) {
    return { ok: false, error: 'No machines are connected.' };
  }

  const results = await Promise.all(
    sockets.map((socket) => sendCommand(socket, 'command', command)),
  );
  const failure = results.find((result) => !result.ok);
  const mustStopGroup = failure !== undefined && command.type !== 'STOP';
  if (mustStopGroup) {
    const stopCommands = sockets.map((socket) =>
      sendCommand(socket, 'command', { type: 'STOP' }),
    );
    await Promise.allSettled(stopCommands);
  }

  registry.publish();

  return failure ?? { ok: true };
}

// A machine command goes to one machine, and doesn't wait behind the group's
// commands, so a drag stays smooth.
export async function configureMachine(
  group: MachineGroup,
  machineId: string,
  command: MachineCommand,
): Promise<Result> {
  const socket = group.machines.get(machineId)?.socket;
  if (!socket) {
    return { ok: false, error: 'That machine is not connected.' };
  }

  return sendCommand(socket, 'configure', command);
}

// A machine that joins after the group's collision setting changed hasn't
// heard it yet. Nothing waits on its answer.
export function shareCollisionSetting(group: MachineGroup, socket: Socket) {
  const enabled = group.stopOnCollision;
  if (enabled === null) return;

  void sendCommand(socket, 'command', {
    type: 'SET_COLLISION_STOPPING',
    enabled,
  });
}

async function sendCommand(
  socket: Socket,
  event: 'command' | 'configure',
  command: Command | MachineCommand,
): Promise<Result> {
  try {
    const raw: unknown = await socket
      .timeout(COMMAND_TIMEOUT_MS)
      .emitWithAck(event, command);

    return resultSchema.parse(raw);
  } catch {
    return { ok: false, error: 'A machine did not acknowledge the command.' };
  }
}
