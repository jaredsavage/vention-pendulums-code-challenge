import type { Socket } from 'socket.io';
import type {
  GroupState,
  Introduction,
  MachineState,
  SupervisorState,
} from '@repo/protocol';

// One machine as the supervisor knows it: how it introduced itself, its
// connection while it has one, and what it last reported.
export interface RegisteredMachine {
  introduction: Introduction;
  socket: Socket | null;
  state: MachineState | null;
}

export interface Group {
  id: string;
  machines: Map<string, RegisteredMachine>;
  // A group command is waiting for its machines to answer.
  busy: boolean;
  // When a machine last joined or left.
  changedAt: number;
  autostarted: boolean;
  editing: boolean;
  // The collision setting the group was last given, for machines that join
  // later.
  stopOnCollision: boolean | null;
}

export type Groups = Map<string, Group>;

export function groupFor(groups: Groups, id: string): Group {
  const existing = groups.get(id);
  if (existing) return existing;

  const group: Group = {
    id,
    machines: new Map(),
    busy: false,
    changedAt: Date.now(),
    autostarted: false,
    editing: false,
    stopOnCollision: null,
  };
  groups.set(id, group);

  return group;
}

// Every group as browsers see it: each machine, and what it last reported.
export function supervisorState(groups: Groups): SupervisorState {
  const states = [...groups.values()].map(groupState);

  return { groups: states };
}

function groupState(group: Group): GroupState {
  const entries = [...group.machines.values()];
  const machines = entries.map(({ introduction, socket, state }) => {
    const online = socket !== null;

    return { ...introduction.machine, online, state };
  });
  const byId = machines.toSorted((first, second) =>
    first.id.localeCompare(second.id),
  );

  return { id: group.id, machines: byId, editing: group.editing };
}
