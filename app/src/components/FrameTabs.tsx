import { getAccessory } from '../core/accessories';
import { FACE_NAMES, MAX_FRAMES } from '../core/types';
import { useStore } from '../store/useStore';
import { ComposedThumb, Thumb } from './Thumb';

/** The 4 faces of the active duck (they all exist from the moment the duck is created). */
export function FrameTabs() {
  const duck = useStore((s) => s.project.ducks.find((d) => d.id === s.activeId)!);
  const accessories = useStore((s) => s.project.accessories);
  const frameIdx = useStore((s) => s.frameIdx);
  const selectFrame = useStore((s) => s.selectFrame);
  const acc = getAccessory(duck.accessory, accessories);
  const showAcc = useStore((s) => s.showAccessory) && acc !== null;

  return (
    <div className="frames">
      {Array.from({ length: MAX_FRAMES }, (_, i) => (
        <div key={i} className={`frame ${frameIdx === i ? 'on' : ''}`}>
          <button className="frame-main" onClick={() => selectFrame(i)} title={`${FACE_NAMES[i].toUpperCase()} (${i + 1})`}>
            {showAcc ? <ComposedThumb duck={duck} face={i} acc={acc} box={96} /> : <Thumb duck={duck} frame={duck.frames[duck.size][i]} box={96} />}
            <span>{FACE_NAMES[i]}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
