import type { Environment } from '@repo/protocol';

// Everything the Sim Manager page asks of Sim Manager. Nothing waits for an
// answer: the live state shows what changed.
export const api = {
  openStateStream: () => new EventSource('/api/state/stream'),
  selectGroups: (names: string[]) => post('/api/groups', { names }),
  createGroup: (name: string, copyOf?: string) =>
    post('/api/groups/new', { name, copyOf }),
  updateGroup: (name: string) => post('/api/groups/update', { name }),
  addMachine: (name: string) => post('/api/groups/add-machine', { name }),
  endProcess: (id: string) => post('/api/processes/end', { id }),
  selectEnvironment: (name: string) => post('/api/environment', { name }),
  changeEnvironment: (changes: Partial<Environment>) =>
    post('/api/environment/values', changes),
};

function post(path: string, body: unknown) {
  void fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
