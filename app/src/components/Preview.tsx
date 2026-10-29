import { RiPaletteLine } from '@remixicon/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { canvasSize, compose } from '../core/accessories';
import { getAccessory } from '../core/accessories';
import { backgroundName, nextBackground } from '../core/palette';
import { MAX_FRAMES, type Accessory, type Duck } from '../core/types';
import { useStore } from '../store/useStore';

const BOX = 128;
/** Resolución del preview ampliado: 512 es múltiplo de 16 y de 32, así cada píxel del pato queda entero. */
const BIG = 512;

/** Una cara del pato (con su accesorio) sobre el lienzo con margen, dibujada en una caja de `box` px. */
function PreviewCanvas({ duck, acc, face, bg, box }: { duck: Duck; acc: Accessory | null; face: number; bg: string | null; box: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const n = canvasSize(duck.size);
  const px = box / n;
  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    ctx.clearRect(0, 0, box, box);
    compose(duck, duck.size, face, acc).forEach((c, i) => {
      if (!c) return;
      ctx.fillStyle = c;
      ctx.fillRect((i % n) * px, Math.floor(i / n) * px, px, px);
    });
  });
  return <canvas ref={ref} className={`preview ${bg === null ? 'checker' : ''}`} width={box} height={box} style={bg ? { background: bg } : undefined} />;
}

/**
 * Animated preview of the duck being edited (4 faces in a loop), on the padded canvas (room for accessories).
 * Click it to see it large in the middle of the screen; click anywhere (or press Esc) to close it.
 */
export function Preview() {
  const duck = useStore((s) => s.project.ducks.find((d) => d.id === s.activeId)!);
  const fps = useStore((s) => s.project.fps);
  const accessories = useStore((s) => s.project.accessories);
  const [bg, setBg] = useState<string | null>(null); // null = transparent
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000 / fps);
    return () => clearInterval(t);
  }, [fps]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const face = tick % MAX_FRAMES;
  const acc = getAccessory(duck.accessory, accessories);

  return (
    <section className="panel">
      <h3>Preview</h3>
      <div className="preview-wrap">
        <button className="preview-open" onClick={() => setOpen(true)} aria-label="Enlarge the preview">
          <PreviewCanvas duck={duck} acc={acc} face={face} bg={bg} box={BOX} />
        </button>
        <button
          className="bg-btn"
          onClick={() => setBg(nextBackground(bg))}
          aria-label={`Background: ${backgroundName(bg)}`}
        >
          <RiPaletteLine size={14} />
        </button>
      </div>

      {open &&
        createPortal(
          <div className="lightbox" role="dialog" aria-label="Preview" onClick={() => setOpen(false)}>
            <PreviewCanvas duck={duck} acc={acc} face={face} bg={bg} box={BIG} />
          </div>,
          document.body,
        )}
    </section>
  );
}
