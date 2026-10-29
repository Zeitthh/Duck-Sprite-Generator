import { RiAddLine, RiDeleteBin6Line, RiHashtag, RiPaletteLine, RiRefreshLine } from '@remixicon/react';
import { useEffect, useState } from 'react';
import { BASIC_COLORS, normalizeHex } from '../core/palette';
import { colorUsedByTemplate } from '../core/template';
import { MAX_COLORS } from '../core/types';
import { useStore } from '../store/useStore';

export function PalettePanel() {
  const duck = useStore((s) => s.project.ducks.find((d) => d.id === s.activeId)!);
  const colorIdx = useStore((s) => s.colorIdx);
  const { setColorIdx, addColor, replaceColor, removeColor } = useStore();
  const [mode, setMode] = useState<'basic' | 'advanced'>('basic');
  const selected = colorIdx > 0 ? duck.palette[colorIdx - 1] : '#ffffff';
  const [hex, setHex] = useState(selected);
  const [msg, setMsg] = useState('');

  // El campo hex sigue al color seleccionado.
  useEffect(() => {
    setHex(selected);
    setMsg('');
  }, [selected, duck.id]);

  const valid = normalizeHex(hex);
  const inSilhouette = colorIdx > 0 && colorUsedByTemplate(duck, colorIdx);
  const full = duck.palette.length >= MAX_COLORS;

  const add = () => {
    if (!valid) return setMsg('Invalid hex (e.g. #ff8c00)');
    setMsg(addColor(valid) ? '' : `Maximum ${MAX_COLORS} colors`);
  };
  const replace = () => {
    if (!valid || colorIdx === 0) return setMsg('Invalid hex');
    if (valid === selected) return;
    setMsg(replaceColor(colorIdx, valid) ? '' : 'That color is already in the palette');
  };

  return (
    <section className="panel">
      <h3>
        Palette <small>{duck.palette.length}/{MAX_COLORS}</small>
      </h3>

      <div className="swatches">
        {duck.palette.map((c, i) => (
          <button
            key={c + i}
            className={`swatch ${colorIdx === i + 1 ? 'on' : ''}`}
            style={{ background: c }}
            onClick={() => setColorIdx(i + 1)}
            title={c}
          />
        ))}
        {duck.palette.length === 0 && <span className="hint">No colors. Add one below.</span>}
      </div>

      <div className="seg">
        <button className={`tool ${mode === 'basic' ? 'on' : ''}`} onClick={() => setMode('basic')}>
          <RiPaletteLine size={16} /> Basic
        </button>
        <button className={`tool ${mode === 'advanced' ? 'on' : ''}`} onClick={() => setMode('advanced')}>
          <RiHashtag size={16} /> Advanced
        </button>
      </div>

      {mode === 'basic' ? (
        <div className="swatches basic">
          {BASIC_COLORS.map((c) => (
            <button
              key={c.hex}
              className="swatch"
              style={{ background: c.hex }}
              title={`${c.name} ${c.hex}`}
              disabled={full && !duck.palette.includes(c.hex)}
              onClick={() => addColor(c.hex)}
            />
          ))}
        </div>
      ) : (
        <div className="advanced">
          <div className="hex-row">
            <input
              type="color"
              value={valid ?? '#000000'}
              onChange={(e) => setHex(e.target.value)}
              aria-label="Selector de color"
            />
            <input
              className={valid ? '' : 'bad'}
              value={hex}
              maxLength={7}
              spellCheck={false}
              onChange={(e) => setHex(e.target.value)}
              aria-label="Color hexadecimal"
              placeholder="#rrggbb"
            />
          </div>
          <div className="row">
            <button className="tool" onClick={add} disabled={!valid || full}>
              <RiAddLine size={16} /> Add
            </button>
            <button className="tool" onClick={replace} disabled={!valid || colorIdx === 0} title="Change the selected color everywhere in the duck">
              <RiRefreshLine size={16} /> Replace
            </button>
          </div>
        </div>
      )}
      {msg && <p className="error">{msg}</p>}

      <button
        className="tool danger small"
        disabled={colorIdx === 0 || inSilhouette}
        onClick={() => removeColor(colorIdx)}
        title={inSilhouette ? 'The outline uses this color: repaint it with another color first' : 'Remove the color from the palette'}
      >
        <RiDeleteBin6Line size={14} /> Remove selected color
      </button>
    </section>
  );
}
