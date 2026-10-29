import { RiArrowDownSLine } from '@remixicon/react';
import { useEffect, useRef, useState } from 'react';
import { ACCESSORY_COLORS } from '../core/palette';

/** Dropdown with the 12 colors allowed for accessories. */
export function ColorDropdown({
  value,
  onChange,
  label = 'Color',
  disabled = false,
}: {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  /** Greyed out and closed (e.g. no accessory selected). */
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = ACCESSORY_COLORS.find((c) => c.hex === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div className="dropdown" ref={ref}>
      <button
        className="tool dropdown-btn"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        <span className="dropdown-label">
          <span className="swatch-sm" style={{ background: disabled ? 'transparent' : value }} />
          {disabled ? '—' : (current?.name ?? value)}
        </span>
        <RiArrowDownSLine size={18} />
      </button>
      {open && !disabled && (
        <div className="dropdown-menu" role="listbox">
          {ACCESSORY_COLORS.map((c) => (
            <button
              key={c.hex}
              role="option"
              aria-selected={c.hex === value}
              className={`swatch ${c.hex === value ? 'on' : ''}`}
              style={{ background: c.hex }}
              title={c.name}
              onClick={() => {
                onChange(c.hex);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
