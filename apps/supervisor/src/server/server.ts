import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { createSocketServer } from '@repo/network';
import { CONFIG } from '../../config.ts';
import { autostartGroups } from './autostart.ts';
import { createGroupRegistry, type GroupRegistry } from './groups.ts';
import { registerRoutes } from './http.ts';
import { connectMachines } from './machines.ts';
import { servePage } from './page.ts';

export interface SupervisorOptions {
  port?: number;
}

export async function startSupervisor(options: SupervisorOptions = {}) {
  const app = express();
  const http = createServer(app);
  const io = createSocketServer(http);
  const registry = createGroupRegistry();

  app.use(express.json());
  connectMachines(io.of('/machines'), registry);
  registerRoutes(app, registry);
  const vite = await servePage(app, http);

  const port = options.port ?? CONFIG.SERVICES.PORT;
  const url = await listen(http, port);
  const stopAutostart = autostartGroups(registry);
  const stopPublishing = publishToBrowsers(registry);

  async function close() {
    stopPublishing();
    stopAutostart();
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

// Browsers get the latest state at a steady rate, however often machines
// report.
function publishToBrowsers(registry: GroupRegistry) {
  const intervalMs = 1000 / CONFIG.UPDATES.BROWSER_UPDATE_HZ;
  const timer = setInterval(registry.publish, intervalMs);

  return () => clearInterval(timer);
}
