import { z } from 'zod';

// Who a machine is, and where to reach it.
export const machineIdentitySchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.url(),
});
export type MachineIdentity = z.infer<typeof machineIdentitySchema>;

// Who's in a group. The supervisor sends it to every machine in the group
// whenever someone joins or leaves.
export const groupMembersSchema = z.object({
  id: z.string(),
  machines: z.array(machineIdentitySchema),
});
export type GroupMembers = z.infer<typeof groupMembersSchema>;

// What a machine says when it connects, to the supervisor or to a peer.
export const introductionSchema = z.object({
  groupId: z.string(),
  machine: machineIdentitySchema,
});
export type Introduction = z.infer<typeof introductionSchema>;
