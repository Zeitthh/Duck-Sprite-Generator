import { basePalette, defaultFrames, isBodyCell } from './template';
import { MORE_MEXICAN_BIRDS } from './birds';
import { SIZES, type Duck } from './types';

/** Patrón de color por zonas: coronilla, cara, pecho y vientre. El pico y el ojo no cambian. */
export interface DuckPattern {
  name: string;
  /** Familia o grupo, para los encabezados del menú. */
  group?: string;
  crown: string;
  face: string;
  chest: string;
  belly: string;
}

/** Las 12 aves originales. */
const ORIGINAL_BIRDS: DuckPattern[] = [
  { name: 'Trogón mexicano', crown: '#2e9e5b', face: '#247a47', chest: '#f5f5f0', belly: '#d62828' },
  { name: 'Quetzal', crown: '#2fa46a', face: '#1f8a55', chest: '#2fa46a', belly: '#d62828' },
  { name: 'Cardenal rojo', crown: '#d9282b', face: '#2a1f1f', chest: '#e03a3a', belly: '#c92a2a' },
  { name: 'Guacamaya roja', crown: '#e03131', face: '#f4efe6', chest: '#e03131', belly: '#2f6fd1' },
  { name: 'Momoto cejiturquesa', crown: '#b9722f', face: '#2fc4c4', chest: '#2e8f5b', belly: '#3aa07a' },
  { name: 'Tucán pico canoa', crown: '#2a2a2a', face: '#ffd21f', chest: '#ffe35a', belly: '#2a2a2a' },
  { name: 'Colibrí corona violeta', crown: '#7b3fc9', face: '#2f9e6e', chest: '#f1f1f1', belly: '#2a8a63' },
  { name: 'Colibrí garganta de rubí', crown: '#2f9e5b', face: '#c8203a', chest: '#f5f5f5', belly: '#3a8f5a' },
  { name: 'Mosquero cardenal', crown: '#e5321f', face: '#e5321f', chest: '#5a4336', belly: '#e5321f' },
  { name: 'Calandria dorso negro', crown: '#1f1f1f', face: '#f7b21c', chest: '#1f1f1f', belly: '#f7b21c' },
  { name: 'Loro cabeza amarilla', crown: '#f2c61f', face: '#f2c61f', chest: '#3aa655', belly: '#2e8f46' },
  { name: 'Colorín sietecolores', crown: '#3b63d1', face: '#3b63d1', chest: '#7fb83a', belly: '#d9302c' },
];

/** Todas las aves de México disponibles en el randomizador. */
export const MEXICAN_BIRDS: DuckPattern[] = [...ORIGINAL_BIRDS.map((b) => ({ ...b, group: 'Destacadas' })), ...MORE_MEXICAN_BIRDS];

const hsl = (h: number, s: number, l: number) => {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

/** Patrón inventado: colores al azar. */
export function fantasyPattern(): DuckPattern {
  const h = Math.random() * 360;
  const c = (dh: number, l: number) => hsl((h + dh + 360) % 360, 0.65, l);
  return { name: 'Fantasy', crown: c(0, 0.5), face: c(40, 0.75), chest: c(180, 0.6), belly: c(20, 0.4) };
}

/** Pato nuevo (misma identidad) con el patrón aplicado a las 4 caras de los dos tamaños. */
export function applyPattern(duck: Duck, p: DuckPattern): Duck {
  const zones = [p.crown, p.face, p.chest, p.belly];
  const palette = basePalette();
  const indexOf = (hex: string) => {
    let i = palette.indexOf(hex);
    if (i < 0) i = palette.push(hex) - 1;
    return i + 1;
  };
  const zoneIdx = zones.map(indexOf);
  const frames = { ...duck.frames };
  for (const size of SIZES) {
    const unit = size / 8;
    frames[size] = defaultFrames(size).map((frame, face) =>
      frame.map((v, i) => {
        const x = i % size;
        const y = Math.floor(i / size);
        if (!isBodyCell(size, face, x, y)) return v;
        const row = Math.floor(y / unit); // fila equivalente en 8×8
        return zoneIdx[row <= 2 ? 0 : row === 3 ? 1 : row === 4 ? 2 : 3];
      }),
    );
  }
  return { ...duck, palette, frames };
}

