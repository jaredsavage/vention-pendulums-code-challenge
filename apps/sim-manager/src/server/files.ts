import {
  existsSync,
  globSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';
import stringify from 'json-stringify-pretty-compact';
import { z } from 'zod';
import {
  environmentSchema,
  machinePropertiesSchema,
  type MachineProperties,
} from '@repo/protocol';
import { CONFIG } from '../../config.ts';

// Everything Sim Manager keeps on disk: group files and environments.

const GROUPS_DIRECTORY = join(CONFIG.DATA_DIRECTORY, 'groups');
const ENVIRONMENTS_DIRECTORY = join(CONFIG.DATA_DIRECTORY, 'environments');

// Drag coefficient for a smooth sphere.
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

// Preserve names supplied in the group file. Unnamed machines get numbered
// names at launch.
export interface GroupMember {
  givenName: string | undefined;
  properties: MachineProperties;
}

export const environmentNames = jsonFileNames(ENVIRONMENTS_DIRECTORY);

export function readEnvironment(name: string) {
  const path = join(ENVIRONMENTS_DIRECTORY, `${name}.json`);

  return environmentSchema.parse(readJson(path));
}

// Read each time, since new groups can be added while Sim Manager runs.
export function readSavedGroups() {
  const files = jsonFileNames(GROUPS_DIRECTORY);

  return files.map((file) => ({ file, id: readGroup(file).id }));
}

// A group as it's typed, as a file name: "Lachine - Two" is lachine-two.
export function groupFileName(name: string) {
  const lettersAndGaps = name.toLowerCase().replaceAll(/[^a-z0-9 -]/g, '');
  const words = lettersAndGaps.split(/[ -]+/).filter(Boolean);

  return words.join('-');
}

export function readGroup(fileName: string): Group {
  return groupSchema.parse(readJson(groupPath(fileName)));
}

// A group's entries, in their order in its file.
export function readMembers(fileName: string): GroupMember[] {
  const { members } = readGroup(fileName);

  return members.map(({ name, ...properties }) => ({
    givenName: name,
    properties,
  }));
}

// A group's file, and its folder of icons if it has one.
export function deleteGroupFile(fileName: string) {
  rmSync(groupPath(fileName));
  rmSync(iconFolder(fileName), { recursive: true, force: true });
}

// Rename the group file and move its icon folder. Existing files aren't overwritten.
export function renameGroupFile(fileName: string, name: string) {
  const newFileName = groupFileName(name);
  const { stopOnCollision } = readGroup(fileName);
  const members = readMembers(fileName).map(writtenMember);
  const group = { id: name.trim(), stopOnCollision, members };

  writeFileSync(groupPath(newFileName), jsonText(group), { flag: 'wx' });
  rmSync(groupPath(fileName));
  if (existsSync(iconFolder(fileName))) {
    renameSync(iconFolder(fileName), iconFolder(newFileName));
  }

  return newFileName;
}

// Keeps the group's ID and collision setting, and replaces its members.
export function writeGroupMembers(fileName: string, members: GroupMember[]) {
  const { id, stopOnCollision } = readGroup(fileName);
  const group = { id, stopOnCollision, members: members.map(writtenMember) };

  writeFileSync(groupPath(fileName), jsonText(group));
}

// A new group, named as it was typed, and the file name it was given. It
// starts with one pendulum, or with the members of another group's file.
// It never replaces a file that's there already.
export function createGroupFile(name: string, duplicateOf?: string) {
  const fileName = groupFileName(name);
  const members = duplicateOf
    ? readMembers(duplicateOf).map(writtenMember)
    : [FIRST_PENDULUM];
  const stopOnCollision = duplicateOf
    ? readGroup(duplicateOf).stopOnCollision
    : true;
  const group = { id: name.trim(), stopOnCollision, members };

  writeFileSync(groupPath(fileName), jsonText(group), { flag: 'wx' });

  return fileName;
}

// A group's icons sit in a folder named after its file: solar-system/earth.svg.
export function findIcon(groupFile: string, machineName: string) {
  const iconName = `${machineName.toLowerCase().replaceAll(' ', '-')}.svg`;
  const iconFile = join(iconFolder(groupFile), iconName);

  return existsSync(iconFile) ? iconFile : undefined;
}

// Runtime icon URLs aren't stored in group files.
function writtenMember({ givenName, properties }: GroupMember) {
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

function groupPath(fileName: string) {
  return join(GROUPS_DIRECTORY, `${fileName}.json`);
}

function iconFolder(fileName: string) {
  return join(GROUPS_DIRECTORY, fileName);
}

// Sorted without the extension, so hand-test comes before hand-test-copy.
function jsonFileNames(directory: string) {
  return globSync('*.json', { cwd: directory })
    .map((fileName) => basename(fileName, '.json'))
    .sort();
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// Laid out like the hand-written files: short objects like anchors on one line,
// with the spaces inside their braces that Prettier expects.
function jsonText(value: object) {
  const compact = stringify(value);
  const oneLineObject = /\{([^{}\n]+)\}/g;
  const spaced = compact.replace(oneLineObject, '{ $1 }');

  return `${spaced}\n`;
}
