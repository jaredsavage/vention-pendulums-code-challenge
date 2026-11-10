import { once } from 'node:events';
import { createServer } from 'node:http';
import { join } from 'node:path';
import express from 'express';
import { EventStream } from '@repo/network';
import { CONFIG } from '../../config.ts';
import type { SimManagerState } from '../state.ts';
import { registerApi } from './api.ts';
import { MachineProcesses } from './machineProcesses.ts';

const BUILD_DIRECTORY = join(import.meta.dirname, '../../dist');

let shownStatus = '';

// The terminal is Sim Manager's: where everything is, and how many machines
// are running. It's only redrawn when that changes.
function showStatus({ supervisorUrl, processes }: SimManagerState) {
  const running = processes.filter(({ online }) => online).length;
  const status = [
    `Supervisor   ${supervisorUrl}`,
    `Sim Manager  ${CONFIG.URL}`,
    `Machines     ${running} running`,
    '',
    'Ctrl+C to stop.',
  ].join('\n');

  if (status === shownStatus) return;

  shownStatus = status;
  console.clear();
  console.log(status);
}

// Every change goes to the page, and to the terminal.
const stream = new EventStream<SimManagerState>();
const machines = new MachineProcesses((state) => {
  stream.send(state);
  showStatus(state);
});

const app = express();
app.use(express.json());
app.use(express.static(BUILD_DIRECTORY));
registerApi(app, machines, stream);

const http = createServer(app);
http.listen(CONFIG.PORT, CONFIG.HOST);
await once(http, 'listening');

const firstGroup = machines.state.groups.slice(0, 1);
void machines.selectGroups(firstGroup.map(({ file }) => file));

async function close() {
  await machines.close();
  // Open browser streams would otherwise hold the server open.
  http.closeAllConnections();
  http.close();
}

function shutdown() {
  void close();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
