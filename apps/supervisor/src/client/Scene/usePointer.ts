import {
  useRef,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import type { Point } from '@repo/protocol';
import type { Drawn } from './drawScene.ts';
import { PARTS, pendulumAt, type Hit, type Part } from './pendulumAt.ts';
import { pannedBy, type View } from './view.ts';
import { pointToWorld, type CanvasViewport } from './viewport.ts';

// Clicks are mouse events. Pointer events are mouse events, with more.
type CanvasMouseEvent = MouseEvent<HTMLCanvasElement>;
type CanvasPointerEvent = PointerEvent<HTMLCanvasElement>;

// Going clockwise from the right, every 45°. The y axis points down.
const RESIZE_CURSORS = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'];

// How far a click can wander between press and release, in pixels.
const CLICK_TOLERANCE = 3;

// What the pointer is doing while it's pressed: moving the view, or moving
// part of a pendulum. A drag reads the pointer through the view as it was when
// the drag began, so the pendulum grows steadily even as the view zooms out.
type Gesture =
  | { type: 'pan'; from: Point }
  | { type: 'drag'; id: string; part: Part; viewport: CanvasViewport };

interface Options {
  drawn: RefObject<Drawn | null>;
  setView: (change: (view: View) => View) => void;
  onSelect?: (id: string) => void;
  onDrag?: (id: string, part: Part, metres: Point) => void;
  onRelease?: (id: string) => void;
  // The parts of a pendulum that can be dragged right now.
  draggable: readonly Part[];
}

// Clicking selects a pendulum. Pressing the background pans the view, and
// pressing a pendulum drags it.
export function usePointer(options: Options) {
  const { drawn, setView, onSelect, onDrag, onRelease, draggable } = options;
  const gesture = useRef<Gesture | null>(null);
  const pressedAt = useRef<Point | null>(null);

  function press(event: CanvasPointerEvent) {
    const point = canvasPoint(event);
    const grabbed = grabbableAt(point);

    pressedAt.current = point;
    gesture.current = grabbed ? dragOf(grabbed) : { type: 'pan', from: point };

    if (gesture.current) {
      event.currentTarget.setPointerCapture(event.pointerId);
      showCursor(event);
    }
  }

  function move(event: CanvasPointerEvent) {
    const current = gesture.current;
    const point = canvasPoint(event);

    if (current?.type === 'pan') {
      panTo(point, current.from);
    } else if (current?.type === 'drag') {
      onDrag?.(current.id, current.part, pointToWorld(point, current.viewport));
    } else {
      showCursor(event);
    }
  }

  function release(event: CanvasPointerEvent) {
    const current = gesture.current;
    gesture.current = null;

    if (current?.type === 'drag') {
      onRelease?.(current.id);
    }

    showCursor(event);
  }

  // The browser clicks after a drag or a pan too, so only a press that let go
  // where it started selects.
  function select(event: CanvasMouseEvent) {
    const point = canvasPoint(event);
    const clicked = clickedOn(point);
    const start = pressedAt.current;
    if (!clicked || !start) return;

    const wandered = Math.hypot(point.x - start.x, point.y - start.y);
    if (wandered <= CLICK_TOLERANCE) {
      onSelect?.(clicked.pendulum.id);
    }
  }

  // Any part of a pendulum selects it.
  function clickedOn(point: Point) {
    return pendulumAt(drawn.current?.pendulums ?? [], point, PARTS);
  }

  function grabbableAt(point: Point) {
    return pendulumAt(drawn.current?.pendulums ?? [], point, draggable);
  }

  function dragOf({ pendulum, part }: Hit): Gesture | null {
    const viewport = drawn.current?.viewport;
    if (!onDrag || !viewport) return null;

    return { type: 'drag', id: pendulum.id, part, viewport };
  }

  function panTo(point: Point, from: Point) {
    const moved = { x: point.x - from.x, y: point.y - from.y };
    const scale = drawn.current?.viewport.scale ?? 1;

    gesture.current = { type: 'pan', from: point };
    setView((view) => pannedBy(view, moved, scale));
  }

  function showCursor(event: CanvasPointerEvent) {
    const point = canvasPoint(event);
    const grabbable = onDrag ? grabbableAt(point) : undefined;
    const cursor = cursorFor(gesture.current, grabbable, point);

    event.currentTarget.style.cursor = cursor;
  }

  const handlers = {
    onClick: select,
    onPointerDown: press,
    onPointerMove: move,
    onPointerUp: release,
    onPointerCancel: release,
  };

  return { handlers };
}

// Where the pointer is on the canvas, in pixels.
function canvasPoint({ nativeEvent }: CanvasMouseEvent) {
  return { x: nativeEvent.offsetX, y: nativeEvent.offsetY };
}

// Grabbing while it pans or carries a pendulum. Otherwise, over a pendulum, it
// shows what pressing would do, and a bob's outline shows which way it resizes.
function cursorFor(
  gesture: Gesture | null,
  grabbable: Hit | undefined,
  point: Point,
) {
  const resizing = gesture?.type === 'drag' && gesture.part === 'edge';
  if (gesture && !resizing) return 'grabbing';
  if (!grabbable) return '';

  if (grabbable.part === 'edge') {
    return resizeCursor(grabbable.pendulum.bob, point);
  }

  return 'grab';
}

function resizeCursor(bob: Point, point: Point) {
  const radians = Math.atan2(point.y - bob.y, point.x - bob.x);
  const eighths = Math.round((radians * 4) / Math.PI);
  const direction = (eighths + 4) % 4;

  return RESIZE_CURSORS[direction]!;
}
