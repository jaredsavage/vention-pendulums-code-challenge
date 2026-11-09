import {
  resultSchema,
  type Command,
  type MachineCommand,
  type Result,
} from '@repo/protocol';

// Everything the supervisor client asks of the server.
export const api = {
  openStateStream: () => new EventSource('/api/state/stream'),

  sendCommand: (groupId: string, command: Command) =>
    post(`${groupPath(groupId)}/command`, command),

  configureMachine: (
    groupId: string,
    machineId: string,
    command: MachineCommand,
  ) => post(`${machinePath(groupId, machineId)}/command`, command),
};

function groupPath(groupId: string) {
  return `/api/groups/${encodeURIComponent(groupId)}`;
}

function machinePath(groupId: string, machineId: string) {
  return `${groupPath(groupId)}/machines/${encodeURIComponent(machineId)}`;
}

async function post(path: string, body: unknown): Promise<Result> {
  try {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return resultSchema.parse(await response.json());
  } catch {
    return { ok: false, error: 'Could not reach the supervisor.' };
  }
}
