import { z } from 'zod';
import { environmentSchema, machinePropertiesSchema } from '@repo/protocol';

// A machine process Sim Manager started: its group file, which entry in that
// file it is, and the properties it last sent.
export const machineProcessSchema = z.object({
  id: z.string(),
  number: z.number(),
  groupFile: z.string(),
  memberIndex: z.number(),
  groupId: z.string(),
  name: z.string(),
  url: z.url(),
  program: z.string(),
  pid: z.number().nullable(),
  online: z.boolean(),
  properties: machinePropertiesSchema,
});
export type MachineProcess = z.infer<typeof machineProcessSchema>;

// A group file, and the ID of the group it saves.
export const savedGroupSchema = z.object({ file: z.string(), id: z.string() });
export type SavedGroup = z.infer<typeof savedGroupSchema>;

export const simManagerStateSchema = z.object({
  supervisorUrl: z.url(),
  groups: z.array(savedGroupSchema),
  selectedGroups: z.array(z.string()),
  environments: z.array(z.string()),
  environment: z.string(),
  environmentValues: environmentSchema,
  processes: z.array(machineProcessSchema),
});
export type SimManagerState = z.infer<typeof simManagerStateSchema>;
