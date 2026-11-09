import type { Request, Response } from 'express';
import type { Socket } from 'socket.io';
import { EventStream } from '@repo/network';
import type {
  GroupMembers,
  GroupState,
  Introduction,
  MachineState,
  SupervisorState,
} from '@repo/protocol';

export interface RegisteredMachine {
  introduction: Introduction;
  socket: Socket | null;
  state: MachineState | null;
}

export interface MachineGroup {
  id: string;
  machines: Map<string, RegisteredMachine>;
  busy: boolean;
  // When a machine last joined or left.
  changedAt: number;
  autostarted: boolean;
  stopOnCollision: boolean | null;
}

// The group as browsers see it: each machine, and what it last reported.
export function groupSnapshot(group: MachineGroup): GroupState {
  const entries = [...group.machines.values()].sort(byMachineId);
  const machines = entries.map(({ introduction, socket, state }) => {
    const online = socket !== null;

    return { ...introduction.machine, online, state };
  });

  return { id: group.id, machines };
}

export function createGroupRegistry() {
  const groups = new Map<string, MachineGroup>();
  const browsers = new EventStream<SupervisorState>();

  function get(id: string) {
    return groups.get(id);
  }

  function all() {
    return [...groups.values()];
  }

  function getOrCreate(id: string): MachineGroup {
    const existing = groups.get(id);
    if (existing) return existing;

    const group: MachineGroup = {
      id,
      machines: new Map(),
      busy: false,
      changedAt: Date.now(),
      autostarted: false,
      stopOnCollision: null,
    };
    groups.set(id, group);

    return group;
  }

  function snapshot(): SupervisorState {
    const states = all().map(groupSnapshot);

    return { groups: states };
  }

  function publish() {
    if (browsers.hasViewers) {
      browsers.send(snapshot());
    }
  }

  function watch(request: Request, response: Response) {
    browsers.open(request, response, snapshot());
  }

  // Tells the group's machines and the browsers who's in it now. A group with
  // no machines left, such as after Sim Manager stops it, is forgotten.
  function publishMembership(group: MachineGroup) {
    group.changedAt = Date.now();

    const empty = group.machines.size === 0;
    if (empty) {
      groups.delete(group.id);
    }

    sendMembership(group);
    publish();
  }

  return { get, all, getOrCreate, snapshot, publish, watch, publishMembership };
}

export type GroupRegistry = ReturnType<typeof createGroupRegistry>;

function byMachineId(first: RegisteredMachine, second: RegisteredMachine) {
  const firstId = first.introduction.machine.id;
  const secondId = second.introduction.machine.id;

  return firstId.localeCompare(secondId);
}

// Tells each machine in the group who's in it, and how to reach them.
function sendMembership(group: MachineGroup) {
  const entries = [...group.machines.values()];
  const machines = entries.map(({ introduction }) => introduction.machine);
  const members: GroupMembers = { id: group.id, machines };

  for (const { socket } of entries) {
    socket?.emit('membership', members);
  }
}
