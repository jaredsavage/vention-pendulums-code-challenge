import type { CSSProperties } from 'react';
import type { MachineState, ObservedMachine, Point } from '@repo/protocol';

const SIZE = 400;
const MIDDLE = SIZE / 2;
const RING_RADIUS = 175;

// The selected machine's details sit about an inch in from its node.
const DETAILS_OFFSET = 96;

// Gaps between the moving dots, different each way so the two streams never
// move in step.
const THERE_SPACING = 19;
const BACK_SPACING = 14;

// Active links bow towards the middle, so short ones clear the nodes beside
// them. The bow's shared out between the machines, so bigger groups bow less,
// within these limits.
const MOST_BEND = 0.35;
const LEAST_BEND = 0.15;
const TOTAL_BEND = 1.5;

interface Props {
  machines: ObservedMachine[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}

type Node = Point & { machine: ObservedMachine; number: number };

interface GroupLink {
  key: string;
  from: Node;
  to: Node;
  active: boolean;
  faded: boolean;
}

// Every connection in a group, as the machines report them, with the machines
// around a ring. Moving dots mean positions are flowing both ways over a link;
// the supervisor can't see single messages.
export function NetworkView({ machines, selectedId, onSelect }: Props) {
  const nodes = ringNodes(machines);
  const links = groupLinks(nodes, selectedId);

  const sharedBend = TOTAL_BEND / machines.length;
  const activeBend = Math.min(MOST_BEND, Math.max(LEAST_BEND, sharedBend));

  // Active links go last, so they're drawn over the rest.
  const activeLast = links.toSorted(
    (first, second) => Number(first.active) - Number(second.active),
  );
  const lines = activeLast.map((link) => (
    <LinkPaths key={link.key} link={link} bend={link.active ? activeBend : 0} />
  ));

  // Nodes sit over the drawing as elements, so they stay one size as it scales.
  const nodeButtons = nodes.map(({ machine, number, x, y }) => {
    const left = `${(x / SIZE) * 100}%`;
    const top = `${(y / SIZE) * 100}%`;

    return (
      <button
        key={machine.id}
        type="button"
        title={`${machine.name}\n${machine.url}`}
        aria-pressed={machine.id === selectedId}
        style={{ left, top }}
        onClick={() => onSelect(machine.id)}
      >
        {number}
      </button>
    );
  });

  const connectionCount = countPairs(machines, connectedPeers);
  const linkCount = countPairs(machines, connectedNeighbours);
  const messageRate = totalMessageRate(machines);
  const selected = nodes.find(({ machine }) => machine.id === selectedId);
  const selectedDetails = selected && <SelectedMachine node={selected} />;

  return (
    <div data-network>
      <p role="status">
        <span>
          <b>{connectionCount}</b> connections
        </span>
        <span>
          <b>{linkCount}</b> neighbour links
        </span>
        <span>
          <b>{messageRate}</b> messages/s
        </span>
      </p>
      <div>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label="Group network"
        >
          {lines}
        </svg>
        {selectedDetails}
        {nodeButtons}
      </div>
    </div>
  );
}

interface LinkPathsProps {
  link: GroupLink;
  bend: number;
}

// A link's line, and while positions flow, dots moving each way along it.
function LinkPaths({ link, bend }: LinkPathsProps) {
  const { from, to, active, faded } = link;
  const there = curve(from, to, bend);
  const back = curve(to, from, bend);

  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const dotsThere = Math.round(length / THERE_SPACING);
  const dotsBack = Math.round(length / BACK_SPACING);

  const flowThere = active && (
    <path d={there} pathLength={dotsThere} data-active data-faded={faded} />
  );
  const flowBack = active && (
    <path d={back} pathLength={dotsBack} data-active data-faded={faded} />
  );

  return (
    <g>
      <path d={there} data-faded={faded} />
      {flowThere}
      {flowBack}
    </g>
  );
}

// The selected machine's own connections, inside the ring near its node.
function SelectedMachine({ node }: { node: Node }) {
  const { name, url, online, state } = node.machine;
  const reported = online && state;

  return (
    <p style={towardsMiddle(node)}>
      <span>
        <b>{name}</b>
      </span>
      <span>{new URL(url).host}</span>
      {reported ? (
        <>
          <span>
            <b>{state.connectedPeers.length}</b> connections
          </span>
          <span>
            <b>{state.neighbours.length}</b> neighbours
          </span>
          <span>
            <b>{Math.round(state.messagesPerSecond)}</b> messages/s
          </span>
        </>
      ) : (
        <span>offline</span>
      )}
    </p>
  );
}

// A point in from the node towards the middle. The stylesheet uses the
// direction to turn the box's near edge to face the node.
function towardsMiddle(node: Node) {
  const towardsX = MIDDLE - node.x;
  const towardsY = MIDDLE - node.y;
  const distance = Math.hypot(towardsX, towardsY);
  const directionX = towardsX / distance;
  const directionY = towardsY / distance;

  const nodeLeft = `${(node.x / SIZE) * 100}%`;
  const nodeTop = `${(node.y / SIZE) * 100}%`;
  const offsetX = directionX * DETAILS_OFFSET;
  const offsetY = directionY * DETAILS_OFFSET;

  return {
    left: `calc(${nodeLeft} + ${offsetX}px)`,
    top: `calc(${nodeTop} + ${offsetY}px)`,
    '--direction-x': directionX,
    '--direction-y': directionY,
  } as CSSProperties;
}

// Evenly around the ring, the first at the top.
function ringNodes(machines: ObservedMachine[]): Node[] {
  return machines.map((machine, index) => {
    const turn = (2 * Math.PI * index) / machines.length;
    const angle = turn - Math.PI / 2;
    const x = MIDDLE + RING_RADIUS * Math.cos(angle);
    const y = MIDDLE + RING_RADIUS * Math.sin(angle);

    return { machine, number: index + 1, x, y };
  });
}

// Each connection a machine reports, once per pair. It's active while
// positions flow, and fades when another machine is selected.
function groupLinks(nodes: Node[], selectedId: string | undefined) {
  return nodes.flatMap((from, index) =>
    nodes.slice(index + 1).flatMap((to): GroupLink[] => {
      const { id, online, state } = from.machine;
      const peerId = to.machine.id;
      const connected = online && state?.connectedPeers.includes(peerId);
      if (!connected || !state) return [];

      const neighbour = state.neighbours.includes(peerId);
      const active = neighbour && state.messagesPerSecond > 0;
      const touchesSelected = selectedId === id || selectedId === peerId;
      const faded = selectedId !== undefined && !touchesSelected;

      return [{ key: `${id}-${peerId}`, from, to, active, faded }];
    }),
  );
}

function connectedPeers(state: MachineState) {
  return state.connectedPeers;
}

function connectedNeighbours(state: MachineState) {
  return state.neighbours.filter((id) => state.connectedPeers.includes(id));
}

// Both ends of a connection report it, so each pair counts once. A machine
// that's offline has nothing current to report.
function countPairs(
  machines: ObservedMachine[],
  peersOf: (state: MachineState) => string[],
) {
  const pairs = machines.flatMap(({ id, online, state }) => {
    const reported = online && state ? peersOf(state) : [];

    return reported.map((peerId) => [id, peerId].sort().join());
  });

  return new Set(pairs).size;
}

// Measured where messages arrive, so it only counts what was delivered.
function totalMessageRate(machines: ObservedMachine[]) {
  const rates = machines.map(({ online, state }) =>
    online && state ? state.messagesPerSecond : 0,
  );
  const total = rates.reduce((sum, rate) => sum + rate, 0);

  return Math.round(total);
}

// From one point to another, pulled towards the middle of the ring by the
// bend: none is a straight line.
function curve(from: Point, to: Point, bend: number) {
  const halfwayX = (from.x + to.x) / 2;
  const halfwayY = (from.y + to.y) / 2;
  const pullX = halfwayX + (MIDDLE - halfwayX) * bend;
  const pullY = halfwayY + (MIDDLE - halfwayY) * bend;

  return `M ${from.x} ${from.y} Q ${pullX} ${pullY} ${to.x} ${to.y}`;
}
