import { useEffect } from 'react';
import { AccessoryEditor } from './components/AccessoryEditor';
import { AccessoryPanel } from './components/AccessoryPanel';
import { DuckList } from './components/DuckList';
import { FrameTabs } from './components/FrameTabs';
import { PalettePanel } from './components/PalettePanel';
import { PixelCanvas } from './components/PixelCanvas';
import { Preview } from './components/Preview';
import { Toolbar } from './components/Toolbar';
import { TopBar } from './components/TopBar';
import { useStore } from './store/useStore';

const KEYS: Record<string, 'pencil' | 'erase' | 'fill' | 'pick'> = { b: 'pencil', e: 'erase', g: 'fill', i: 'pick' };

export default function App() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') return;
      const st = useStore.getState();
      if (st.tab === 'accessories') {
        // En la pestaña de accesorios solo funcionan deshacer / rehacer.
        const key = e.key.toLowerCase();
        if ((e.ctrlKey || e.metaKey) && key === 'z') {
          e.preventDefault();
          e.shiftKey ? st.accRedo() : st.accUndo();
        } else if ((e.ctrlKey || e.metaKey) && key === 'y') {
          e.preventDefault();
          st.accRedo();
        }
        return;
      }
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') {
        e.preventDefault();
        e.shiftKey ? st.redo() : st.undo();
      } else if ((e.ctrlKey || e.metaKey) && k === 'y') {
        e.preventDefault();
        st.redo();
      } else if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      } else if (KEYS[k]) st.setTool(KEYS[k]);
      else if (k === 'm') st.toggleMirror();
      else if (['1', '2', '3', '4'].includes(k)) st.selectFrame(+k - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const tab = useStore((s) => s.tab);

  return (
    <div className="app">
      <TopBar />
      {tab === 'accessories' ? (
        <AccessoryEditor />
      ) : (
        <main>
          <DuckList />
          <div className="editor">
            <Toolbar />
            <PixelCanvas />
            <FrameTabs />
          </div>
          <div className="side">
            <Preview />
            <PalettePanel />
            <AccessoryPanel />
          </div>
        </main>
      )}
    </div>
  );
}
