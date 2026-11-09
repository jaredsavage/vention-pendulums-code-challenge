import { z } from 'zod';
import { machineIdentitySchema } from './identity.ts';
import { machineStateSchema } from './machine.ts';

// What the supervisor shows browsers.

// A registered machine, and what it last reported.
export const observedMachineSchema = machineIdentitySchema.extend({
  online: z.boolean(),
  state: machineStateSchema.nullable(),
});
export type ObservedMachine = z.infer<typeof observedMachineSchema>;

export const groupStateSchema = z.object({
  id: z.string(),
  machines: z.array(observedMachineSchema),
});
export type GroupState = z.infer<typeof groupStateSchema>;

export const supervisorStateSchema = z.object({
  groups: z.array(groupStateSchema),
});
export type SupervisorState = z.infer<typeof supervisorStateSchema>;
