import { z } from 'zod';
import { machinePropertiesPatchSchema } from './machine.ts';

// Group commands go from the supervisor to every machine in a group. Machine
// commands go from the supervisor to one machine. Every request and command
// gets a result back.

export const commandSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('START'),
    runId: z.string(),
    resume: z.boolean(),
  }),
  z.object({ type: z.literal('PAUSE') }),
  z.object({ type: z.literal('STOP') }),
  z.object({ type: z.literal('RESET') }),
  z.object({
    type: z.literal('SET_COLLISION_STOPPING'),
    enabled: z.boolean(),
  }),
]);
export type Command = z.infer<typeof commandSchema>;

// A page turning a group's Edit mode on or off.
export const editingChangeSchema = z.object({ editing: z.boolean() });
export type StartCommand = Extract<Command, { type: 'START' }>;

// A machine applies the changes it's sent, and reports them in its state.
// Holding it keeps it still, at the given angle in radians if there is one,
// until it's released.
export const machineCommandSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('SET_PROPERTIES'),
    changes: machinePropertiesPatchSchema,
  }),
  z.object({
    type: z.literal('HOLD'),
    changes: machinePropertiesPatchSchema,
    angle: z.number().optional(),
  }),
  z.object({ type: z.literal('RELEASE') }),
  // Takes the machine out of its group for good, if whatever keeps its
  // settings can.
  z.object({ type: z.literal('DESTROY') }),
]);
export type MachineCommand = z.infer<typeof machineCommandSchema>;
export type HoldCommand = Extract<MachineCommand, { type: 'HOLD' }>;

export const resultSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
});
export type Result = z.infer<typeof resultSchema>;
