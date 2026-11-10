import { z } from 'zod';
import {
  IDLE_RUN_ID,
  environmentSchema,
  machineIdentitySchema,
  machinePropertiesSchema,
  type Environment,
  type GroupMembers,
  type MachineIdentity,
  type MachineProperties,
  type Point,
  type Status,
} from '@repo/protocol';
import { initialMotion, type Motion } from './physics.ts';

// What a simulated machine is told when it starts, as JSON in
// MACHINE_DEFINITION.
export const definitionSchema = z.object({
  groupId: z.string(),
  machine: machineIdentitySchema.extend({
    properties: machinePropertiesSchema,
  }),
  port: z.number(),
  stopOnCollision: z.boolean(),
  environment: environmentSchema,
  // A file to serve at the address in the machine's icon property.
  iconFile: z.string().optional(),
  // Where its settings are kept. Without one, saving does nothing.
  settingsUrl: z.url().optional(),
});
export type Definition = z.infer<typeof definitionSchema>;

// What this machine has heard from one peer.
export interface Peer {
  connected: boolean;
  properties: MachineProperties | null;
  position: Point | null;
  lastHeard: number;
  positionCount: number;
  updateHz: number;
}

// Everything this machine knows, in one place.
export interface State {
  identity: MachineIdentity;
  group: GroupMembers;

  // Its pendulum.
  properties: MachineProperties;
  environment: Environment;
  motion: Motion;
  held: boolean;

  // Its run, and recovering from a collision.
  runId: string;
  status: Status;
  reason: string;
  stopOnCollision: boolean;
  collision: string[] | null;
  ready: Set<string>;
  restartAt: number | null;

  // Its peers, and how often they report.
  peers: Map<string, Peer>;
  messagesPerSecond: number;
  measuredAt: number;
}

export function createState(definition: Definition): State {
  const { groupId, machine, environment, stopOnCollision } = definition;
  const { id, name, url, properties } = machine;
  const identity = { id, name, url };
  const now = Date.now();

  return {
    identity,
    group: { id: groupId, machines: [identity] },

    properties,
    environment,
    motion: initialMotion(properties),
    held: false,

    runId: IDLE_RUN_ID,
    status: 'stopped',
    reason: 'Ready',
    stopOnCollision,
    collision: null,
    ready: new Set(),
    restartAt: null,

    peers: new Map(),
    messagesPerSecond: 0,
    measuredAt: now,
  };
}

export function newPeer(): Peer {
  return {
    connected: false,
    properties: null,
    position: null,
    lastHeard: Date.now(),
    positionCount: 0,
    updateHz: 0,
  };
}
