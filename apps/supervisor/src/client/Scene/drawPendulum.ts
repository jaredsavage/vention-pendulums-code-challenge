import type { Point } from '@repo/protocol';
import { canvasStyle } from './canvasStyle.ts';
import type { Pendulum } from './types.ts';

const ANCHOR_SIZE = 18;
const SELECTED_LINE_WIDTH = 2;
const SELECTION_RING_GAP = 3;
const FULL_CIRCLE = 2 * Math.PI;

// To allow deco outside the bob.
const ICON_SCALE = 4;

const icons = new Map<string, HTMLImageElement>();

// The background is what the bobs are filled with, so the scene's colour shows
// through them.
export function drawPendulum(
  ctx: CanvasRenderingContext2D,
  pendulum: Pendulum,
  background: string,
) {
  const { anchor, bob, number, icon, selected, offline } = pendulum;

  const radius = Math.max(0, pendulum.radius);

  const fill = selected ? canvasStyle.foreground : background;
  const ink = selected ? background : canvasStyle.foreground;

  ctx.save();
  ctx.globalAlpha = offline ? canvasStyle.offlineOpacity : 1;
  ctx.strokeStyle = canvasStyle.foreground;
  ctx.lineWidth = selected ? SELECTED_LINE_WIDTH : canvasStyle.lineWidth;

  drawString(ctx, anchor, bob);
  drawAnchor(ctx, anchor, fill);
  drawNumber(ctx, anchor, number, ink);

  if (selected) {
    const selectionRadius = radius + SELECTION_RING_GAP;
    drawSelectionRing(ctx, bob, selectionRadius);
  }

  const image = icon ? loadedIcon(icon) : null;
  if (image) {
    drawIcon(ctx, image, bob, radius);
  } else {
    drawBob(ctx, bob, radius, fill);
  }

  ctx.restore();
}

function drawString(ctx: CanvasRenderingContext2D, anchor: Point, bob: Point) {
  ctx.beginPath();
  ctx.moveTo(anchor.x, anchor.y);
  ctx.lineTo(bob.x, bob.y);
  ctx.stroke();
}

function drawAnchor(
  ctx: CanvasRenderingContext2D,
  anchor: Point,
  fill: string,
) {
  const left = anchor.x - ANCHOR_SIZE / 2;
  const top = anchor.y - ANCHOR_SIZE / 2;

  ctx.fillStyle = fill;
  ctx.fillRect(left, top, ANCHOR_SIZE, ANCHOR_SIZE);
  ctx.strokeRect(left, top, ANCHOR_SIZE, ANCHOR_SIZE);
}

function drawNumber(
  ctx: CanvasRenderingContext2D,
  anchor: Point,
  number: number | undefined,
  ink: string,
) {
  if (number === undefined) return;

  ctx.fillStyle = ink;
  ctx.font = `bold 10px ${canvasStyle.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), anchor.x, anchor.y);
}

function drawSelectionRing(
  ctx: CanvasRenderingContext2D,
  bob: Point,
  selectionRadius: number,
) {
  ctx.beginPath();
  ctx.arc(bob.x, bob.y, selectionRadius, 0, FULL_CIRCLE);
  ctx.stroke();
}

function drawBob(
  ctx: CanvasRenderingContext2D,
  bob: Point,
  radius: number,
  fill: string,
) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(bob.x, bob.y, radius, 0, FULL_CIRCLE);
  ctx.fill();
  ctx.stroke();
}

function drawIcon(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  bob: Point,
  radius: number,
) {
  const size = radius * ICON_SCALE;
  const left = bob.x - size / 2;
  const top = bob.y - size / 2;

  ctx.drawImage(image, left, top, size, size);
}

function loadedIcon(url: string) {
  let image = icons.get(url);
  if (!image) {
    image = new Image();
    image.src = url;
    icons.set(url, image);
  }

  const loaded = image.complete && image.naturalWidth > 0;

  return loaded ? image : null;
}
