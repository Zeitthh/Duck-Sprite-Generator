import { useEffect, useRef } from 'react';
import { accessoryOnly, boundsOf, canvasSize } from '../core/accessories';
import type { Accessory, DuckSize } from '../core/types';

const BOX = 48;

/** Only the accessory (RIGHT face, no duck), cropped to its content and enlarged by whole pixels. */
export function AccessoryIcon({
  acc,
  size,
  color = null,
  box = BOX,
}: {
  acc: Accessory;
  size: DuckSize;
  /** Main color to show (null = the accessory's default). */
  color?: string | null;
  box?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const n = canvasSize(size);
  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    ctx.clearRect(0, 0, box, box);
    const cells = accessoryOnly(acc, size, color, 0);
    const b = boundsOf(cells, n);
    if (!b) return;
    const px = Math.max(1, Math.floor(box / Math.max(b.w, b.h)));
    const ox = Math.floor((box - b.w * px) / 2);
    const oy = Math.floor((box - b.h * px) / 2);
    cells.forEach((c, i) => {
      if (!c) return;
      ctx.fillStyle = c;
      ctx.fillRect(ox + ((i % n) - b.x) * px, oy + (Math.floor(i / n) - b.y) * px, px, px);
    });
  }, [acc, size, color, n, box]);
  return <canvas ref={ref} className="thumb" width={box} height={box} />;
}

/** Square swatch-like tile: the accessory on its own, with its name underneath. */
export function AccessoryTile({
  acc,
  size,
  selected,
  color = null,
  onClick,
}: {
  acc: Accessory;
  size: DuckSize;
  selected: boolean;
  color?: string | null;
  onClick: () => void;
}) {
  return (
    <button className={`tile ${selected ? 'on' : ''}`} onClick={onClick} title={acc.name} aria-pressed={selected}>
      <AccessoryIcon acc={acc} size={size} color={color} />
      <span>{acc.name}</span>
    </button>
  );
}
