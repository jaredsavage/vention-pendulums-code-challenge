import { canvasStyle } from './canvasStyle.ts';

const LABEL = '1m';

// In pixels.
const LABEL_GAP = 8;
const LEG_HEIGHT = 6;

// A metre long at the current zoom, in the bottom-left corner.
export function drawScaleBar(
  ctx: CanvasRenderingContext2D,
  scale: number,
  height: number,
) {
  const left = canvasStyle.spaceLarge;
  const right = left + scale;
  const bottom = height - canvasStyle.spaceLarge;
  const top = bottom - LEG_HEIGHT;

  ctx.save();
  ctx.font = `${canvasStyle.smallFontSize}px ${canvasStyle.font}`;
  ctx.fillStyle = canvasStyle.foreground;
  ctx.strokeStyle = canvasStyle.foreground;
  ctx.lineWidth = canvasStyle.lineWidth;

  ctx.fillText(LABEL, left, top - LABEL_GAP);

  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.lineTo(right, top);
  ctx.stroke();

  ctx.restore();
}
