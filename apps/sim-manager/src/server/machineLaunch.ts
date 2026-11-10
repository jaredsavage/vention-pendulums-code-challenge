import { spawn } from 'node:child_process';
import { basename } from 'node:path';
import type { Environment } from '@repo/protocol';
import { CONFIG } from '../../config.ts';
import type { MachineProcess } from '../state.ts';
import { findIcon, type Group, type GroupMember } from './files.ts';

// How one machine process is set up, started, and asked things.

const MACHINE_HOST = '127.0.0.1';
const REQUEST_TIMEOUT_MS = 2000;

// Each machine is its own process, started with the same Node executable as
// Sim Manager: node.exe on Windows.
const MACHINE_RUNTIME = process.execPath;
const MACHINE_RUNTIME_NAME = basename(MACHINE_RUNTIME);

// A member to launch, and where it is in its group file.
export interface PlacedMember extends GroupMember {
  memberIndex: number;
}

interface Launch {
  groupFile: string;
  group: Group;
  member: PlacedMember;
  number: number;
  environment: Environment;
}

export type MachineDefinition = ReturnType<typeof machineDefinition>;

// What the machine is told when it starts, and how it shows on the page until
// it's started and answering.
export function prepareLaunch(launch: Launch) {
  const definition = machineDefinition(launch);
  const machine = launchedProcess(definition, launch);

  return { definition, machine };
}

// The IPC channel closes when this process dies, however it dies.
export function spawnMachine(definition: MachineDefinition) {
  const processVariables = {
    ...process.env,
    SUPERVISOR_URL: CONFIG.SUPERVISOR_URL,
    MACHINE_DEFINITION: JSON.stringify(definition),
  };

  return spawn(MACHINE_RUNTIME, [CONFIG.MACHINE_PROGRAM], {
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    env: processVariables,
    windowsHide: true,
  });
}

export async function isHealthy(url: string) {
  try {
    const response = await askMachine(url, '/api/health');

    return response.ok;
  } catch {
    return false;
  }
}

// Every request to a machine gives up after a while.
export function askMachine(url: string, path: string, init?: RequestInit) {
  const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);

  return fetch(`${url}${path}`, { ...init, signal });
}

function machineDefinition({
  groupFile,
  group,
  member,
  number,
  environment,
}: Launch) {
  const { id, name, port, url } = numberedMachine(number, member.givenName);
  const iconFile = findIcon(groupFile, name);
  const icon = iconFile && `${url}/icon.svg`;
  const properties = { ...member.properties, icon };
  const settingsUrl = `${CONFIG.URL}/api/machines/${id}/settings`;

  return {
    number,
    groupId: group.id,
    machine: { id, name, url, properties },
    port,
    stopOnCollision: group.stopOnCollision,
    environment,
    iconFile,
    settingsUrl,
  };
}

function launchedProcess(
  { number, groupId, machine }: MachineDefinition,
  { groupFile, member }: Launch,
): MachineProcess {
  const { id, name, url, properties } = machine;

  return {
    id,
    number,
    groupFile,
    memberIndex: member.memberIndex,
    groupId,
    name,
    url,
    program: MACHINE_RUNTIME_NAME,
    pid: null,
    online: false,
    properties,
  };
}

// Machine 3 is pendulum-03 on the third port, named "Pendulum 03" unless its
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
