import { z } from 'zod';
import { environmentSchema } from '@repo/protocol';

// A machine process Sim Manager started, and which group file it came from.
export const machineProcessSchema = z.object({
  id: z.string(),
  number: z.number(),
  groupFile: z.string(),
  groupId: z.string(),
  name: z.string(),
  url: z.url(),
  program: z.string(),
  pid: z.number().nullable(),
  online: z.boolean(),
});
export type MachineProcess = z.infer<typeof machineProcessSchema>;

export const simManagerStateSchema = z.object({
  supervisorUrl: z.url(),
  groups: z.array(z.string()),
  selectedGroups: z.array(z.string()),
  environments: z.array(z.string()),
  environment: z.string(),
  environmentValues: environmentSchema,
  processes: z.array(machineProcessSchema),
});
export type SimManagerState = z.infer<typeof simManagerStateSchema>;
