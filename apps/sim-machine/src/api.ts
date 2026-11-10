import type { Express, Request, Response } from 'express';
import { environmentPatchSchema } from '@repo/protocol';
import { CONFIG } from '../config.ts';
import { recentLog } from './log.ts';
import type { Machine } from './machine.ts';
import type { MachineSockets } from './sockets.ts';

interface ApiOptions {
  iconFile: string | undefined;
  shutdown: () => void;
}

export function registerApi(
  app: Express,
  machine: Machine,
  sockets: MachineSockets,
  { iconFile, shutdown }: ApiOptions,
) {
  const { state } = machine;

  // Both pages are refreshed by hand, so they hold still while they're read.
  // They're JSON for anything that reads them, laid out for people too.
  const showStatus = (_request: Request, response: Response) => {
    const json = JSON.stringify(status(machine, sockets), null, 2);

    response.type('json').send(json);
  };

  const showLog = (_request: Request, response: Response) => {
    const json = JSON.stringify(recentLog(), null, 2);

    response.type('json').send(json);
  };

  const readEnvironment = (_request: Request, response: Response) => {
    response.json(state.environment);
  };

  const changeEnvironment = (request: Request, response: Response) => {
    const changes = environmentPatchSchema.safeParse(request.body);
    if (!changes.success) {
      response.status(400).json({ ok: false, error: 'Invalid environment.' });

      return;
    }

    machine.changeEnvironment(changes.data);
    response.json({ ok: true });
  };

  const reportHealth = (_request: Request, response: Response) => {
    response.json({ ok: true });
  };

  const shutDown = (_request: Request, response: Response) => {
    response.json({ ok: true });
    response.once('finish', shutdown);
  };

  // The machine's own pages: what it knows, and what's happened.
  app.get('/', showStatus);
  app.get('/logs', showLog);

  // Optional machine icon, at the address in its icon property.
  const { icon } = state.properties;
  if (icon && iconFile) {
    const iconPath = new URL(icon).pathname;
    app.get(iconPath, (_request, response) => response.sendFile(iconFile));
  }

  // The environment it swings in, set by Sim Manager.
  app.get('/api/environment', readEnvironment);
  app.post('/api/environment', changeEnvironment);

  // For whatever launched this machine: whether it's up, and a way to stop it.
  app.get('/api/health', reportHealth);
  app.post('/api/shutdown', shutDown);
}

// Everything the machine knows about itself right now: what it reports to the
// supervisor, how it's connected, and how often each peer is heard from.
function status(machine: Machine, sockets: MachineSockets) {
  const { identity, group, peers } = machine.state;
  const peerEntries = [...peers].map(([id, peer]) => {
    const heard = { updateHz: peer.updateHz, gap: machine.gapTo(id) };

    return [id, heard] as const;
  });

  return {
    identity,
    logUrl: `${identity.url}/logs`,
    group,
    supervisor: {
      url: sockets.supervisorUrl,
      connected: sockets.supervisorConnected,
    },
    settingsUrl: machine.settings?.url ?? null,
    collisionThreshold: CONFIG.MACHINE.COLLISION_THRESHOLD,
    ...machine.report,
    peers: Object.fromEntries(peerEntries),
  };
}
