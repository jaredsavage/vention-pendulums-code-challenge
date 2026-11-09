import { z } from 'zod';
import { environmentSchema } from './environment.ts';

// What a machine is, and what it reports about itself.

// A point in the world, in metres. Positive Y points down.
export const pointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});
export type Point = z.infer<typeof pointSchema>;

// What the machine is like. Its type says which device it drives, and the
// pendulum is the only one so far.
export const machinePropertiesSchema = z.object({
  type: z.literal('pendulum'),
  anchor: pointSchema,
  length: z.number(),
  initialAngle: z.number(),
  radius: z.number(),
  mass: z.number(),
  dragCoefficient: z.number(),
  icon: z.url().optional(),
});
export type MachineProperties = z.infer<typeof machinePropertiesSchema>;

export const machinePropertiesPatchSchema = machinePropertiesSchema.partial();
export type MachinePropertiesPatch = Partial<MachineProperties>;

// How each property besides the anchor is named and measured, wherever it's
// shown.
export const PROPERTY_FIELDS = [
  { name: 'length', label: 'String length', unit: 'm' },
  { name: 'initialAngle', label: 'Initial angle', unit: '°' },
  { name: 'radius', label: 'Bob radius', unit: 'm' },
  { name: 'mass', label: 'Mass', unit: 'kg' },
  { name: 'dragCoefficient', label: 'Drag coefficient', unit: '' },
] as const;

// Where the bob is now. The angle is in radians from straight down.
export const measurementSchema = z.object({
  angle: z.number().finite(),
  position: pointSchema,
});
export type Measurement = z.infer<typeof measurementSchema>;

// After a collision, a machine waits for its peers, counts down to the
// restart, then runs again.
export const statusSchema = z.enum([
  'stopped',
  'running',
  'paused',
  'waiting-for-peers',
  'restart-countdown',
]);
export type Status = z.infer<typeof statusSchema>;

// The run a machine reports before it's first started, so others can tell
// it has never run.
export const IDLE_RUN_ID = 'idle';

// What a machine reports to the supervisor on every tick. It has no ID of its
// own: the supervisor knows who sent it from the connection it arrives on.
export const machineStateSchema = measurementSchema.extend({
  runId: z.string(),
  status: statusSchema,
  reason: z.string(),

  properties: machinePropertiesSchema,
  // Unknown for a machine that can't measure its surroundings.
  environment: environmentSchema.nullable(),

  connectedPeers: z.array(z.string()),
  neighbours: z.array(z.string()),
  // Position updates a second, from all its peers together.
  messagesPerSecond: z.number(),

  stopOnCollision: z.boolean(),
  // The two machines whose collision stopped the group, until it restarts.
  collision: z.array(z.string()).nullable(),
  // When the group restarts after a collision, in Unix milliseconds.
  restartAt: z.number().nullable(),
});
export type MachineState = z.infer<typeof machineStateSchema>;
