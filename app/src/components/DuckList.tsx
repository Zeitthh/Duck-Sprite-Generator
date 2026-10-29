import { RiAddLine, RiArrowDownLine, RiArrowUpLine, RiDeleteBin6Line, RiFileCopy2Line } from '@remixicon/react';
import { ENABLED_SIZES } from '../core/types';
import { useStore } from '../store/useStore';
import { useReorder } from './useReorder';
import { Thumb } from './Thumb';

export function DuckList() {
  const ducks = useStore((s) => s.project.ducks);
  const activeId = useStore((s) => s.activeId);
  const { setDuckSize, selectDuck, addDuck, duplicateDuck, deleteDuck, renameDuck, moveDuck } = useStore();
  const reorderDuck = useStore((s) => s.reorderDuck);
  const { listRef, itemProps, itemStyle, itemClass } = useReorder(reorderDuck);

  return (
    <aside className="panel ducks">
      <h3>
        Ducks <small>{ducks.length}</small>
      </h3>
      <div className="row">
        <button className="tool" onClick={addDuck} title="New duck">
          <RiAddLine size={18} /> New
        </button>
        <button className="tool" onClick={duplicateDuck} title="Duplicate the current duck">
          <RiFileCopy2Line size={18} /> Duplicate
        </button>
      </div>
      <ul ref={listRef}>
        {ducks.map((d, i) => (
          <li
            key={d.id}
            className={`${d.id === activeId ? 'on' : ''} ${itemClass(d.id, i)}`}
            style={itemStyle(d.id)}
            {...itemProps(d.id, i)}
          >
            <button className="thumb-btn" onClick={() => selectDuck(d.id)} aria-label={`Seleccionar ${d.name}`}>
              <Thumb duck={d} frame={d.frames[d.size][0]} box={48} />
            </button>
            <input
              value={d.name}
              onFocus={() => selectDuck(d.id)}
              onChange={(e) => renameDuck(d.id, e.target.value)}
              aria-label="Duck name"
            />
            <div className="li-row">
            {ENABLED_SIZES.length > 1 && (
            <div className="size-seg" role="group" aria-label="Duck version">
              {ENABLED_SIZES.map((n) => (
                <button
                  key={n}
                  className={`tool ${d.size === n ? 'on' : ''}`}
                  onClick={() => setDuckSize(d.id, n)}
                  title={`Edit the ${n}×${n} version`}
                >
                  {n}×{n}
                </button>
              ))}
            </div>
            )}
            <div className="mini">
              <button onClick={() => moveDuck(d.id, -1)} disabled={i === 0} title="Move up">
                <RiArrowUpLine size={14} />
              </button>
              <button onClick={() => moveDuck(d.id, 1)} disabled={i === ducks.length - 1} title="Move down">
                <RiArrowDownLine size={14} />
              </button>
              <button
                // TEMPORAL: confirmación desactivada. Para restaurarla: confirm(`Delete "${d.name}"?`) && deleteDuck(d.id)
                onClick={() => deleteDuck(d.id)}
                title="Delete"
              >
                <RiDeleteBin6Line size={14} />
              </button>
            </div>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
