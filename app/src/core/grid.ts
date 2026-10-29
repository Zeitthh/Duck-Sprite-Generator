import type { Frame } from './types';

export type Point = [number, number];

/** Lado del cuadro, deducido de su longitud (64 -> 8). */
export const sizeOf = (frame: Frame) => Math.round(Math.sqrt(frame.length));
export const emptyFrame = (size: number): Frame => new Array<number>(size * size).fill(0);
export const inBounds = (x: number, y: number, size: number) => x >= 0 && y >= 0 && x < size && y < size;
export const idx = (x: number, y: number, size: number) => y * size + x;

export function paintCells(frame: Frame, points: Point[], value: number): Frame {
  const size = sizeOf(frame);
  const next = frame.slice();
  for (const [x, y] of points) if (inBounds(x, y, size)) next[idx(x, y, size)] = value;
  return next;
}

/** Línea de Bresenham, ambos extremos incluidos. */
export function linePoints(x0: number, y0: number, x1: number, y1: number): Point[] {
  const pts: Point[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    pts.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
  return pts;
}

/** Añade el reflejo horizontal (x -> width-1 - x) de cada punto, dentro del ancho dado. */
export function withMirror(points: Point[], width: number): Point[] {
  return [...points, ...points.map(([x, y]): Point => [width - 1 - x, y])];
}

/** Relleno por inundación con 4 vecinos. */
export function floodFill(frame: Frame, x: number, y: number, value: number): Frame {
  const size = sizeOf(frame);
  if (!inBounds(x, y, size)) return frame;
  const target = frame[idx(x, y, size)];
  if (target === value) return frame;
  const next = frame.slice();
  const stack: Point[] = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop()!;
    if (!inBounds(cx, cy, size) || next[idx(cx, cy, size)] !== target) continue;
    next[idx(cx, cy, size)] = value;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return next;
}

export function flipFrameH(frame: Frame): Frame {
  const size = sizeOf(frame);
  const next = frame.slice();
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) next[idx(x, y, size)] = frame[idx(size - 1 - x, y, size)];
  return next;
}

export const isBlank = (frame: Frame) => frame.every((v) => v === 0);
