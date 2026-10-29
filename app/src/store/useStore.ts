import { create } from 'zustand';
import { floodFill, idx, paintCells, withMirror, type Point } from '../core/grid';
import {
  blankAccessory,
  blankFace,
  cloneFace,
  defaultAccessories,
  fillArt,
  mirrorFace,
  paintArt,
  type Layer,
} from '../core/accessories';
import { ACCESSORY_COLORS, addColor, removeColor, replaceColor } from '../core/palette';
import { colorUsedByTemplate, defaultFrame, faceWidth, withBasePalette, withoutLocked } from '../core/template';
import { moveToIndex } from '../core/list';
import { cloneDuck, enforceEnabledSizes, newDuck, parseProject } from '../core/project';
import { applyPattern, type DuckPattern } from '../core/randomize';
import { randomDuckName } from '../core/names';
import { loadProject, saveProject } from '../core/storage';
import { applyTheme, loadTheme, saveTheme, type Theme } from '../core/theme';
import { newId } from '../core/id';
import { ENABLED_SIZES, type Accessory, type Duck, type DuckSize, type Frame, type Project } from '../core/types';

export type Tool = 'pencil' | 'erase' | 'fill' | 'pick';
export type Tab = 'duck' | 'accessories';

const HISTORY_LIMIT = 100;

interface State {
  project: Project;
  activeId: string;
  frameIdx: number;
  tool: Tool;
  colorIdx: number; // 1..n, 0 = ninguno
  mirror: boolean;
  showGrid: boolean;
  /** Pestaña visible: el editor de patos o el de accesorios. */
  tab: Tab;
  theme: Theme;
  /** Dibuja el accesorio del pato sobre el lienzo de edición (y en las caras). */
  showAccessory: boolean;
  past: Duck[];
  future: Duck[];
  /** Historial del editor de accesorios (instantáneas de la lista de accesorios). */
  accPast: Accessory[][];
  accFuture: Accessory[][];

  setTool: (t: Tool) => void;
  setColorIdx: (i: number) => void;
  toggleMirror: () => void;
  toggleGrid: () => void;
  setTab: (tab: Tab) => void;
  setTheme: (theme: Theme) => void;
  toggleShowAccessory: () => void;
  setFps: (fps: number) => void;

  selectDuck: (id: string) => void;
  addDuck: () => void;
  /** Cambia la versión (8×8 / 16×16) que se edita de ese pato. */
  setDuckSize: (id: string, size: DuckSize) => void;
  /** Pone o quita el accesorio del pato activo (no entra en deshacer). */
  setAccessory: (id: string | null) => void;
  /** Color principal del accesorio (un color básico) o null para el de por defecto. */
  setAccessoryColor: (hex: string | null) => void;
  /** Elige al azar un accesorio (distinto del actual) y un color principal. */
  randomizeAccessory: () => void;
  duplicateDuck: () => void;
  deleteDuck: (id: string) => void;
  renameDuck: (id: string, name: string) => void;
  moveDuck: (id: string, dir: -1 | 1) => void;
  /** Arrastrar: deja el pato en esa posición de la lista. */
  reorderDuck: (id: string, toIndex: number) => void;
  importProject: (data: unknown, mode: 'replace' | 'append') => void;

  selectFrame: (i: number) => void;
  /** Vuelve la cara actual al pato blanco por defecto. */
  resetFrame: () => void;
  /** Pinta el pato activo con un patrón de color (se puede deshacer). */
  randomizeDuck: (pattern: DuckPattern) => void;

  beginStroke: () => void;
  paint: (points: Point[]) => void;
  fill: (x: number, y: number) => void;
  pick: (x: number, y: number) => void;

  addColor: (hex: string) => boolean;
  replaceColor: (index: number, hex: string) => boolean;
  /** false si el color lo usa la silueta (hay que recolorearla antes). */
  removeColor: (index: number) => boolean;

  undo: () => void;
  redo: () => void;

  // --- editor de accesorios ---
  /** Crea un accesorio vacío y devuelve su id. */
  addAccessory: () => string;
  /** Borra un accesorio (también los de fábrica; se pueden restaurar); los patos que lo llevaban se quedan sin accesorio. */
  deleteAccessory: (id: string) => void;
  /** Devuelve un accesorio de fábrica a su dibujo original. */
  resetAccessory: (id: string) => void;
  renameAccessory: (id: string, name: string) => void;
  /** Sube (-1) o baja (+1) un accesorio dentro de la lista. */
  moveAccessory: (id: string, dir: -1 | 1) => void;
  /** Arrastrar: deja el accesorio en esa posición de la lista. */
  reorderAccessory: (id: string, toIndex: number) => void;
  /** Devuelve los accesorios de fábrica que se hayan borrado. */
  restoreFactoryAccessories: () => void;
  setAccessoryDefaultColor: (id: string, hex: string) => void;
  /** Guarda un punto de deshacer antes de un trazo en el editor de accesorios. */
  beginAccStroke: () => void;
  paintAccessory: (id: string, size: DuckSize, face: number, layer: Layer, cells: Point[], ch: string) => void;
  fillAccessory: (id: string, size: DuckSize, face: number, layer: Layer, x: number, y: number, ch: string) => void;
  /** Vacía las dos capas de una cara. */
  clearAccessoryFace: (id: string, size: DuckSize, face: number) => void;
  /** Copia una cara sobre otra (con `flip`, reflejada: right -> left). */
  copyAccessoryFace: (id: string, size: DuckSize, from: number, to: number, flip: boolean) => void;
  accUndo: () => void;
  accRedo: () => void;
}

const initialTheme = loadTheme();
applyTheme(initialTheme);
const initial = loadProject(); // ya viene con los tamaños desactivados forzados a uno activo

export const useStore = create<State>((set, get) => {
  const active = (s = get()) => s.project.ducks.find((d) => d.id === s.activeId)!;

  const withDuck = (s: State, duck: Duck): Project => ({
    ...s.project,
    ducks: s.project.ducks.map((d) => (d.id === duck.id ? duck : d)),
  });

  /** Guarda un punto de deshacer y aplica el nuevo estado del pato activo. */
  const commit = (fn: (d: Duck) => Duck | null, extra: Partial<State> = {}) => {
    const s = get();
    const before = active(s);
    const after = fn(before);
    if (!after) return false;
    set({
      project: withDuck(s, after),
      past: [...s.past, before].slice(-HISTORY_LIMIT),
      future: [],
      ...extra,
    });
    return true;
  };

  /** Cambia una cara de la versión que se está editando. */
  const setFrame = (d: Duck, i: number, f: Frame): Duck => ({
    ...d,
    frames: { ...d.frames, [d.size]: d.frames[d.size].map((x, k) => (k === i ? f : x)) },
  });


  // --- accesorios: cambios sobre la lista con/ sin punto de deshacer ---
  const setAcc = (list: Accessory[]) => set((s) => ({ project: { ...s.project, accessories: list } }));
  /** Cambio discreto: guarda un punto de deshacer y aplica. */
  const commitAcc = (fn: (list: Accessory[]) => Accessory[]) => {
    const s = get();
    set({ accPast: [...s.accPast, s.project.accessories].slice(-HISTORY_LIMIT), accFuture: [] });
    setAcc(fn(s.project.accessories));
  };
  /** Cambio continuo (un trazo): el punto de deshacer ya se guardó con beginAccStroke. */
  const editAcc = (id: string, fn: (a: Accessory) => Accessory) =>
    setAcc(get().project.accessories.map((a) => (a.id === id ? fn(a) : a)));
  const setFace = (a: Accessory, size: DuckSize, face: number, art: Accessory['faces'][DuckSize][number]): Accessory => ({
    ...a,
    faces: { ...a.faces, [size]: a.faces[size].map((f, i) => (i === face ? art : f)) },
  });
  const setFaceLayer = (a: Accessory, size: DuckSize, face: number, layer: Layer, fn: (rows: string[]) => string[]) =>
    setFace(a, size, face, { ...a.faces[size][face], [layer]: fn(a.faces[size][face][layer]) });

  return {
    project: initial,
    activeId: initial.ducks[0].id,
    frameIdx: 0,
    tool: 'pencil',
    colorIdx: 1,
    mirror: false,
    showGrid: true,
    tab: 'duck',
    theme: initialTheme,
    showAccessory: false,
    past: [],
    future: [],
    accPast: [],
    accFuture: [],

    setTool: (tool) => set({ tool }),
    setColorIdx: (colorIdx) => set({ colorIdx }),
    toggleMirror: () => set((s) => ({ mirror: !s.mirror })),
    toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
    setTab: (tab) => set({ tab }),
    setTheme: (theme) => {
      saveTheme(theme);
      applyTheme(theme);
      set({ theme });
    },
    toggleShowAccessory: () => set((s) => ({ showAccessory: !s.showAccessory })),
    setFps: (fps) => set((s) => ({ project: { ...s.project, fps: Math.min(60, Math.max(1, fps || 1)) } })),

    selectDuck: (id) => set({ activeId: id, frameIdx: 0, colorIdx: 1, past: [], future: [] }),
    addDuck: () => {
      const d = newDuck(randomDuckName(get().project.ducks.map((x) => x.name)));
      set((s) => ({
        project: { ...s.project, ducks: [...s.project.ducks, d] },
        activeId: d.id,
        frameIdx: 0,
        colorIdx: 1,
        past: [],
        future: [],
      }));
    },
    setDuckSize: (id, size) =>
      set((s) => {
        if (!ENABLED_SIZES.includes(size)) return {}; // 16×16 desactivado temporalmente
        const project = { ...s.project, ducks: s.project.ducks.map((d) => (d.id === id ? { ...d, size } : d)) };
        return id === s.activeId
          ? { project }
          : { project, activeId: id, frameIdx: 0, colorIdx: 1, past: [], future: [] };
      }),
    setAccessory: (id) =>
      set((s) => ({
        project: { ...s.project, ducks: s.project.ducks.map((d) => (d.id === s.activeId ? { ...d, accessory: id, accessoryColor: null } : d)) },
      })),
    randomizeAccessory: () =>
      set((s) => {
        const current = s.project.ducks.find((d) => d.id === s.activeId)?.accessory;
        const pool = s.project.accessories.filter((a) => a.id !== current);
        const pick = (pool.length ? pool : s.project.accessories)[Math.floor(Math.random() * (pool.length || s.project.accessories.length))];
        if (!pick) return {};
        const color = ACCESSORY_COLORS[Math.floor(Math.random() * ACCESSORY_COLORS.length)].hex;
        return {
          project: { ...s.project, ducks: s.project.ducks.map((d) => (d.id === s.activeId ? { ...d, accessory: pick.id, accessoryColor: color } : d)) },
        };
      }),
    setAccessoryColor: (hex) =>
      set((s) => ({
        project: { ...s.project, ducks: s.project.ducks.map((d) => (d.id === s.activeId ? { ...d, accessoryColor: hex } : d)) },
      })),
    duplicateDuck: () => {
      const d = cloneDuck(active());
      set((s) => ({
        project: { ...s.project, ducks: [...s.project.ducks, d] },
        activeId: d.id,
        frameIdx: 0,
        past: [],
        future: [],
      }));
    },
    deleteDuck: (id) =>
      set((s) => {
        if (s.project.ducks.length <= 1) {
          // Nunca dejar el proyecto vacío: reemplazar por un pato nuevo.
          const d = newDuck('Duck 1');
          return { project: { ...s.project, ducks: [d] }, activeId: d.id, frameIdx: 0, colorIdx: 1, past: [], future: [] };
        }
        const ducks = s.project.ducks.filter((d) => d.id !== id);
        const activeId = s.activeId === id ? ducks[0].id : s.activeId;
        return {
          project: { ...s.project, ducks },
          activeId,
          frameIdx: s.activeId === id ? 0 : s.frameIdx,
          past: s.activeId === id ? [] : s.past,
          future: s.activeId === id ? [] : s.future,
        };
      }),
    renameDuck: (id, name) =>
      set((s) => ({
        project: { ...s.project, ducks: s.project.ducks.map((d) => (d.id === id ? { ...d, name } : d)) },
      })),
    moveDuck: (id, dir) =>
      set((s) => {
        const ducks = s.project.ducks.slice();
        const i = ducks.findIndex((d) => d.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= ducks.length) return {};
        [ducks[i], ducks[j]] = [ducks[j], ducks[i]];
        return { project: { ...s.project, ducks } };
      }),
    reorderDuck: (id, toIndex) =>
      set((s) => {
        const ducks = moveToIndex(s.project.ducks, id, toIndex);
        return ducks === s.project.ducks ? {} : { project: { ...s.project, ducks } };
      }),
    importProject: (data, mode) => {
      const p = enforceEnabledSizes(parseProject(data));
      set((s) => {
        if (mode === 'replace')
          return { project: p, activeId: p.ducks[0].id, frameIdx: 0, colorIdx: 1, past: [], future: [] };
        const known = new Set(s.project.ducks.map((d) => d.id));
        const added = p.ducks.map((d) => (known.has(d.id) ? cloneDuck(d) : d));
        return { project: { ...s.project, ducks: [...s.project.ducks, ...added] } };
      });
    },

    randomizeDuck: (pattern) => void commit((d) => applyPattern(d, pattern), { colorIdx: 1 }),
    selectFrame: (frameIdx) => set({ frameIdx }),
    resetFrame: () =>
      commit((d) => {
        const face = get().frameIdx;
        return setFrame({ ...d, palette: withBasePalette(d.palette) }, face, defaultFrame(d.size, face));
      }),

    beginStroke: () => {
      const s = get();
      set({ past: [...s.past, active(s)].slice(-HISTORY_LIMIT), future: [] });
    },
    paint: (points) => {
      const s = get();
      const d = active(s);
      const f = d.frames[d.size][s.frameIdx];
      const value = s.tool === 'erase' ? 0 : s.colorIdx;
      if (s.tool !== 'erase' && value === 0) return;
      let pts = s.mirror ? withMirror(points, faceWidth(d.size, s.frameIdx)) : points;
      // La silueta de la plantilla no se puede borrar, solo recolorear.
      if (value === 0) pts = withoutLocked(d.size, s.frameIdx, pts);
      const next = paintCells(f, pts, value);
      set({ project: withDuck(s, setFrame(d, s.frameIdx, next)) });
    },
    fill: (x, y) => {
      const s = get();
      if (s.colorIdx === 0) return;
      commit((d) => {
        const f = d.frames[d.size][s.frameIdx];
        const next = floodFill(f, x, y, s.colorIdx);
        return next === f ? null : setFrame(d, s.frameIdx, next);
      });
    },
    pick: (x, y) => {
      const s = get();
      const d = active(s);
      const v = d.frames[d.size][s.frameIdx][idx(x, y, d.size)];
      set(v === 0 ? { tool: 'erase' } : { colorIdx: v, tool: s.tool === 'erase' ? 'pencil' : s.tool });
    },

    addColor: (hex) => {
      let index = 0;
      const ok = commit((d) => {
        const r = addColor(d, hex);
        if (!r) return null;
        index = r.index;
        return r.duck === d ? null : r.duck;
      });
      // Si el color ya existía, solo se selecciona.
      const r = addColor(active(), hex);
      if (!r) return false;
      set({ colorIdx: ok ? index : r.index, tool: get().tool === 'erase' ? 'pencil' : get().tool });
      return true;
    },
    replaceColor: (index, hex) => commit((d) => replaceColor(d, index, hex)),
    removeColor: (index) => {
      if (colorUsedByTemplate(active(), index)) return false;
      commit((d) => removeColor(d, index));
      const n = active().palette.length;
      set((s) => ({ colorIdx: Math.min(s.colorIdx, n) }));
      return true;
    },

    undo: () => {
      const s = get();
      const prev = s.past[s.past.length - 1];
      if (!prev) return;
      const cur = active(s);
      set({
        project: withDuck(s, { ...prev, size: cur.size }), // deshacer no cambia la versión que miras
        past: s.past.slice(0, -1),
        future: [cur, ...s.future].slice(0, HISTORY_LIMIT),
        colorIdx: Math.min(s.colorIdx, prev.palette.length),
        frameIdx: s.frameIdx,
      });
    },
    redo: () => {
      const s = get();
      const next = s.future[0];
      if (!next) return;
      const cur = active(s);
      set({
        project: withDuck(s, { ...next, size: cur.size }),
        past: [...s.past, cur].slice(-HISTORY_LIMIT),
        future: s.future.slice(1),
        colorIdx: Math.min(s.colorIdx, next.palette.length),
        frameIdx: s.frameIdx,
      });
    },

    // ---------- editor de accesorios ----------
    addAccessory: () => {
      const id = `custom-${newId().slice(0, 8)}`;
      const n = get().project.accessories.filter((a) => !a.builtin).length + 1;
      commitAcc((list) => [...list, blankAccessory(id, `Accessory ${n}`)]);
      return id;
    },
    deleteAccessory: (id) => {
      commitAcc((list) => list.filter((a) => a.id !== id));
      set((s) => ({
        project: {
          ...s.project,
          ducks: s.project.ducks.map((d) => (d.accessory === id ? { ...d, accessory: null, accessoryColor: null } : d)),
        },
      }));
    },
    resetAccessory: (id) => {
      const original = defaultAccessories().find((a) => a.id === id);
      if (original) commitAcc((list) => list.map((a) => (a.id === id ? original : a)));
    },
    renameAccessory: (id, name) => editAcc(id, (a) => ({ ...a, name })),
    moveAccessory: (id, dir) =>
      commitAcc((list) => {
        const i = list.findIndex((a) => a.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= list.length) return list;
        const out = list.slice();
        [out[i], out[j]] = [out[j], out[i]];
        return out;
      }),
    reorderAccessory: (id, toIndex) => {
      if (moveToIndex(get().project.accessories, id, toIndex) !== get().project.accessories)
        commitAcc((list) => moveToIndex(list, id, toIndex));
    },
    restoreFactoryAccessories: () =>
      commitAcc((list) => [...list, ...defaultAccessories().filter((d) => !list.some((a) => a.id === d.id))]),
    setAccessoryDefaultColor: (id, hex) => commitAcc((list) => list.map((a) => (a.id === id ? { ...a, defaultColor: hex } : a))),
    beginAccStroke: () => {
      const s = get();
      set({ accPast: [...s.accPast, s.project.accessories].slice(-HISTORY_LIMIT), accFuture: [] });
    },
    paintAccessory: (id, size, face, layer, cells, ch) =>
      editAcc(id, (a) => setFaceLayer(a, size, face, layer, (rows) => paintArt(rows, cells, ch))),
    fillAccessory: (id, size, face, layer, x, y, ch) =>
      commitAcc((list) =>
        list.map((a) => (a.id === id ? setFaceLayer(a, size, face, layer, (rows) => fillArt(rows, x, y, ch)) : a)),
      ),
    clearAccessoryFace: (id, size, face) =>
      commitAcc((list) => list.map((a) => (a.id === id ? setFace(a, size, face, blankFace()) : a))),
    copyAccessoryFace: (id, size, from, to, flip) =>
      commitAcc((list) =>
        list.map((a) => {
          if (a.id !== id) return a;
          const src = a.faces[size][from];
          return setFace(a, size, to, flip ? mirrorFace(src) : cloneFace(src));
        }),
      ),
    accUndo: () => {
      const s = get();
      const prev = s.accPast[s.accPast.length - 1];
      if (!prev) return;
      set({
        project: { ...s.project, accessories: prev },
        accPast: s.accPast.slice(0, -1),
        accFuture: [s.project.accessories, ...s.accFuture].slice(0, HISTORY_LIMIT),
      });
    },
    accRedo: () => {
      const s = get();
      const next = s.accFuture[0];
      if (!next) return;
      set({
        project: { ...s.project, accessories: next },
        accPast: [...s.accPast, s.project.accessories].slice(-HISTORY_LIMIT),
        accFuture: s.accFuture.slice(1),
      });
    },
  };
});

// Persistencia con debounce.
let timer: ReturnType<typeof setTimeout> | undefined;
useStore.subscribe((s, prev) => {
  if (s.project === prev.project) return;
  clearTimeout(timer);
  timer = setTimeout(() => saveProject(s.project), 300);
});
