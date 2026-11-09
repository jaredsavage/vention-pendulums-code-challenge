import {
  ENVIRONMENT_FIELDS,
  PROPERTY_FIELDS,
  type Point,
} from '@repo/protocol';
import { CONFIG } from '../../../config.ts';
import type { Machine } from '../machine.ts';
import type { SupervisorStatus } from './supervisor.ts';

const LABEL_WIDTH = 22;

type Row = [label: string, value: string];

// The machine's own page: what it knows about itself right now, as plain text
// in labelled sections.
export function statusText(machine: Machine, supervisor: SupervisorStatus) {
  const sections = [
    summaryRows(machine),
    networkRows(machine, supervisor),
    propertyRows(machine),
    environmentRows(machine),
    neighbourRows(machine),
  ];

  const blocks = sections.map((rows) => rows.map(formatRow).join('\n'));

  return blocks.join('\n\n');
}

function summaryRows({ identity, state }: Machine): Row[] {
  return [
    [identity.name, identity.url],
    [state.status, state.reason],
    ['Log', `${identity.url}/logs`],
  ];
}

function networkRows(
  { group, state }: Machine,
  supervisor: SupervisorStatus,
): Row[] {
  const link = supervisor.connected ? 'connected' : 'not connected';
  const peerCount = group.machines.length - 1;

  return [
    ['Group', group.id],
    ['Supervisor', `${supervisor.url} (${link})`],
    ['Peers', `${state.connectedPeers.length} of ${peerCount} connected`],
  ];
}

function propertyRows({ state }: Machine): Row[] {
  const { properties, position, angle, stopOnCollision } = state;
  const angleInDegrees = (angle * 180) / Math.PI;
  const fields = PROPERTY_FIELDS.map(({ name, label, unit }): Row => [
    label,
    `${properties[name]} ${unit}`,
  ]);

  return [
    ['Anchor', formatPoint(properties.anchor)],
    ['Bob', formatPoint(position)],
    ['Angle', `${angleInDegrees.toFixed(1)}°`],
    ...fields,
    ['Collision threshold', formatMetres(CONFIG.MACHINE.COLLISION_THRESHOLD)],
    ['Stop on collision', stopOnCollision ? 'on' : 'off'],
  ];
}

function environmentRows({ device }: Machine): Row[] {
  return ENVIRONMENT_FIELDS.map(({ name, label, unit }) => [
    label,
    `${device.environment[name]} ${unit}`,
  ]);
}

// How often each neighbour's positions arrive, and how far apart the bobs are.
function neighbourRows({ group, state, connections }: Machine): Row[] {
  const neighbours = group.machines.filter(({ id }) =>
    state.neighbours.includes(id),
  );
  const rows = neighbours.map(({ id, name, url }): Row => {
    const host = new URL(url).host;
    const measurement = connections[id];
    if (!measurement) {
      return [name, `${host}, not connected`];
    }

    const updates = `${measurement.updateHz.toFixed(0)} Hz`;
    const distance =
      measurement.distance === null
        ? 'distance unknown'
        : `${formatMetres(measurement.distance)} away`;

    return [name, `${host}, ${updates}, ${distance}`];
  });

  return [['Neighbours', `${neighbours.length} close enough`], ...rows];
}

function formatRow([label, value]: Row) {
  return label.padEnd(LABEL_WIDTH) + value;
}

function formatPoint({ x, y }: Point) {
  return `${x.toFixed(2)}, ${y.toFixed(2)} m`;
}

function formatMetres(metres: number) {
  return `${metres.toFixed(2)} m`;
}
