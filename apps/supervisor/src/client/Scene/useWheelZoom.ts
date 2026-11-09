import { useEffect, type RefObject } from 'react';
import { zoomedAt, type View } from './view.ts';
import type { Drawn } from './drawScene.ts';

const ZOOM_PER_WHEEL_PIXEL = 0.001;

// Zooms in and out around the pointer. React's own wheel events can't stop the
// page scrolling, so this listens on the canvas itself.
export function useWheelZoom(
  canvas: RefObject<HTMLCanvasElement | null>,
  drawn: RefObject<Drawn | null>,
  setView: (change: (view: View) => View) => void,
) {
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;

    const zoom = (event: WheelEvent) => {
      event.preventDefault();

      const scale = drawn.current?.viewport.scale;
      if (!scale) return;

      const fromMiddle = {
        x: event.offsetX - element.clientWidth / 2,
        y: event.offsetY - element.clientHeight / 2,
      };
      const factor = Math.exp(-event.deltaY * ZOOM_PER_WHEEL_PIXEL);

      setView((view) => zoomedAt(view, fromMiddle, factor, scale));
    };

    element.addEventListener('wheel', zoom, { passive: false });

    return () => element.removeEventListener('wheel', zoom);
  }, [canvas, drawn, setView]);
}
