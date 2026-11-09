import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import express, { type Express } from 'express';
import { createSocketServer } from '@repo/network';
import type { Introduction } from '@repo/protocol';
import { CONFIG } from '../../config.ts';
import type { MachineDefinition } from './definition.ts';
import { log } from './log.ts';
import { Machine } from './machine.ts';
import { PeerConnections } from './network/peerConnections.ts';
import { registerRoutes } from './network/routes.ts';
import { SupervisorConnection } from './network/supervisor.ts';

// One machine: anything that happens changes the Machine, and every tick it
// tells its neighbours and its supervisor where things stand.
export async function startMachine(
  definition: MachineDefinition,
  supervisorUrl: string,
  onShutdown: () => void | Promise<void>,
) {
  const app = express();
  const http = createServer(app);
  const io = createSocketServer(http);

  app.use(express.json());
  serveIcon(app, definition);
  await listen(http, definition);

  const introduction = introductionOf(definition);
  const peers = new PeerConnections(io.of('/peers'), introduction);
  const broadcast = peers.broadcast.bind(peers);
  const machine = new Machine(definition, broadcast);
  const supervisor = new SupervisorConnection(
    supervisorUrl,
    introduction,
    machine,
    peers,
  );

  connectToPeers(peers, machine);
  registerRoutes(app, { machine, supervisor, onShutdown });
  const stopTicking = startTicking(machine, supervisor);

  async function close() {
    stopTicking();
    machine.stop('Shutting down');
    peers.close();
    await supervisor.close();
    // A browser keeps its connection open, which would hold the server open.
    http.closeAllConnections();
    await io.close();
  }

  return { close };
}

function serveIcon(app: Express, { machine, iconFile }: MachineDefinition) {
  const { icon } = machine.properties;
  if (!icon || !iconFile) return;

  const iconPath = new URL(icon).pathname;
  app.get(iconPath, (_request, response) => response.sendFile(iconFile));
}

// Listens before registering, so the supervisor and peers can reach this
// machine as soon as they hear of it.
async function listen(http: Server, { port, machine }: MachineDefinition) {
  http.listen(port, CONFIG.SERVICES.HOST);
  await once(http, 'listening');
  log(`started at ${machine.url}`);
}

function introductionOf({ groupId, machine }: MachineDefinition): Introduction {
  const { id, name, url } = machine;

  return { groupId, machine: { id, name, url } };
}

// What peers say goes to the Machine, and into the log. Positions arrive many
// times a second, so they stay out of it.
function connectToPeers(peers: PeerConnections, machine: Machine) {
  peers.on('message', (message) => {
    if (message.type !== 'POSITION_UPDATE') {
      log(`${message.senderId} sent ${message.type}`);
    }

    machine.receive(message);
  });

  peers.on('connected', (peerId) => {
    log(`${peerId} connected`);
    machine.introduceTo(peerId);
  });

  peers.on('disconnected', (peerId) => {
    log(`${peerId} disconnected`);
    machine.peerLost(peerId);
  });

  peers.on('connectionsChanged', (peerIds) => machine.peersChanged(peerIds));
}

// Every tick, the machine checks on its neighbours and reports to the
// supervisor. The device moves on its own clock, in pendulum.ts.
function startTicking(machine: Machine, supervisor: SupervisorConnection) {
  let loggedStatus = '';

  function logStatusChange() {
    const { status, reason } = machine.state;
    const current = `${status}: ${reason}`;
    if (current === loggedStatus) return;

    loggedStatus = current;
    log(current);
  }

  function tick() {
    machine.sync();
    supervisor.publishState(machine.state);
    logStatusChange();
  }

  const intervalMs = 1000 / CONFIG.UPDATES.MACHINE_SYNC_HZ;
  const timer = setInterval(tick, intervalMs);

  return () => clearInterval(timer);
}
