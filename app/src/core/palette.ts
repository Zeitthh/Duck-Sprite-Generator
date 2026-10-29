import { MAX_COLORS, type Duck } from './types';

/** Colores básicos para la pestaña "Básico". */
export const BASIC_COLORS: { name: string; hex: string }[] = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Light gray', hex: '#c8c8c8' },
  { name: 'Gray', hex: '#808080' },
  { name: 'Dark gray', hex: '#404040' },
  { name: 'Yellow', hex: '#ffd21f' },
  { name: 'Orange', hex: '#ff8c00' },
  { name: 'Red', hex: '#e03131' },
  { name: 'Pink', hex: '#ff8fc7' },
  { name: 'Purple', hex: '#7e3fbf' },
  { name: 'Blue', hex: '#2f7fe0' },
  { name: 'Light blue', hex: '#7fd4ff' },
  { name: 'Green', hex: '#3aa655' },
  { name: 'Dark green', hex: '#1f5b3a' },
  { name: 'Brown', hex: '#7a4b2a' },
  { name: 'Cream', hex: '#f5e6c4' },
];

/** Acepta "#abc", "abc", "#aabbcc", "aabbcc". Devuelve "#aabbcc" o null. */
export function normalizeHex(input: string): string | null {
  let s = input.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(s)) s = [...s].map((c) => c + c).join('');
  return /^[0-9a-f]{6}$/.test(s) ? `#${s}` : null;
}

export function addColor(duck: Duck, hex: string): { duck: Duck; index: number } | null {
  const h = normalizeHex(hex);
  if (!h) return null;
  const existing = duck.palette.indexOf(h);
  if (existing >= 0) return { duck, index: existing + 1 };
  if (duck.palette.length >= MAX_COLORS) return null;
  return { duck: { ...duck, palette: [...duck.palette, h] }, index: duck.palette.length + 1 };
}

/** Cambia el color de un índice (1..n). Si el nuevo ya existe, no hace nada. */
export function replaceColor(duck: Duck, index: number, hex: string): Duck | null {
  const h = normalizeHex(hex);
  if (!h || index < 1 || index > duck.palette.length || duck.palette.includes(h)) return null;
  const palette = duck.palette.slice();
  palette[index - 1] = h;
  return { ...duck, palette };
}

/** Quita un color: sus píxeles pasan a transparente y los índices mayores bajan 1. */
export function removeColor(duck: Duck, index: number): Duck {
  if (index < 1 || index > duck.palette.length) return duck;
  const shift = (f: number[]) => f.map((v) => (v === index ? 0 : v > index ? v - 1 : v));
  return {
    ...duck,
    palette: duck.palette.filter((_, i) => i !== index - 1),
    frames: {
      8: duck.frames[8].map(shift),
      16: duck.frames[16].map(shift),
    },
  };
}

/** Fondos de la vista previa: solo colores pastel (sin grises). */
export const PASTEL_BACKGROUNDS: { name: string; hex: string }[] = [
  { name: 'Pastel red', hex: '#ffadad' },
  { name: 'Pastel orange', hex: '#ffd6a5' },
  { name: 'Pastel yellow', hex: '#fdffb6' },
  { name: 'Pastel green', hex: '#caffbf' },
  { name: 'Pastel aqua', hex: '#9bf6ff' },
  { name: 'Pastel blue', hex: '#a0c4ff' },
  { name: 'Pastel purple', hex: '#bdb2ff' },
  { name: 'Pastel pink', hex: '#ffc6ff' },
];

/** Orden de rotación del fondo: transparente (null) y luego los pasteles; tras el último vuelve al transparente. */
export const PREVIEW_BACKGROUNDS: (string | null)[] = [null, ...PASTEL_BACKGROUNDS.map((c) => c.hex)];

export function nextBackground(current: string | null): string | null {
  const i = PREVIEW_BACKGROUNDS.indexOf(current);
  return PREVIEW_BACKGROUNDS[(i + 1) % PREVIEW_BACKGROUNDS.length];
}

export const backgroundName = (bg: string | null) =>
  bg === null ? 'Transparent' : (PASTEL_BACKGROUNDS.find((c) => c.hex === bg)?.name ?? bg);

/** Los colores que se pueden elegir para un accesorio: 12, sin variantes de gris (solo negro y blanco). */
export const ACCESSORY_COLORS: { name: string; hex: string }[] = [
  'Black', 'White', 'Yellow', 'Orange', 'Red', 'Pink', 'Purple', 'Blue', 'Light blue', 'Green', 'Dark green', 'Brown',
].map((name) => BASIC_COLORS.find((c) => c.name === name)!);

export const isAccessoryColor = (hex: unknown): hex is string =>
  typeof hex === 'string' && ACCESSORY_COLORS.some((c) => c.hex === hex);

/** El color permitido más parecido (para proyectos guardados con un color que ya no existe, como un gris). */
export function nearestAccessoryColor(input: string): string {
  const hex = normalizeHex(input);
  if (!hex) return ACCESSORY_COLORS[2].hex; // amarillo
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r, g, b] = rgb(hex);
  // Un gris (casi sin color) pasa a negro o blanco según su claridad.
  if (Math.max(r, g, b) - Math.min(r, g, b) < 28) return (r + g + b) / 3 < 128 ? ACCESSORY_COLORS[0].hex : ACCESSORY_COLORS[1].hex;
  let best = ACCESSORY_COLORS[0];
  let bestD = Infinity;
  for (const c of ACCESSORY_COLORS) {
    const [cr, cg, cb] = rgb(c.hex);
    const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best.hex;
}
