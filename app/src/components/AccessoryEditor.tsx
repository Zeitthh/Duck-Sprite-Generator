import {
  RiAddLine,
  RiArrowDownLine,
  RiArrowGoBackLine,
  RiArrowGoForwardLine,
  RiArrowUpLine,
  RiDeleteBin6Line,
  RiEraserLine,
  RiEyeLine,
  RiEyeOffLine,
  RiFileCopyLine,
  RiFlipHorizontalLine,
  RiPaintFill,
  RiPaletteLine,
  RiPencilLine,
  RiRestartLine,
} from '@remixicon/react';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import {
  CANVAS,
  LAYERS,
  accessoryColors,
  canvasSize,
  defaultAccessories,
  slotsOf,
  type Layer,
} from '../core/accessories';
import { linePoints } from '../core/grid';
import { backgroundName, nextBackground } from '../core/palette';
import { THEME_COLORS } from '../core/theme';
import { ENABLED_SIZES, FACE_NAMES, type Accessory, type Duck, type DuckSize } from '../core/types';
import { useStore } from '../store/useStore';
import { AccessoryIcon } from './AccessoryTile';
import { useReorder } from './useReorder';
import { ColorDropdown } from './ColorDropdown';

type Tool = 'pencil' | 'erase' | 'fill';
type Icon = ComponentType<{ size?: number | string }>;
const W = 448;

/** 16×16 drawing grid for one layer of one face. The duck is drawn faintly as an optional reference. */
function AccessoryCanvas({
  acc, duck, size, face, layer, tool, ch, showDuck, bg,
}: {
  acc: Accessory; duck: Duck; size: DuckSize; face: number; layer: Layer; tool: Tool; ch: string;
  showDuck: boolean; bg: string | null;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const last = useRef<[number, number] | null>(null);
  const theme = useStore((s) => s.theme);
  const art = acc.faces[size][face];
  const colors = accessoryColors(acc);
  const n = canvasSize(size);
  const off = size / 2;

  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    const tc = THEME_COLORS[theme];
    const cell = W / CANVAS;
    ctx.clearRect(0, 0, W, W);
    if (bg) {
      ctx.fillStyle = bg; // a solid color, so grays and dark colors can be told apart
      ctx.fillRect(0, 0, W, W);
    } else {
      for (let y = 0; y < CANVAS; y++)
        for (let x = 0; x < CANVAS; x++) {
          ctx.fillStyle = (x + y) % 2 ? tc.checkerA : tc.checkerB;
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
    }
    const drawLayer = (which: Layer) => {
      ctx.globalAlpha = which === layer ? 1 : 0.35; // the layer being edited is solid, the other is faint
      art[which].forEach((row, y) =>
        [...row].forEach((c, x) => {
          if (c === '.') return;
          ctx.fillStyle = colors[c] ?? '#ff00ff';
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }),
      );
      ctx.globalAlpha = 1;
    };
    drawLayer('under');
    if (showDuck) {
      const cs = W / n;
      ctx.globalAlpha = 0.22; // the duck, as a very faint reference
      duck.frames[size][face].forEach((v, i) => {
        if (!v) return;
        ctx.fillStyle = duck.palette[v - 1];
        ctx.fillRect(((i % size) + off) * cs, (Math.floor(i / size) + off) * cs, cs, cs);
      });
      ctx.globalAlpha = 1;
    }
    drawLayer('over');
    ctx.strokeStyle = bg ? 'rgba(0,0,0,0.14)' : tc.grid;
    ctx.beginPath();
    for (let i = 1; i < CANVAS; i++) {
      ctx.moveTo(i * cell + 0.5, 0); ctx.lineTo(i * cell + 0.5, W);
      ctx.moveTo(0, i * cell + 0.5); ctx.lineTo(W, i * cell + 0.5);
    }
    ctx.stroke();
  });

  const cell = (e: React.PointerEvent): [number, number] => {
    const r = ref.current!.getBoundingClientRect();
    const clamp = (v: number) => Math.min(CANVAS - 1, Math.max(0, v));
    return [clamp(Math.floor(((e.clientX - r.left) / r.width) * CANVAS)), clamp(Math.floor(((e.clientY - r.top) / r.height) * CANVAS))];
  };

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const st = useStore.getState();
    const [x, y] = cell(e);
    if (tool === 'fill') return st.fillAccessory(acc.id, size, face, layer, x, y, ch);
    ref.current!.setPointerCapture(e.pointerId);
    st.beginAccStroke();
    st.paintAccessory(acc.id, size, face, layer, [[x, y]], tool === 'erase' ? '.' : ch);
    last.current = [x, y];
  };
  const onMove = (e: React.PointerEvent) => {
    if (!last.current) return;
    const [x, y] = cell(e);
    const [lx, ly] = last.current;
    if (x === lx && y === ly) return;
    useStore.getState().paintAccessory(acc.id, size, face, layer, linePoints(lx, ly, x, y), tool === 'erase' ? '.' : ch);
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

function Btn({ Icon, label, on, disabled, onClick }: { Icon: Icon; label: string; on?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button className={`tool ${on ? 'on' : ''}`} onClick={onClick} disabled={disabled} title={label} aria-label={label} aria-pressed={on}>
      <Icon size={20} />
    </button>
  );
}

/** Tab "Accessories": the accessory list (add, rename, reorder, delete) and a pixel editor for the selected one. */
export function AccessoryEditor() {
  const accessories = useStore((s) => s.project.accessories);
  const duck = useStore((s) => s.project.ducks.find((d) => d.id === s.activeId)!);
  const canUndo = useStore((s) => s.accPast.length > 0);
  const canRedo = useStore((s) => s.accFuture.length > 0);

  const [selectedId, setSelectedId] = useState<string | null>(accessories[0]?.id ?? null);
  const [size, setSize] = useState<DuckSize>(ENABLED_SIZES[0]);
  const [face, setFace] = useState(0);
  const [layer, setLayer] = useState<Layer>('over');
  const [tool, setTool] = useState<Tool>('pencil');
  const [showDuck, setShowDuck] = useState(true);
  const [bg, setBg] = useState<string | null>(null); // canvas background: null = checkerboard
  const acc = accessories.find((a) => a.id === selectedId) ?? accessories[0] ?? null;
  const slots = acc ? slotsOf(acc) : [];
  const colors = acc ? accessoryColors(acc) : {};
  const [ch, setCh] = useState(acc?.main ?? 'M');
  const missingFactory = defaultAccessories().filter((d) => !accessories.some((a) => a.id === d.id));

  // If the selected letter does not exist in this accessory, use its main color.
  useEffect(() => {
    if (acc && !slots.some((s) => s.letter === ch)) setCh(acc.main);
  }, [acc, ch, slots]);

  const st = () => useStore.getState();
  const { listRef, itemProps, itemStyle, itemClass } = useReorder((id, to) => st().reorderAccessory(id, to));
  const remove = (a: Accessory) => {
    if (!confirm(`Delete "${a.name}"? Ducks wearing it will lose it.`)) return;
    const rest = accessories.filter((x) => x.id !== a.id);
    st().deleteAccessory(a.id);
    setSelectedId(rest[0]?.id ?? null);
  };

  return (
    <main>
      <aside className="panel ducks">
        <h3>
          Accessories <small>{accessories.length}</small>
        </h3>
        <div className="row">
          <button
            className="tool"
            onClick={() => {
              setSelectedId(st().addAccessory());
              setFace(0);
            }}
            title="New empty accessory"
          >
            <RiAddLine size={18} /> New
          </button>
          {missingFactory.length > 0 && (
            <button className="tool" onClick={() => st().restoreFactoryAccessories()} title={`Bring back: ${missingFactory.map((m) => m.name).join(', ')}`}>
              <RiRestartLine size={18} /> Restore
            </button>
          )}
        </div>
        <ul ref={listRef}>
          {accessories.map((a, i) => (
            <li
              key={a.id}
              className={`${a.id === acc?.id ? 'on' : ''} ${itemClass(a.id, i)}`}
              style={itemStyle(a.id)}
              {...itemProps(a.id, i)}
            >
              <button className="thumb-btn" onClick={() => setSelectedId(a.id)} aria-label={`Select ${a.name}`}>
                <AccessoryIcon acc={a} size={size} box={48} />
              </button>
              <input
                value={a.name}
                onFocus={() => setSelectedId(a.id)}
                onChange={(e) => st().renameAccessory(a.id, e.target.value)}
                aria-label="Accessory name"
              />
              <div className="li-row">
                <div className="mini">
                  {a.builtin && (
                    <button
                      onClick={() => confirm(`Reset "${a.name}" to its original drawing?`) && st().resetAccessory(a.id)}
                      title="Reset to the original drawing"
                      aria-label="Reset to the original drawing"
                    >
                      <RiRestartLine size={14} />
                    </button>
                  )}
                  <button onClick={() => st().moveAccessory(a.id, -1)} disabled={i === 0} title="Move up" aria-label="Move up">
                    <RiArrowUpLine size={14} />
                  </button>
                  <button onClick={() => st().moveAccessory(a.id, 1)} disabled={i === accessories.length - 1} title="Move down" aria-label="Move down">
                    <RiArrowDownLine size={14} />
                  </button>
                  <button onClick={() => remove(a)} title="Delete" aria-label="Delete">
                    <RiDeleteBin6Line size={14} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {acc ? (
        <>
          <div className="editor">
            <div className="toolbar">
              <Btn Icon={RiPencilLine} label="Pencil" on={tool === 'pencil'} onClick={() => setTool('pencil')} />
              <Btn Icon={RiEraserLine} label="Eraser" on={tool === 'erase'} onClick={() => setTool('erase')} />
              <Btn Icon={RiPaintFill} label="Fill" on={tool === 'fill'} onClick={() => setTool('fill')} />
              <span className="sep" />
              <Btn Icon={RiArrowGoBackLine} label="Undo" disabled={!canUndo} onClick={() => st().accUndo()} />
              <Btn Icon={RiArrowGoForwardLine} label="Redo" disabled={!canRedo} onClick={() => st().accRedo()} />
              <span className="sep" />
              <Btn Icon={showDuck ? RiEyeLine : RiEyeOffLine} label={showDuck ? 'Hide the duck reference' : 'Show the duck reference'} on={showDuck} onClick={() => setShowDuck((v) => !v)} />
              <Btn Icon={RiFlipHorizontalLine} label="Mirror RIGHT onto LEFT" onClick={() => st().copyAccessoryFace(acc.id, size, 0, 2, true)} />
              <Btn Icon={RiFileCopyLine} label="Copy FRONT onto BACK" onClick={() => st().copyAccessoryFace(acc.id, size, 1, 3, false)} />
              <Btn Icon={RiDeleteBin6Line} label="Clear this face" onClick={() => st().clearAccessoryFace(acc.id, size, face)} />
            </div>

            <div className="row" style={{ maxWidth: 448, width: '100%' }}>
              {ENABLED_SIZES.length > 1 && (
                <div className="size-seg" role="group" aria-label="Duck size">
                  {ENABLED_SIZES.map((n) => (
                    <button key={n} className={`tool ${size === n ? 'on' : ''}`} onClick={() => setSize(n)} title={`Draw for the ${n}×${n} duck`}>
                      {n}×{n}
                    </button>
                  ))}
                </div>
              )}
              <div className="size-seg" role="group" aria-label="Layer">
                {LAYERS.map((l) => (
                  <button
                    key={l}
                    className={`tool ${layer === l ? 'on' : ''}`}
                    onClick={() => setLayer(l)}
                    title={l === 'over' ? 'In front of the duck' : 'Behind the duck'}
                  >
                    {l === 'over' ? 'Front' : 'Behind'}
                  </button>
                ))}
              </div>
            </div>

            <div className="canvas-wrap">
              <AccessoryCanvas acc={acc} duck={duck} size={size} face={face} layer={layer} tool={tool} ch={ch} showDuck={showDuck} bg={bg} />
              <button
                className="bg-btn"
                onClick={() => setBg(nextBackground(bg))}
                title={`Canvas background: ${backgroundName(bg)} (click for the next color)`}
                aria-label={`Canvas background: ${backgroundName(bg)}`}
              >
                <RiPaletteLine size={14} />
              </button>
            </div>

            <div className="size-seg face-seg" role="group" aria-label="Face">
              {FACE_NAMES.map((name, i) => (
                <button key={name} className={`tool ${face === i ? 'on' : ''}`} onClick={() => setFace(i)} aria-pressed={face === i}>
                  {name.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="side">
            <section className="panel">
              <h3>Colors</h3>
              <div className="slots-row">
                {slots.map((s) => (
                  <div key={s.letter} className="slot-item">
                    <button
                      className={`swatch ${ch === s.letter && tool !== 'erase' ? 'on' : ''}`}
                      style={{ background: colors[s.letter] }}
                      onClick={() => {
                        setCh(s.letter);
                        if (tool === 'erase') setTool('pencil');
                      }}
                      title={s.role === 'main' ? 'Main color (the one you change per duck)' : s.role === 'shade' ? 'Darker shade of the main color' : 'Fixed color'}
                      aria-label={s.role}
                    />
                    <small>{s.role === 'main' ? 'Main' : s.role === 'shade' ? 'Shade' : 'Fixed'}</small>
                  </div>
                ))}
              </div>
              <div className="acc-color">
                Default main color
                <ColorDropdown value={acc.defaultColor} onChange={(hex) => st().setAccessoryDefaultColor(acc.id, hex)} label="Default main color" />
              </div>
            </section>
          </div>
        </>
      ) : (
        <div className="editor">
          <p className="hint">There are no accessories. Create one with “New”{missingFactory.length > 0 ? ' or bring the original ones back with “Restore”' : ''}.</p>
        </div>
      )}
    </main>
  );
}
