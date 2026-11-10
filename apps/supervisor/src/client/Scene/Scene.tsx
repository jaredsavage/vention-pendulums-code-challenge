import { useRef, type ReactNode } from 'react';
import type { Point } from '@repo/protocol';
import { drawScene, type Drawn } from './drawScene.ts';
import type { Part } from './pendulumAt.ts';
import type { Link, Pendulum } from './types.ts';
import { useFrameLoop } from './useFrameLoop.ts';
import { useInterpolation } from './useInterpolation.ts';
import { usePointer } from './usePointer.ts';
import { useWheelZoom } from './useWheelZoom.ts';
import type { View } from './view.ts';
import { NO_INSET, type Inset } from './viewport.ts';

interface Props {
  label: string;
  pendulums: Pendulum[];
  links?: Link[];
  onSelect?: (id: string) => void;
  onDrag?: (id: string, part: Part, metres: Point) => void;
  onRelease?: (id: string) => void;
  // The parts of a pendulum that can be dragged right now.
  draggable: readonly Part[];
  // Drawn as a blueprint, as while it's being edited.
  blueprint?: boolean;
  inset?: Inset;
  // Zoom and pan, kept by whoever shows the scene.
  view: View;
  onViewChange: (change: (view: View) => View) => void;
  children?: ReactNode;
}

export function Scene({
  label,
  pendulums,
  links = [],
  onSelect,
  onDrag,
  onRelease,
  draggable,
  blueprint = false,
  inset = NO_INSET,
  view,
  onViewChange,
  children,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawn = useRef<Drawn | null>(null);
  const pendulumsAt = useInterpolation(pendulums);
  const pointer = usePointer({
    drawn,
    setView: onViewChange,
    onSelect,
    onDrag,
    onRelease,
    draggable,
  });

  useWheelZoom(canvas, drawn, onViewChange);

  const frameRate = useFrameLoop((now) => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;

    drawn.current = drawScene(ctx, {
      pendulums: pendulumsAt(now),
      links,
      now,
      view,
      inset,
      blueprint,
    });
  });

  const frameRateText = (
    <div>
      Render <b>{frameRate}</b> Hz
    </div>
  );

  return (
    <figure data-blueprint={blueprint}>
      <canvas
        ref={canvas}
        role="img"
        aria-label={label}
        {...pointer.handlers}
      />
      <figcaption>
        {frameRateText}
        {children}
      </figcaption>
    </figure>
  );
}
