import type { Point } from '@repo/protocol';
import { canvasStyle } from './canvasStyle.ts';
import type { Link, Pendulum } from './types.ts';

// Links run between points a little above the anchors, and arc upwards.
const LINK_LIFT = 12;
const LINK_ARC = 0.225;

export function drawLinks(
  ctx: CanvasRenderingContext2D,
  pendulums: Pendulum[],
  links: Link[],
) {
  ctx.save();
  ctx.setLineDash([4, 5]);
  ctx.strokeStyle = canvasStyle.foreground;
  ctx.globalAlpha = canvasStyle.neighbourLinkOpacity;
  ctx.lineWidth = 1;

  const anchors = new Map(pendulums.map(({ id, anchor }) => [id, anchor]));

  for (const [fromId, toId] of links) {
    const from = anchors.get(fromId);
    const to = anchors.get(toId);
    if (from && to) {
      drawLink(ctx, from, to);
    }
  }

  ctx.restore();
}

function drawLink(ctx: CanvasRenderingContext2D, from: Point, to: Point) {
  const startY = from.y - LINK_LIFT;
  const endY = to.y - LINK_LIFT;
  const halfwayX = (from.x + to.x) / 2;
  const halfwayY = (startY + endY) / 2;
  const arcHeight = Math.abs(to.x - from.x) * LINK_ARC;

  ctx.beginPath();
  ctx.moveTo(from.x, startY);
  ctx.quadraticCurveTo(halfwayX, halfwayY - arcHeight, to.x, endY);
  ctx.stroke();
}
