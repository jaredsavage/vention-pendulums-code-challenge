import { randomUUID } from 'node:crypto';
import type { Namespace, Socket } from 'socket.io';
import {
  IDLE_RUN_ID,
  introductionSchema,
  machineStateSchema,
  resultSchema,
  type Command,
  type GroupMembers,
  type MachineCommand,
  type Result,
} from '@repo/protocol';
import {
  groupFor,
  type Group,
  type Groups,
  type RegisteredMachine,
} from './state.ts';

const COMMAND_TIMEOUT_MS = 2000;
// How long a new group's membership stays the same before it has gathered.
const QUIET_PERIOD_MS = 2000;

type Acknowledge = (result: Result) => void;

export function registerSockets(machines: Namespace, groups: Groups) {
  const admit = (socket: Socket, next: (error?: Error) => void) => {
    const parsed = introductionSchema.safeParse(socket.handshake.auth);
    const error = parsed.success
      ? undefined
      : new Error('Invalid machine registration.');

    next(error);
  };

  // An ID already in the group is the same machine restarting, so it replaces
  // the old entry, and only the newest connection counts.
  const connect = (socket: Socket) => {
    const introduction = introductionSchema.parse(socket.handshake.auth);
    const group = groupFor(groups, introduction.groupId);
    const { id } = introduction.machine;
    const previous = group.machines.get(id);
    const entry: RegisteredMachine = { introduction, socket, state: null };
    const isCurrent = () => group.machines.get(id) === entry;

    group.machines.set(id, entry);
    previous?.socket?.disconnect(true);

    const report = (raw: unknown) => {
      const parsed = machineStateSchema.safeParse(raw);
      if (!parsed.success || !isCurrent()) return;

      entry.state = parsed.data;
    };

    const unregister = (acknowledge: Acknowledge) => {
      if (isCurrent()) {
        group.machines.delete(id);
        announceMembership(groups, group);
      }

      acknowledge({ ok: true });
    };

    const disconnect = () => {
      if (isCurrent()) {
        entry.socket = null;
      }
    };

    // Reports and departures from this machine.
    socket.on('state', report);
    socket.on('unregister', unregister);
    socket.on('disconnect', disconnect);

    announceMembership(groups, group);
    shareCollisionSetting(group, socket);
  };

  // Machine connections.
  machines.use(admit);
  machines.on('connection', connect);
}

// One group command at a time, so machines never get two that conflict.
// Machines decide whether they can follow it. If any refuses, the group is
// stopped, so it never runs half started.
export async function sendGroupCommand(
  group: Group,
  command: Command,
): Promise<Result> {
  if (group.busy) return refuse('Another group command is in progress.');
  if (group.editing && command.type === 'START') {
    return refuse('The group is being edited.');
  }

  if (command.type === 'SET_COLLISION_STOPPING') {
    group.stopOnCollision = command.enabled;
  }

  const sockets = connectedSockets(group);
  if (sockets.length === 0) return refuse('No machines are connected.');

  group.busy = true;
  try {
    const results = await sendToAll(sockets, command);
    const failure = results.find((result) => !result.ok);
    const mustStopGroup = failure !== undefined && command.type !== 'STOP';
    if (mustStopGroup) {
      await sendToAll(sockets, { type: 'STOP' });
    }

    return failure ?? { ok: true };
  } finally {
    group.busy = false;
  }
}

// Editing starts from where each pendulum starts, so the group's reset first.
// It stays still until editing ends, whichever page asks.
export async function setEditing(
  group: Group,
  editing: boolean,
): Promise<Result> {
  if (!editing) {
    group.editing = false;

    return { ok: true };
  }

  const reset = await sendGroupCommand(group, { type: 'RESET' });
  group.editing = reset.ok;

  return reset;
}

export async function sendMachineCommand(
  group: Group,
  machineId: string,
  command: MachineCommand,
): Promise<Result> {
  const socket = group.machines.get(machineId)?.socket;
  if (!socket) return refuse('That machine is not connected.');

  return send(socket, 'configure', command);
}

// Starts each new group once it has gathered: no machine has joined or left
// for a quiet period, and every machine is online and has never run.
export function startGatheredGroups(groups: Groups) {
  for (const group of groups.values()) {
    if (hasGathered(group)) {
      const runId = randomUUID();

      group.autostarted = true;
      void sendGroupCommand(group, { type: 'START', runId, resume: false });
    }
  }
}

// Tells the group's machines who's in it now. A group with no machines left,
// such as after Sim Manager stops it, is forgotten.
function announceMembership(groups: Groups, group: Group) {
  const entries = [...group.machines.values()];
  const machines = entries.map(({ introduction }) => introduction.machine);
  const members: GroupMembers = { id: group.id, machines };

  group.changedAt = Date.now();
  if (entries.length === 0) {
    groups.delete(group.id);
  }

  for (const { socket } of entries) {
    socket?.emit('membership', members);
  }
}

// A machine that joins after the group's collision setting changed hasn't
// heard it yet. Nothing waits on its answer.
function shareCollisionSetting(group: Group, socket: Socket) {
  const enabled = group.stopOnCollision;
  if (enabled === null) return;

  void send(socket, 'command', { type: 'SET_COLLISION_STOPPING', enabled });
}

function hasGathered(group: Group) {
  const unchangedFor = Date.now() - group.changedAt;
  const quiet = unchangedFor >= QUIET_PERIOD_MS;
  const machines = [...group.machines.values()];
  const allFresh = machines.length > 0 && machines.every(isFresh);

  const free = !group.autostarted && !group.busy && !group.editing;

  return free && quiet && allFresh;
}

// Online, stopped, and never run.
function isFresh({ socket, state }: RegisteredMachine) {
  const neverRun = state?.status === 'stopped' && state.runId === IDLE_RUN_ID;

  return socket !== null && neverRun;
}

function connectedSockets(group: Group) {
  const entries = [...group.machines.values()];

  return entries.flatMap(({ socket }) => (socket ? [socket] : []));
}

function sendToAll(sockets: Socket[], command: Command) {
  return Promise.all(sockets.map((socket) => send(socket, 'command', command)));
}

// A machine that doesn't answer in time counts as refusing.
async function send(
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
    return refuse('A machine did not acknowledge the command.');
  }
}

function refuse(error: string): Result {
  return { ok: false, error };
}
