// Sizes the canvas in device pixels, so it stays sharp,
// and draws in CSS pixels, so nothing else has to know.
export function resizeCanvasForScreen(ctx: CanvasRenderingContext2D) {
  const { canvas } = ctx;
  const { width, height } = canvas.getBoundingClientRect();
  const density = window.devicePixelRatio;
  const pixelWidth = Math.round(width * density);
  const pixelHeight = Math.round(height * density);

  const resized = canvas.width !== pixelWidth || canvas.height !== pixelHeight;
  if (resized) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  ctx.setTransform(density, 0, 0, density, 0, 0);

  return { width, height };
}
