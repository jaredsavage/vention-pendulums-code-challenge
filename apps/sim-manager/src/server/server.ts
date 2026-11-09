import { once } from 'node:events';
import { createServer } from 'node:http';
import { join } from 'node:path';
import express from 'express';
import { EventStream } from '@repo/network';
import { CONFIG } from '../../config.ts';
import type { SimManagerState } from '../state.ts';
import { registerRoutes } from './http.ts';
import { MachineProcesses, type StateListener } from './machineProcesses.ts';

const BUILD_DIRECTORY = join(import.meta.dirname, '../../dist');

// Every change goes to the page, and to whoever started Sim Manager.
export async function startSimManager(onChange: StateListener) {
  const stream = new EventStream<SimManagerState>();
  const machines = new MachineProcesses((state) => {
    stream.send(state);
    onChange(state);
  });

  const app = express();
  app.use(express.json());
  app.use(express.static(BUILD_DIRECTORY));
  registerRoutes(app, machines, stream);

  const http = createServer(app);
  http.listen(CONFIG.PORT, CONFIG.HOST);
  await once(http, 'listening');

  const firstGroup = machines.state.groups.slice(0, 1);
  void machines.selectGroups(firstGroup);

  async function close() {
    await machines.close();
    // Open browser streams would otherwise hold the server open.
    http.closeAllConnections();
    http.close();
  }

  return { close };
}
