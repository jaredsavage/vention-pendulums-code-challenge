import { existsSync, globSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { z } from 'zod';
import {
  environmentSchema,
  machinePropertiesSchema,
  type Environment,
} from '@repo/protocol';
import { CONFIG } from '../../config.ts';

const GROUPS_DIRECTORY = join(CONFIG.DATA_DIRECTORY, 'groups');
const ENVIRONMENTS_DIRECTORY = join(CONFIG.DATA_DIRECTORY, 'environments');
const MACHINE_HOST = '127.0.0.1';
// A smooth sphere's.
const DEFAULT_DRAG_COEFFICIENT = 0.47;

// Each member is a machine's properties, with a name if it has one. Every
// member is a pendulum, and its icon is filled in when it's read.
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

export const groupNames = jsonFileNames(GROUPS_DIRECTORY);
export const environmentNames = jsonFileNames(ENVIRONMENTS_DIRECTORY);

type MachineDefinitions = ReturnType<typeof readGroupMachines>;
export type MachineDefinition = MachineDefinitions[number];

export function readEnvironment(name: string) {
  const path = join(ENVIRONMENTS_DIRECTORY, `${name}.json`);

  return environmentSchema.parse(readJson(path));
}

// Each machine takes its own number, which sets its name, ID and port. Numbers
// run across everything that's running, so groups never clash.
export function readGroupMachines(
  fileName: string,
  environment: Environment,
  takeNumber: () => number,
) {
  const path = join(GROUPS_DIRECTORY, `${fileName}.json`);
  const group = groupSchema.parse(readJson(path));

  return group.members.map(({ name: givenName, ...properties }) => {
    const number = takeNumber();
    const { id, name, port, url } = numberedMachine(number, givenName);
    const iconFile = findIcon(fileName, name);
    const icon = iconFile && `${url}/icon.svg`;
    const machineProperties = { ...properties, icon };

    return {
      number,
      groupId: group.id,
      machine: { id, name, url, properties: machineProperties },
      port,
      stopOnCollision: group.stopOnCollision,
      environment,
      iconFile,
    };
  });
}

// Machine 3 is pendulum-03 on the third port, named "Pendulum 03" unless the
// group file gives it a name.
function numberedMachine(number: number, givenName: string | undefined) {
  const label = String(number).padStart(2, '0');
  const port = CONFIG.MACHINE_PORT_START + number - 1;

  return {
    id: `pendulum-${label}`,
    name: givenName ?? `Pendulum ${label}`,
    port,
    url: `http://${MACHINE_HOST}:${port}`,
  };
}

// A group's icons sit in a folder named after its file: solar-system/earth.svg.
function findIcon(groupFile: string, machineName: string) {
  const iconName = `${machineName.toLowerCase().replaceAll(' ', '-')}.svg`;
  const iconFile = join(GROUPS_DIRECTORY, groupFile, iconName);

  return existsSync(iconFile) ? iconFile : undefined;
}

function jsonFileNames(directory: string) {
  return globSync('*.json', { cwd: directory })
    .sort()
    .map((fileName) => basename(fileName, '.json'));
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}
