import { describe, expect, it } from 'vitest';
import {
  applyView,
  HOME_VIEW,
  pannedBy,
  zoomedAt,
} from '../src/client/Scene/view.ts';
import { pointToWorld } from '../src/client/Scene/viewport.ts';

const size = { width: 800, height: 400 };
const fitted = { scale: 100, origin: { x: 40, y: 60 } };

// Zoom should not move the machine someone is pointing at.
describe('scene view', () => {
  it('keeps the point under the mouse still while zooming', () => {
    // Panned first, so zooming can't get away with assuming the home view.
    const panned = pannedBy(HOME_VIEW, { x: 25, y: -10 }, fitted.scale);
    const mouse = { x: 300, y: 200 };
    const mouseFromMiddle = {
      x: mouse.x - size.width / 2,
      y: mouse.y - size.height / 2,
    };
    const zoomedIn = zoomedAt(panned, mouseFromMiddle, 2, fitted.scale);

    const before = pointToWorld(mouse, applyView(fitted, panned, size));
    const after = pointToWorld(mouse, applyView(fitted, zoomedIn, size));

    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });
});
