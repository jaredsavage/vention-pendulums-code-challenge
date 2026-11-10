import { once } from 'node:events';
import { createServer } from 'node:http';
import express from 'express';
import { createSocketServer } from '@repo/network';
import { CONFIG } from '../config.ts';
import { registerApi } from './api.ts';
import { log } from './log.ts';
import { Machine } from './machine.ts';
import { everyStep } from './fixedSteps.ts';
import { settingsStoreAt } from './settingsStore.ts';
import { connectSockets } from './sockets.ts';
import { createState, definitionSchema } from './state.ts';

// One simulated machine, as its own program. Commands and peer messages change
// its state. Its pendulum swings in steady steps, and every tick it reports
// where it is.

const SWING_STEPS_PER_SECOND = 60;

const json = CONFIG.MACHINE.DEFINITION;
if (!json) {
  throw new Error('MACHINE_DEFINITION is not set.');
}

const definition = definitionSchema.parse(JSON.parse(json));
const { port, iconFile, settingsUrl } = definition;
const { id, url } = definition.machine;

const app = express();
const http = createServer(app);
const io = createSocketServer(http);
app.use(express.json());

// Listens before registering, so peers can reach it as soon as they hear of it.
http.listen(port, CONFIG.SERVICES.HOST);
await once(http, 'listening');
log(`started at ${url}`);

const machine = new Machine(createState(definition));
if (settingsUrl) {
  machine.settings = settingsStoreAt(settingsUrl);
}

const sockets = connectSockets(io, machine, CONFIG.SERVICES.SUPERVISOR_URL);
registerApi(app, machine, sockets, { iconFile, shutdown });

const stopSwinging = everyStep(SWING_STEPS_PER_SECOND, (seconds) =>
  machine.swing(seconds),
);

const tickMs = 1000 / CONFIG.UPDATES.MACHINE_SYNC_HZ;
const timer = setInterval(() => {
  machine.tick();
  sockets.publishState();
}, tickMs);

console.log(`${id} listening at ${url}`);

// However many ways it's asked to, the machine only closes once.
let closing = false;

function shutdown() {
  if (closing) return;

  closing = true;
  void close();
}

async function close() {
  stopSwinging();
  clearInterval(timer);
  machine.stop('Shutting down');
  await sockets.close();
  // Open browser requests would otherwise hold the server open.
  http.closeAllConnections();
  await io.close();
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

// To prevent orphans on macOS and Linux, where a manager that's killed
// outright leaves its machines running. The channel alone mustn't keep a
// machine alive.
process.channel?.unref();
process.once('disconnect', shutdown);
