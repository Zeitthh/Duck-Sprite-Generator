import { newId } from './id';
import { defaultAccessories, getAccessory, parseAccessories } from './accessories';
import { basePalette, defaultFrame, defaultFrames, repairFrame, withBasePalette } from './template';
import { nearestAccessoryColor, normalizeHex } from './palette';
import {
  DEFAULT_FPS,
  ENABLED_SIZES,
  DEFAULT_SIZE,
  SIZES,
  MAX_COLORS,
  MAX_FRAMES,
  type Duck,
  type DuckSize,
  type Frame,
  type Project,
} from './types';

export function newDuck(name = 'New duck'): Duck {
  return {
    id: newId(),
    name,
    size: DEFAULT_SIZE,
    palette: basePalette(),
    frames: { 8: defaultFrames(8), 16: defaultFrames(16) },
    accessory: null,
    accessoryColor: null,
  };
}

export const newProject = (): Project => ({
  version: 1,
  fps: DEFAULT_FPS,
  ducks: [newDuck('Duck 1')],
  accessories: defaultAccessories(),
});

export const cloneDuck = (d: Duck): Duck => ({
  ...d,
  id: newId(),
  name: `${d.name} copia`,
  palette: d.palette.slice(),
  frames: { 8: d.frames[8].map((f) => f.slice()), 16: d.frames[16].map((f) => f.slice()) },
});

/** Valida datos externos (localStorage o archivo importado). Lanza Error con mensaje legible. */
export function parseProject(data: unknown): Project {
  const o = data as Record<string, unknown> | null;
  if (!o || typeof o !== 'object' || o.version !== 1 || !Array.isArray(o.ducks))
    throw new Error('Not a valid project file');
  const accessories = parseAccessories(o.accessories);
  const fps = typeof o.fps === 'number' && o.fps >= 1 && o.fps <= 60 ? Math.round(o.fps) : DEFAULT_FPS;
  const ducks = o.ducks.map((raw, i): Duck => {
    const d = raw as Record<string, unknown>;
    if (!d || typeof d.name !== 'string' || !Array.isArray(d.palette) || !d.frames || typeof d.frames !== 'object')
      throw new Error(`Duck ${i + 1}: invalid structure`);
    if (d.palette.length > MAX_COLORS) throw new Error(`Duck ${i + 1}: too many colors`);
    let palette = d.palette.map((c) => {
      const h = typeof c === 'string' ? normalizeHex(c) : null;
      if (!h) throw new Error(`Duck ${i + 1}: invalid color`);
      return h;
    });
    const size = (d.size ?? DEFAULT_SIZE) as DuckSize;
    if (!SIZES.includes(size)) throw new Error(`Duck ${i + 1}: invalid size`);

    // Formato anterior: un solo tamaño (`frames` era una lista). El otro tamaño se crea por defecto.
    const rawBySize: Record<number, unknown[] | undefined> = Array.isArray(d.frames)
      ? { [size]: d.frames }
      : { 8: (d.frames as Record<string, unknown[]>)['8'], 16: (d.frames as Record<string, unknown[]>)['16'] };

    // Las caras por defecto usan los primeros colores base: se completan si faltan.
    const missing = SIZES.some((sz) => {
      const r = rawBySize[sz];
      return !Array.isArray(r) || r.length < MAX_FRAMES || r.some((f) => f == null);
    });
    if (palette.length === 0) palette = ['#000000'];
    if (missing) palette = withBasePalette(palette);

    const build = (sz: DuckSize): Frame[] => {
      const r = Array.isArray(rawBySize[sz]) ? (rawBySize[sz] as unknown[]) : [];
      return Array.from({ length: MAX_FRAMES }, (_, k): Frame => {
        const f = r[k];
        if (f == null) return defaultFrame(sz, k);
        if (
          !Array.isArray(f) ||
          f.length !== sz * sz ||
          !f.every((v) => Number.isInteger(v) && v >= 0 && v <= palette.length)
        )
          throw new Error(`Duck ${i + 1}, ${sz}×${sz}, face ${k + 1}: invalid data`);
        // La silueta de la plantilla no puede faltar: se repara si el archivo la alteró.
        return repairFrame(sz, k, f as Frame);
      });
    };
    return {
      id: typeof d.id === 'string' ? d.id : newId(),
      name: d.name,
      size,
      palette,
      frames: { 8: build(8), 16: build(16) },
      accessory: getAccessory(d.accessory as string, accessories)?.id ?? null,
      // Un color que ya no está entre los 12 permitidos (p. ej. un gris) pasa al más parecido.
      accessoryColor: typeof d.accessoryColor === 'string' && normalizeHex(d.accessoryColor) ? nearestAccessoryColor(d.accessoryColor) : null,
    };
  });
  if (ducks.length === 0) ducks.push(newDuck('Duck 1'));
  return { version: 1, fps, ducks, accessories };
}

/** Mientras haya tamaños desactivados, cada pato se edita en uno activo (sus datos del otro se conservan). */
export function enforceEnabledSizes(p: Project): Project {
  if (p.ducks.every((d) => ENABLED_SIZES.includes(d.size))) return p;
  return { ...p, ducks: p.ducks.map((d) => (ENABLED_SIZES.includes(d.size) ? d : { ...d, size: ENABLED_SIZES[0] })) };
}
