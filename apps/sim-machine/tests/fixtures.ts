import { vi } from 'vitest';
import type {
  Environment,
  MachineProperties,
  PeerMessage,
  PeerPayload,
} from '@repo/protocol';
import { Machine } from '../src/server/machine.ts';

type Properties = Omit<MachineProperties, 'type'>;

export const FIRST_RUN = 'first-run';

// Two pendulums close enough to be neighbours, as in the Dagenais group.
export function testGroup() {
  const environment: Environment = {
    gravity: 9.81,
    windSpeed: 0,
    windDirection: 0,
    airDensity: 1.225,
  };
  const machines = [
    pendulum(1, {
      anchor: { x: 0, y: 0 },
      length: 1.8,
      mass: 1,
      initialAngle: -35,
      radius: 0.5,
      dragCoefficient: 0.47,
    }),
    pendulum(2, {
      anchor: { x: 1.8, y: 0 },
      length: 1.8,
      mass: 1.5,
      initialAngle: 35,
      radius: 0.14,
      dragCoefficient: 0.47,
    }),
  ];

  return { id: 'default', stopOnCollision: true, environment, machines };
}

const group = testGroup();
export const own = group.machines[0]!;
export const peer = group.machines[1]!;

// The machine under test, in a group of two, connected to its peer, which
// hasn't said anything yet.
export function joinedMachine() {
  const definition = {
    groupId: group.id,
    machine: own,
    port: own.port,
    stopOnCollision: true,
    environment: group.environment,
  };
  const machine = new Machine(definition, vi.fn());

  machine.updateMembership(group);
  machine.peersChanged([peer.id]);

  return machine;
}

// Its peer has reported its size, and the group has started.
export function runningMachine() {
  const machine = joinedMachine();
  const { properties } = peer;

  machine.receive(fromPeer({ type: 'PROPERTIES', properties }));
  machine.command({ type: 'START', runId: FIRST_RUN, resume: false });

  return machine;
}

export function fromPeer(payload: PeerPayload): PeerMessage {
  const envelope = { senderId: peer.id, groupId: group.id };

  return { ...payload, ...envelope };
}

// The peer reports its bob right where this machine's is.
export function collide(machine: Machine) {
  const { runId, position } = machine.state;

  machine.receive(
    fromPeer({ type: 'POSITION_UPDATE', runId, angle: 0, position }),
  );
  machine.sync();
}

function pendulum(number: number, properties: Properties) {
  const padded = String(number).padStart(2, '0');
  const port = 4100 + number;

  return {
    id: `pendulum-${padded}`,
    name: `Pendulum ${padded}`,
    port,
    url: `http://127.0.0.1:${port}`,
    properties: { type: 'pendulum' as const, ...properties },
  };
}
