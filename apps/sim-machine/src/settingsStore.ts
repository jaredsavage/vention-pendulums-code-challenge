import type { MachineProperties } from '@repo/protocol';
import { log } from './log.ts';
import type { SettingsStore } from './machine.ts';

const REQUEST_TIMEOUT_MS = 2000;

// Settings kept at an address: the properties are saved there with PUT, and
// removed with DELETE. For a simulated machine, that's whatever launched it.
export function settingsStoreAt(url: string): SettingsStore {
  const save = (properties: MachineProperties) => {
    const body = JSON.stringify(properties);
    const headers = { 'Content-Type': 'application/json' };

    void request(url, { method: 'PUT', headers, body });
  };

  return {
    url,
    save,
    remove: () => void request(url, { method: 'DELETE' }),
  };
}

async function request(url: string, init: RequestInit) {
  try {
    const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const response = await fetch(url, { ...init, signal });

    if (!response.ok) {
      log(`its settings at ${url} were refused: ${response.status}`);
    }
  } catch {
    log(`couldn't reach its settings at ${url}`);
  }
}
