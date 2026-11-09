import { z } from 'zod';
import { machinePropertiesSchema, measurementSchema } from './machine.ts';

// Messages between the machines of a group.

const envelope = {
  groupId: z.string(),
  senderId: z.string(),
};

export const peerMessageSchema = z.discriminatedUnion('type', [
  z.object({
    ...envelope,
    type: z.literal('PROPERTIES'),
    properties: machinePropertiesSchema,
  }),
  z.object({
    ...envelope,
    ...measurementSchema.shape,
    type: z.literal('POSITION_UPDATE'),
    runId: z.string(),
  }),
  z.object({
    ...envelope,
    type: z.literal('STOP'),
    runId: z.string(),
    details: z.string(),
    // The IDs of the two machines that collided.
    collision: z.array(z.string()),
  }),
  z.object({
    ...envelope,
    type: z.literal('RESTART_READY'),
    runId: z.string(),
  }),
]);
export type PeerMessage = z.infer<typeof peerMessageSchema>;
export type PositionUpdate = Extract<PeerMessage, { type: 'POSITION_UPDATE' }>;

// A message as it's written, before the envelope is added.
type WithoutEnvelope<Message> = Message extends PeerMessage
  ? Omit<Message, keyof typeof envelope>
  : never;

export type PeerPayload = WithoutEnvelope<PeerMessage>;
