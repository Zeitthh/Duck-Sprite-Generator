import {
  RiArrowGoBackLine,
  RiArrowGoForwardLine,
  RiDropperLine,
  RiEraserLine,
  RiFlipHorizontalLine,
  RiGridLine,
  RiPaintFill,
  RiPencilLine,
  RiVipCrownLine,
  RiRestartLine,
  RiDiceLine,
} from '@remixicon/react';
import { Fragment, useEffect, useRef, useState, type ComponentType } from 'react';
import { fantasyPattern, MEXICAN_BIRDS } from '../core/randomize';
import { useStore, type Tool } from '../store/useStore';

type Icon = ComponentType<{ size?: number | string }>;

const TOOLS: { id: Tool; label: string; key: string; Icon: Icon }[] = [
  { id: 'pencil', label: 'Pencil', key: 'B', Icon: RiPencilLine },
  { id: 'erase', label: 'Eraser', key: 'E', Icon: RiEraserLine },
  { id: 'fill', label: 'Fill', key: 'G', Icon: RiPaintFill },
  { id: 'pick', label: 'Eyedropper', key: 'I', Icon: RiDropperLine },
];

function Btn({
  Icon,
  label,
  title,
  on,
  disabled,
  onClick,
}: {
  Icon: Icon;
  label: string;
  title: string;
  on?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`tool ${on ? 'on' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={label}
      aria-pressed={on}
    >
      <Icon size={20} />
    </button>
  );
}

export function Toolbar() {
  const { tool, setTool, mirror, toggleMirror, showGrid, toggleGrid, undo, redo, resetFrame } =
    useStore();
  const showAccessory = useStore((s) => s.showAccessory);
  const toggleShowAccessory = useStore((s) => s.toggleShowAccessory);
  const hasAccessory = useStore((s) => s.project.ducks.find((d) => d.id === s.activeId)!.accessory !== null);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);

  const randomizeDuck = useStore((s) => s.randomizeDuck);
  const [menu, setMenu] = useState(false);
  const [last, setLast] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menu]);

  const apply = (p: { name: string; crown: string; face: string; chest: string; belly: string }) => {
    randomizeDuck(p);
    setLast(p.name);
    setMenu(false);
  };
  const surprise = () => apply(Math.random() < 0.2 ? fantasyPattern() : MEXICAN_BIRDS[Math.floor(Math.random() * MEXICAN_BIRDS.length)]);

  return (
    <div className="toolbar">
      {TOOLS.map((t) => (
        <Btn key={t.id} Icon={t.Icon} label={t.label} title={`${t.label} (${t.key})`} on={tool === t.id} onClick={() => setTool(t.id)} />
      ))}
      <span className="sep" />
      <Btn Icon={RiFlipHorizontalLine} label="Mirror" title="Horizontal mirror (M)" on={mirror} onClick={toggleMirror} />
      <Btn Icon={RiGridLine} label="Grid" title="Show grid" on={showGrid} onClick={toggleGrid} />
      <Btn
        Icon={RiVipCrownLine}
        label="Show accessory"
        title={hasAccessory ? 'Show the accessory face by face on the canvas (the preview shows it moving)' : 'Pick an accessory first'}
        on={showAccessory && hasAccessory}
        disabled={!hasAccessory}
        onClick={toggleShowAccessory}
      />
      <span className="sep" />
      <Btn Icon={RiArrowGoBackLine} label="Undo" title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={undo} />
      <Btn Icon={RiArrowGoForwardLine} label="Redo" title="Redo (Ctrl+Y)" disabled={!canRedo} onClick={redo} />
      <span className="sep" />
      <Btn
        Icon={RiRestartLine}
        label="Reset face"
        title="Reset the face to the original white duck"
        onClick={resetFrame}
      />
      <span className="sep" />
      <div className="menu-wrap" ref={ref}>
        <button
          className={`tool ${menu ? 'on' : ''}`}
          onClick={() => setMenu((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={menu}
          aria-label="Randomize the duck"
          title={last ? `Randomize the duck (last: ${last})` : 'Randomize the duck'}
        >
          <RiDiceLine size={20} />
        </button>
        {menu && (
          <div className="menu" role="menu">
            <button role="menuitem" onClick={surprise}>
              <RiDiceLine size={16} /> Surprise me
            </button>
            <button role="menuitem" onClick={() => apply(fantasyPattern())}>
              Fantasy colors
            </button>
            {MEXICAN_BIRDS.map((b, i) => (
              <Fragment key={b.name}>
                {b.group !== MEXICAN_BIRDS[i - 1]?.group && <div className="menu-group">{b.group}</div>}
                <button role="menuitem" onClick={() => apply(b)}>
                  <span style={{ display: 'inline-flex' }}>
                    {[b.crown, b.face, b.chest, b.belly].map((c, k) => (
                      <i key={k} style={{ width: 8, height: 14, background: c, display: 'block' }} />
                    ))}
                  </span>
                  {b.name}
                </button>
              </Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
