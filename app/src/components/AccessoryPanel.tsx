import { RiDiceLine, RiForbidLine } from '@remixicon/react';
import { getAccessory } from '../core/accessories';
import { useStore } from '../store/useStore';
import { AccessoryTile } from './AccessoryTile';
import { ColorDropdown } from './ColorDropdown';

/** Pick the accessory of the current duck (always visible) and its main color. Shown in the preview. */
export function AccessoryPanel() {
  const duck = useStore((s) => s.project.ducks.find((d) => d.id === s.activeId)!);
  const accessories = useStore((s) => s.project.accessories);
  const { setAccessory, setAccessoryColor, randomizeAccessory } = useStore();
  const acc = getAccessory(duck.accessory, accessories);

  return (
    <section className="panel">
      <div className="panel-head">
        <h3>Accessories</h3>
        <span className="head-btns">
        <button className="none-btn" onClick={randomizeAccessory} title="Random accessory and color" aria-label="Random accessory and color">
          <RiDiceLine size={16} />
        </button>
        <button
          className={`none-btn ${acc === null ? 'on' : ''}`}
          onClick={() => setAccessory(null)}
          title="No accessory"
          aria-label="No accessory"
          aria-pressed={acc === null}
        >
          <RiForbidLine size={16} />
        </button>
        </span>
      </div>

      <ColorDropdown
        value={acc ? (duck.accessoryColor ?? acc.defaultColor) : '#000000'}
        onChange={setAccessoryColor}
        label={acc ? `${acc.name} color` : 'Accessory color'}
        disabled={acc === null}
      />

      <div className="tiles cols-3">
        {accessories.map((a) => (
          <AccessoryTile
            key={a.id}
            size={duck.size}
            acc={a}
            selected={acc?.id === a.id}
            color={acc?.id === a.id ? duck.accessoryColor : null}
            onClick={() => setAccessory(a.id)}
          />
        ))}
      </div>
    </section>
  );
}
