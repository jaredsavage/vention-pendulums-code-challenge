import { useEffect, useEffectEvent, useRef } from 'react';
import type { MachineCommand, MachineProperties, Point } from '@repo/protocol';
import { PARTS, type Part } from './Scene/pendulumAt.ts';
import { useCommandQueue, type SendMachineCommand } from './useCommandQueue.ts';

// The shortest string and smallest bob a drag can make, in metres.
const SHORTEST_STRING = 0.1;
const SMALLEST_BOB = 0.05;

// The machine being dragged, as it last reported itself.
interface DragTarget {
  id: string;
  properties: MachineProperties;
  bob: Point;
}

// Dragging moves the machine itself, like moving a real one: it's held still
// where it's put, keeps its status, and swings from there once it's let go.
// Normally a drag only moves the bob. In Edit mode, it changes how the machine
// is set up: its anchor, its bob's size, and its string's length and starting
// angle.
export function useDragMachine(send: SendMachineCommand, editing: boolean) {
  const queue = useCommandQueue(send);
  const heldId = useRef<string | null>(null);
  const draggableParts: readonly Part[] = editing ? PARTS : ['bob'];

  function drag(target: DragTarget, part: Part, point: Point) {
    heldId.current = target.id;
    queue(target.id, holdCommand(target, part, point, editing));
  }

  function release() {
    const id = heldId.current;
    if (!id) return;

    heldId.current = null;
    queue(id, { type: 'RELEASE' });
  }

  // Lets go if the scene goes away mid-drag, so the machine isn't left held.
  const releaseWhenRemoved = useEffectEvent(release);

  useEffect(() => {
    return () => releaseWhenRemoved();
  }, []);

  return { draggableParts, drag, release };
}

function holdCommand(
  { properties, bob }: DragTarget,
  part: Part,
  point: Point,
  editing: boolean,
): MachineCommand {
  const { anchor } = properties;

  switch (part) {
    case 'anchor':
      return { type: 'HOLD', changes: { anchor: roundedPoint(point) } };
    case 'edge':
      return { type: 'HOLD', changes: { radius: radiusReaching(point, bob) } };
    case 'bob':
      return editing ? setUpString(point, anchor) : swingTo(point, anchor);
  }
}

// The anchor carries the whole pendulum with it.
function roundedPoint({ x, y }: Point) {
  return { x: toNearestCentimetre(x), y: toNearestCentimetre(y) };
}

// The bob's outline sets its size.
function radiusReaching(point: Point, bob: Point) {
  const reach = Math.hypot(point.x - bob.x, point.y - bob.y);

  return Math.max(SMALLEST_BOB, toNearestCentimetre(reach));
}

// Moves the bob along its string, and changes nothing about the machine.
function swingTo(point: Point, anchor: Point): MachineCommand {
  return { type: 'HOLD', changes: {}, angle: angleTo(point, anchor) };
}

// The bob sets the string's length, and the angle it starts from.
function setUpString(point: Point, anchor: Point): MachineCommand {
  const angle = angleTo(point, anchor);
  const reach = Math.hypot(point.x - anchor.x, point.y - anchor.y);
  const length = Math.max(SHORTEST_STRING, toNearestCentimetre(reach));
  const initialAngle = wholeDegrees(angle);

  return { type: 'HOLD', changes: { length, initialAngle }, angle };
}

// Angles are from straight down, and the y axis points down.
function angleTo(point: Point, anchor: Point) {
  const across = point.x - anchor.x;
  const down = point.y - anchor.y;

  return Math.atan2(across, down);
}

// A starting angle is kept in whole degrees.
function wholeDegrees(radians: number) {
  const degrees = (radians * 180) / Math.PI;

  return Math.round(degrees);
}

function toNearestCentimetre(metres: number) {
  return Number(metres.toFixed(2));
}
