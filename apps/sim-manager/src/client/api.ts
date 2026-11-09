import type { Environment } from '@repo/protocol';

// Everything the Sim Manager page asks of Sim Manager. Nothing waits for an
// answer: the live state shows what changed.
export const api = {
  openStateStream: () => new EventSource('/api/state/stream'),
  selectGroups: (names: string[]) => post('/api/groups', { names }),
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
