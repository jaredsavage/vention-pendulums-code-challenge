import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { EventStream, createSocketServer } from '@repo/network';
import type { SupervisorState } from '@repo/protocol';
import { CONFIG } from '../../config.ts';
import { registerApi } from './api.ts';
import { servePage } from './page.ts';
import { registerSockets, startGatheredGroups } from './sockets.ts';
import { supervisorState, type Groups } from './state.ts';

const AUTOSTART_CHECK_MS = 250;

export interface SupervisorOptions {
  port?: number;
}

// Browsers get the latest state at a steady rate, however often machines
// report, and new groups are checked for whether they've gathered.
export async function startSupervisor(options: SupervisorOptions = {}) {
  const app = express();
  const http = createServer(app);
  const io = createSocketServer(http);
  const groups: Groups = new Map();
  const browsers = new EventStream<SupervisorState>();

  app.use(express.json());
  registerSockets(io.of('/machines'), groups);
  registerApi(app, groups, browsers);
  const vite = await servePage(app, http);

  const port = options.port ?? CONFIG.SERVICES.PORT;
  const url = await listen(http, port);

  const publish = () => {
    if (browsers.hasViewers) {
      browsers.send(supervisorState(groups));
    }
  };

  const publishMs = 1000 / CONFIG.UPDATES.BROWSER_UPDATE_HZ;
  const publishing = setInterval(publish, publishMs);
  const autostart = setInterval(
    () => startGatheredGroups(groups),
    AUTOSTART_CHECK_MS,
  );

  async function close() {
    clearInterval(publishing);
    clearInterval(autostart);
    // Open browser streams would otherwise hold the server open.
    http.closeAllConnections();
    await vite?.close();
    await io.close();
  }

  return { url, close };
}

// Port 0 picks any free port, so the URL uses the one actually given.
async function listen(http: Server, port: number) {
  const host = CONFIG.SERVICES.HOST;

  http.listen(port, host);
  await once(http, 'listening');

  const address = http.address() as AddressInfo;

  return `http://${host}:${address.port}`;
}
