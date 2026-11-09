import { z } from 'zod';
import {
  environmentSchema,
  machinePropertiesSchema,
  machineIdentitySchema,
} from '@repo/protocol';

// Everything a simulated machine is told when it starts, as JSON in
// MACHINE_DEFINITION.
export const machineDefinitionSchema = z.object({
  groupId: z.string(),
  machine: machineIdentitySchema.extend({
    properties: machinePropertiesSchema,
  }),
  port: z.number(),
  stopOnCollision: z.boolean(),
  environment: environmentSchema,
  // A file to serve at the address in the machine's icon property.
  iconFile: z.string().optional(),
});
export type MachineDefinition = z.infer<typeof machineDefinitionSchema>;

export function parseMachineDefinition(json: string | undefined) {
  if (!json) {
    throw new Error('MACHINE_DEFINITION is not set.');
  }

  return machineDefinitionSchema.parse(JSON.parse(json));
}
