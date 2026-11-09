import { join } from 'node:path';
import { z } from 'zod';
import {
  machinePropertiesSchema,
  type MachineProperties,
} from '@repo/protocol';
import { CONFIG } from '../../config.ts';
import { createJson, jsonFileNames, readJson, writeJson } from './dataFiles.ts';

export const GROUPS_DIRECTORY = join(CONFIG.DATA_DIRECTORY, 'groups');

// A smooth sphere's.
const DEFAULT_DRAG_COEFFICIENT = 0.47;

// Each member is a machine's properties, with a name if it has one. Every
// member is a pendulum, and its icon is filled in when it's launched.
const memberSchema = machinePropertiesSchema.omit({ icon: true }).extend({
  type: z.literal('pendulum').default('pendulum'),
  name: z.string().optional(),
  dragCoefficient: z.number().default(DEFAULT_DRAG_COEFFICIENT),
});

const groupSchema = z.object({
  id: z.string(),
  stopOnCollision: z.boolean().default(true),
  members: z.array(memberSchema),
});
export type Group = z.infer<typeof groupSchema>;

// The one pendulum a new group starts with.
const FIRST_PENDULUM = {
  anchor: { x: 0, y: -3 },
  length: 2,
  initialAngle: 30,
  radius: 0.15,
  mass: 1,
  dragCoefficient: DEFAULT_DRAG_COEFFICIENT,
};

// A running machine as it is now, ready to save. Only a name its group file
// gave it is kept, so the rest go on taking theirs from their number.
export interface MachineSnapshot {
  givenName: string | undefined;
  properties: MachineProperties;
}

// Read each time, since new groups can be added while Sim Manager runs.
export function readGroupNames() {
  return jsonFileNames(GROUPS_DIRECTORY);
}

// A group as it's typed, as a file name: "Pendulum party" is pendulum-party.
export function groupFileName(name: string) {
  const lettersAndSpaces = name
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9 ]/g, '');

  return lettersAndSpaces.replaceAll(/ +/g, '-');
}

export function readGroup(fileName: string): Group {
  return groupSchema.parse(readJson(groupFilePath(fileName)));
}

// Keeps the group's ID and collision setting, and replaces its members with the
// machines as they are now.
export function writeGroupMembers(
  fileName: string,
  snapshots: MachineSnapshot[],
) {
  const { id, stopOnCollision } = readGroup(fileName);
  const members = snapshots.map(groupMember);

  writeJson(groupFilePath(fileName), { id, stopOnCollision, members });
}

// A new group, named as it was typed, and the file name it was given. It
// starts with one pendulum, or with copies of a running group's machines.
export function createGroupFile(name: string, copies?: MachineSnapshot[]) {
  const fileName = groupFileName(name);
  const members = copies ? copies.map(groupMember) : [FIRST_PENDULUM];
  const group = { id: name.trim(), stopOnCollision: true, members };

  createJson(groupFilePath(fileName), group);

  return fileName;
}

function groupMember({ givenName, properties }: MachineSnapshot) {
  const { anchor, length, initialAngle, radius, mass, dragCoefficient } =
    properties;

  return {
    name: givenName,
    anchor,
    length,
    initialAngle,
    radius,
    mass,
    dragCoefficient,
  };
}

function groupFilePath(fileName: string) {
  return join(GROUPS_DIRECTORY, `${fileName}.json`);
}
