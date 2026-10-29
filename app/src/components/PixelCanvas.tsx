import { useEffect, useRef } from 'react';
import { accessoryColors, canvasSize, getAccessory, layerCells } from '../core/accessories';
import { linePoints } from '../core/grid';
import { faceWidth } from '../core/template';
import { THEME_COLORS } from '../core/theme';
import { useStore } from '../store/useStore';

const W = 448;

/**
 * Editing canvas. With "show accessory" on it becomes the padded canvas (the duck in the middle with room
 * around it) and the duck's accessory is drawn for the face being edited; only the duck's own cells can be painted.
 */
export function PixelCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const last = useRef<[number, number] | null>(null);
  const duck = useStore((s) => s.project.ducks.find((d) => d.id === s.activeId)!);
  const accessories = useStore((s) => s.project.accessories);
  const frameIdx = useStore((s) => s.frameIdx);
  const showGrid = useStore((s) => s.showGrid);
  const mirror = useStore((s) => s.mirror);
  const theme = useStore((s) => s.theme);
  const acc = getAccessory(duck.accessory, accessories);
  const showAcc = useStore((s) => s.showAccessory) && acc !== null;

  const SIZE = duck.size;
  const frame = duck.frames[SIZE][frameIdx];
  const n = showAcc ? canvasSize(SIZE) : SIZE; // cells across the canvas
  const off = showAcc ? SIZE / 2 : 0; // where the duck starts
  const CS = W / n; // pixels per cell

  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    const tc = THEME_COLORS[theme];
    ctx.clearRect(0, 0, W, W);
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        ctx.fillStyle = (x + y) % 2 ? tc.checkerA : tc.checkerB;
        ctx.fillRect(x * CS, y * CS, CS, CS);
      }
    const paintCells = (cells: (string | null)[]) =>
      cells.forEach((c, i) => {
        if (!c) return;
        ctx.fillStyle = c;
        ctx.fillRect((i % n) * CS, Math.floor(i / n) * CS, CS, CS);
      });
    const colors = acc ? accessoryColors(acc, duck.accessoryColor) : {};
    const art = acc?.faces[SIZE][frameIdx];
    if (showAcc && art) paintCells(layerCells(art.under, SIZE, colors));
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const v = frame?.[y * SIZE + x] ?? 0;
        if (!v) continue;
        ctx.fillStyle = duck.palette[v - 1];
        ctx.fillRect((x + off) * CS, (y + off) * CS, CS, CS);
      }
    if (showAcc && art) paintCells(layerCells(art.over, SIZE, colors));

    if (showAcc) {
      // The part of the canvas that belongs to the duck (the only one that can be painted).
      ctx.strokeStyle = tc.accent;
      ctx.globalAlpha = 0.6;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(off * CS + 0.5, off * CS + 0.5, SIZE * CS - 1, SIZE * CS - 1);
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    if (showGrid) {
      ctx.strokeStyle = tc.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < SIZE; i++) {
        ctx.moveTo((off + i) * CS + 0.5, off * CS);
        ctx.lineTo((off + i) * CS + 0.5, (off + SIZE) * CS);
        ctx.moveTo(off * CS, (off + i) * CS + 0.5);
        ctx.lineTo((off + SIZE) * CS, (off + i) * CS + 0.5);
      }
      ctx.stroke();
    }
    if (mirror) {
      ctx.strokeStyle = 'rgba(59,160,255,0.8)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      const axis = (off + faceWidth(SIZE, frameIdx) / 2) * CS;
      ctx.moveTo(axis, off * CS);
      ctx.lineTo(axis, (off + SIZE) * CS);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [duck.palette, duck.accessoryColor, frame, showGrid, mirror, SIZE, frameIdx, theme, acc, showAcc, n, off, CS]);

  /** Duck cell under the pointer; `null` when it is outside the duck (only possible with the accessory shown). */
  const cell = (e: React.PointerEvent, clamp: boolean): [number, number] | null => {
    const r = ref.current!.getBoundingClientRect();
    const gx = Math.floor(((e.clientX - r.left) / r.width) * n) - off;
    const gy = Math.floor(((e.clientY - r.top) / r.height) * n) - off;
    const inside = gx >= 0 && gy >= 0 && gx < SIZE && gy < SIZE;
    if (!inside && !clamp) return null;
    const c = (v: number) => Math.min(SIZE - 1, Math.max(0, v));
    return [c(gx), c(gy)];
  };

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const st = useStore.getState();
    const p = cell(e, false);
    if (!p) return;
    const [x, y] = p;
    if (st.tool === 'pick') return st.pick(x, y);
    if (st.tool === 'fill') return st.fill(x, y);
    ref.current!.setPointerCapture(e.pointerId);
    st.beginStroke();
    st.paint([[x, y]]);
    last.current = [x, y];
  };

  const onMove = (e: React.PointerEvent) => {
    if (!last.current) return;
    const [x, y] = cell(e, true)!;
    const [lx, ly] = last.current;
    if (x === lx && y === ly) return;
    useStore.getState().paint(linePoints(lx, ly, x, y));
    last.current = [x, y];
  };

  const end = () => {
    last.current = null;
  };

  return (
    <canvas
      ref={ref}
      className="pixel-canvas"
      width={W}
      height={W}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={end}
      onPointerCancel={end}
    />
  );
}
