import { useEffect, useRef } from 'react';
import { drawFrame } from '../core/draw';
import { sizeOf } from '../core/grid';
import { canvasSize, compose } from '../core/accessories';
import type { Accessory, Duck, Frame } from '../core/types';

/** Miniatura de un cuadro dentro de una caja de `box` px (8×8 y 16×16 se ven del mismo tamaño). */
export function Thumb({ duck, frame, box = 64 }: { duck: Duck; frame: Frame | null; box?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    ctx.clearRect(0, 0, box, box);
    if (frame) drawFrame(ctx, duck, frame, box / sizeOf(frame));
  }, [duck, frame, box]);
  return <canvas ref={ref} className="thumb" width={box} height={box} />;
}

/** One face of the duck wearing its accessory, on the padded canvas. */
export function ComposedThumb({ duck, face, acc, box = 96 }: { duck: Duck; face: number; acc: Accessory | null; box?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const n = canvasSize(duck.size);
  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    ctx.clearRect(0, 0, box, box);
    compose(duck, duck.size, face, acc).forEach((c, i) => {
      if (!c) return;
      ctx.fillStyle = c;
      ctx.fillRect((i % n) * (box / n), Math.floor(i / n) * (box / n), box / n, box / n);
    });
  }, [duck, face, acc, box, n]);
  return <canvas ref={ref} className="thumb" width={box} height={box} />;
}
