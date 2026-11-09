import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Environment, MachineProperties } from '@repo/protocol';
import { CONFIG } from '../../config.ts';
import { GROUPS_DIRECTORY, readGroup, type Group } from './groupFiles.ts';

const MACHINE_HOST = '127.0.0.1';

export type MachineDefinition = ReturnType<typeof machineDefinition>;

// A machine to launch: its number, the name its group file gave it if any,
// and how it's set up.
export interface NumberedMember {
  number: number;
  givenName: string | undefined;
  properties: Omit<MachineProperties, 'icon'>;
}

// Each machine takes its own number, which sets its name, ID and port. Numbers
// run across everything that's running, so groups never clash.
export function readGroupMachines(
  fileName: string,
  environment: Environment,
  takeNumber: () => number,
) {
  const group = readGroup(fileName);

  return group.members.map(({ name, ...properties }) => {
    const number = takeNumber();
    const member = { number, givenName: name, properties };

    return machineDefinition(fileName, group, member, environment);
  });
}

// One more machine for a running group.
export function addedMachine(
  fileName: string,
  member: NumberedMember,
  environment: Environment,
) {
  const group = readGroup(fileName);

  return machineDefinition(fileName, group, member, environment);
}

// Machine 3 is pendulum-03 on the third port, named "Pendulum 03" unless the
// group file gives it a name.
export function numberedMachine(number: number, givenName: string | undefined) {
  const label = String(number).padStart(2, '0');
  const port = CONFIG.MACHINE_PORT_START + number - 1;

  return {
    id: `pendulum-${label}`,
    name: givenName ?? `Pendulum ${label}`,
    port,
    url: `http://${MACHINE_HOST}:${port}`,
  };
}

// Everything a machine is launched with.
function machineDefinition(
  fileName: string,
  group: Group,
  member: NumberedMember,
  environment: Environment,
) {
  const { number, givenName, properties } = member;
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
}

// A group's icons sit in a folder named after its file: solar-system/earth.svg.
function findIcon(groupFile: string, machineName: string) {
  const iconName = `${machineName.toLowerCase().replaceAll(' ', '-')}.svg`;
  const iconFile = join(GROUPS_DIRECTORY, groupFile, iconName);

  return existsSync(iconFile) ? iconFile : undefined;
}
