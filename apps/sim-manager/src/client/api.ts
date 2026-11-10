import { resultSchema, type Environment, type Result } from '@repo/protocol';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Everything the Sim Manager page asks of Sim Manager. Each answer says whether
// it was accepted; the live state shows what changed.
export const api = {
  openStateStream: () => new EventSource('/api/state/stream'),
  selectGroups: (groupFiles: string[]) => post('/api/groups', { groupFiles }),
  createGroup: (name: string, duplicateOf?: string) =>
    post('/api/groups/new', { name, duplicateOf }),
  renameGroup: (groupFile: string, name: string) =>
    post('/api/groups/rename', { groupFile, name }),
  deleteGroup: (groupFile: string) => post('/api/groups/delete', { groupFile }),
  reloadGroups: () => post('/api/groups/reload', {}),
  addMachine: (groupFile: string) =>
    post('/api/groups/add-machine', { groupFile }),
  endProcess: (id: string) => post('/api/processes/end', { id }),
  // The same as deleting it from the dashboard: its settings, and it, are gone.
  deleteMachine: (id: string) =>
    send(`/api/machines/${encodeURIComponent(id)}/settings`, {
      method: 'DELETE',
    }),
  selectEnvironment: (name: string) => post('/api/environment', { name }),
  changeEnvironment: (changes: Partial<Environment>) =>
    post('/api/environment/values', changes),
};

function post(path: string, body: unknown) {
  const init = {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };

  return send(path, init);
}

async function send(path: string, init: RequestInit): Promise<Result> {
  try {
    const response = await fetch(path, init);

    return resultSchema.parse(await response.json());
  } catch {
    return { ok: false, error: 'Could not reach Sim Manager.' };
  }
}
