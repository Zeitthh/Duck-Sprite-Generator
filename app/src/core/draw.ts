import { sizeOf } from './grid';
import type { Frame } from './types';

/** Dibuja un cuadro en un contexto 2D sin suavizado. `scale` = px por celda. */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  duck: { palette: string[] },
  frame: Frame,
  scale: number,
  ox = 0,
  oy = 0,
) {
  const size = sizeOf(frame);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = frame[y * size + x];
      if (!v) continue;
      ctx.fillStyle = duck.palette[v - 1];
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  }
}
