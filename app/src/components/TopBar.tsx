import {
  RiArrowDownSLine,
  RiEdit2Line,
  RiFileDownloadLine,
  RiFileGifLine,
  RiImageLine,
  RiLayoutColumnLine,
  RiSaveLine,
  RiSunCloudyLine,
  RiSunLine,
  RiUploadLine,
  RiVipCrownLine,
} from '@remixicon/react';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { getAccessory } from '../core/accessories';
import {
  atSize,
  buildAccessoryManifest,
  buildGif,
  buildManifest,
  canvasToBytes,
  downloadBlob,
  downloadCanvas,
  downloadText,
  drawAccessorySheet,
  drawComposedFace,
  drawComposedStrip,
  drawSheet,
  projectToJson,
  slugify,
  textToBytes,
} from '../core/export';
import { createZip, type ZipFile } from '../core/zip';
import { THEMES, THEME_LABEL, type Theme } from '../core/theme';
import { ENABLED_SIZES, FACE_NAMES } from '../core/types';
import { useStore } from '../store/useStore';

const THEME_ICON: Record<Theme, ComponentType<{ size?: number | string }>> = {
  dim: RiSunCloudyLine,
  light: RiSunLine,
};

/** Top bar: the two tabs on the left; theme, image, project and export actions on the right. */
export function TopBar() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const project = useStore((s) => s.project);
  const activeId = useStore((s) => s.activeId);
  const importProject = useStore((s) => s.importProject);
  const frameIdx = useStore((s) => s.frameIdx);
  const [pngMenu, setPngMenu] = useState(false);
  const pngRef = useRef<HTMLDivElement>(null);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const ThemeIcon = THEME_ICON[theme];
  /** One button: each click switches to the other theme. */
  const nextTheme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];

  const duck = project.ducks.find((d) => d.id === activeId)!;
  const acc = getAccessory(duck.accessory, project.accessories);
  const name = slugify(duck.name);
  const multi = ENABLED_SIZES.length > 1;
  /** With only the 8×8 enabled files are named after the duck; with more sizes they get a `_8x8` suffix. */
  const fileFor = (size: number) => (multi ? `${name}_${size}x${size}` : name);

  // The PNG menu closes with a click anywhere else or Esc.
  useEffect(() => {
    if (!pngMenu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !pngRef.current?.contains(e.target as Node)) setPngMenu(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [pngMenu]);

  // The status message fades after a moment.
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 2500);
    return () => clearTimeout(t);
  }, [msg]);

  /**
   * Export: ONE download (`<duck>.zip`) with the sprite sheet (PNG + JSON) of the duck being edited and, if it is wearing
   * one, the sheet of THAT accessory (`accessory-<name>`, in the color chosen for this duck). Several loose files would make
   * the browser ask for permission to download multiple files.
   */
  const exportSheet = async () => {
    const files: ZipFile[] = [];
    for (const size of ENABLED_SIZES) {
      const sized = atSize(duck, size);
      const file = fileFor(size);
      const manifest = buildManifest([sized], project.fps, `${file}.png`);
      files.push({ name: `${file}.png`, data: await canvasToBytes(drawSheet([sized], manifest)) });
      files.push({ name: `${file}.json`, data: textToBytes(JSON.stringify(manifest, null, 2)) });
    }
    let withAccessory = '';
    if (acc) {
      const slug = slugify(acc.name, 'accessory');
      for (const size of ENABLED_SIZES) {
        const base = `accessory-${slug}`;
        const file = multi ? `${base}_${size}x${size}` : base;
        const manifest = buildAccessoryManifest(acc, size, slug, `${file}.png`);
        if (!manifest) continue; // an empty accessory has nothing to export
        files.push({ name: `${file}.png`, data: await canvasToBytes(drawAccessorySheet(acc, size, manifest, duck.accessoryColor)) });
        files.push({ name: `${file}.json`, data: textToBytes(JSON.stringify(manifest, null, 2)) });
        withAccessory = acc.name;
      }
    }
    downloadBlob(new Blob([createZip(files)], { type: 'application/zip' }), `${name}.zip`);
    setMsg(withAccessory ? `Exported ${name}.zip (+ ${withAccessory})` : `Exported ${name}.zip`);
  };

  /** PNG: the 4 faces in one image, or only the face being edited. Either way it wears the accessory; the zoom is automatic. */
  const exportImage = (which: 'all' | 'current') => {
    setPngMenu(false);
    if (which === 'all') {
      downloadCanvas(drawComposedStrip(duck, acc), `${name}_faces.png`);
      setMsg('PNG saved (4 faces)');
    } else {
      downloadCanvas(drawComposedFace(duck, acc, frameIdx), `${name}_${FACE_NAMES[frameIdx]}.png`);
      setMsg(`PNG saved (${FACE_NAMES[frameIdx].toUpperCase()})`);
    }
  };

  /** Animated GIF: the 4 faces looping at the project speed, wearing the accessory, transparent background. */
  const exportGif = () => {
    downloadBlob(new Blob([buildGif(duck, acc, project.fps)], { type: 'image/gif' }), `${name}_faces.gif`);
    setMsg('GIF saved');
  };

  const onFile = async (file: File) => {
    try {
      importProject(JSON.parse(await file.text()), 'append');
      setMsg('Imported');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not import');
    }
  };

  return (
    <header className="topbar">
      <nav className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'duck'} className={`tab ${tab === 'duck' ? 'on' : ''}`} onClick={() => setTab('duck')}>
          <RiEdit2Line size={18} /> Duck
        </button>
        <button
          role="tab"
          aria-selected={tab === 'accessories'}
          className={`tab ${tab === 'accessories' ? 'on' : ''}`}
          onClick={() => setTab('accessories')}
        >
          <RiVipCrownLine size={18} /> Accessories
        </button>
      </nav>

      <div className="actions">
        {msg && (
          <span className="status" role="status">
            {msg}
          </span>
        )}

        <div className="group" role="group" aria-label="Image">
          <div className="menu-wrap" ref={pngRef}>
            <button className="tool" onClick={() => setPngMenu((o) => !o)} aria-haspopup="menu" aria-expanded={pngMenu} aria-label="Download a PNG">
              <RiImageLine size={18} /> <span className="label">PNG</span> <RiArrowDownSLine size={14} />
            </button>
            {pngMenu && (
              <div className="menu" role="menu">
                <button role="menuitem" onClick={() => exportImage('all')}>
                  <RiLayoutColumnLine size={16} /> Full PNG <small>4 faces</small>
                </button>
                <button role="menuitem" onClick={() => exportImage('current')}>
                  <RiImageLine size={16} /> Current face <small>{FACE_NAMES[frameIdx].toUpperCase()}</small>
                </button>
              </div>
            )}
          </div>
          <button className="tool" onClick={exportGif} aria-label="Download the animated GIF">
            <RiFileGifLine size={18} /> <span className="label">GIF</span>
          </button>
        </div>

        <div className="group" role="group" aria-label="Project">
          <button className="tool" onClick={() => downloadText(projectToJson(project), 'project.duck.json')} aria-label="Save the project">
            <RiSaveLine size={18} /> <span className="label">Save</span>
          </button>
          <button className="tool" onClick={() => fileRef.current?.click()} aria-label="Import a project">
            <RiUploadLine size={18} /> <span className="label">Import</span>
          </button>
          <button className="tool" onClick={() => void exportSheet()} aria-label="Export the sprite sheet">
            <RiFileDownloadLine size={18} /> <span className="label">Export</span>
          </button>
        </div>

        <div className="group group-theme">
          <button
            className="tool theme-btn"
            onClick={() => setTheme(nextTheme)}
            aria-label={`Switch to the ${THEME_LABEL[nextTheme]} theme`}
          >
            <ThemeIcon size={18} />
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = '';
        }}
      />
    </header>
  );
}
