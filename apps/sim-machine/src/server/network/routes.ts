import type { Express, Request, Response } from 'express';
import { environmentPatchSchema } from '@repo/protocol';
import { recentLog } from '../log.ts';
import type { Machine } from '../machine.ts';
import { statusText } from './statusText.ts';
import type { SupervisorConnection } from './supervisor.ts';

interface RouteOptions {
  machine: Machine;
  supervisor: SupervisorConnection;
  onShutdown: () => void | Promise<void>;
}

export function registerRoutes(app: Express, options: RouteOptions) {
  const { machine, supervisor, onShutdown } = options;
  const { device } = machine;

  // Both pages are refreshed by hand, so they hold still while they're read.
  function showStatus(_request: Request, response: Response) {
    response.type('text').send(statusText(machine, supervisor.status));
  }

  function showLog(_request: Request, response: Response) {
    response.type('text').send(recentLog().join('\n'));
  }

  function readEnvironment(_request: Request, response: Response) {
    response.json(device.environment);
  }

  function changeEnvironment(request: Request, response: Response) {
    const changes = environmentPatchSchema.safeParse(request.body);
    if (!changes.success) {
      response.status(400).json({ ok: false, error: 'Invalid environment.' });

      return;
    }

    device.setEnvironment(changes.data);
    response.json({ ok: true });
  }

  function reportHealth(_request: Request, response: Response) {
    response.json({ ok: true });
  }

  function shutdown(_request: Request, response: Response) {
    response.json({ ok: true });
    response.once('finish', () => void onShutdown());
  }

  // The machine's own pages, as text: where it stands, and what's happened.
  app.get('/', showStatus);
  app.get('/logs', showLog);

  // The environment it swings in, set by Sim Manager.
  app.get('/api/environment', readEnvironment);
  app.post('/api/environment', changeEnvironment);

  // For whatever launched this machine: whether it's up, and a way to stop it.
  app.get('/api/health', reportHealth);
  app.post('/api/shutdown', shutdown);
}
