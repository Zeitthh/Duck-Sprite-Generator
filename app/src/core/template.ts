import { idx } from './grid';
import { MAX_FRAMES, SIZES, type Duck, type DuckSize, type Frame } from './types';

/**
 * Pato por defecto: un dibujo por tamaño y por cara (orden FACE_NAMES: right, front, left, back).
 *   K = silueta negra BLOQUEADA (no se borra, solo se recolorea)  -> índice 1
 *   E = negro editable (ojo)                                      -> índice 1
 *   W = blanco -> 2    O = naranja -> 3    L = naranja claro -> 4    D = naranja oscuro -> 5
 * Todo lo que no es K se puede pintar o borrar.
 */
interface FaceDef {
  art: string[];
  /** Ancho útil: el espejo del lápiz se hace dentro de este ancho. */
  width: number;
}

const flipRows = (rows: string[]) => rows.map((r) => [...r].reverse().join(''));
const whiten = (rows: string[]) => rows.map((r) => r.replace(/[ELOD]/g, 'W'));

// ---------- 8×8 (el icono) ----------
const RIGHT_8 = ['........', '...KKK..', '..KWWWK.', 'KKKWEWOK', 'KWWWWWK.', '.KWWWWK.', '..KKKK..', '........'];
const FRONT_8 = ['........', '..KKK...', '.KWWWK..', '.KOOOK..', 'KWWWWWK.', 'KWWWWWK.', '.KKKKK..', '........'];

// ---------- 16×16: el mismo pato del 8×8 escalado ×2, con el pico en 3 tonos de naranja ----------
const scale2 = (rows: string[]) => rows.flatMap((r) => {
  const wide = [...r].map((c) => c + c).join('');
  return [wide, wide];
});

/** Pico: fila de arriba clara (L); fila de abajo naranja (O) con los bordes oscuros (D). */
function toneBeak(rows: string[]): string[] {
  return rows.map((row, y) =>
    row.replace(/O+/g, (run) =>
      y % 2 === 0 ? 'L'.repeat(run.length) : run.length === 2 ? 'OD' : 'D' + 'O'.repeat(run.length - 2) + 'D',
    ),
  );
}

const RIGHT_16 = toneBeak(scale2(RIGHT_8));
const FRONT_16 = toneBeak(scale2(FRONT_8));

const TEMPLATES: Record<DuckSize, FaceDef[]> = {
  8: [
    { art: RIGHT_8, width: 8 },
    { art: FRONT_8, width: 7 },
    { art: flipRows(RIGHT_8), width: 8 },
    { art: whiten(FRONT_8).map((r) => r.replace(/O/g, 'W')), width: 7 },
  ],
  16: [
    { art: RIGHT_16, width: 16 },
    { art: FRONT_16, width: 14 },
    { art: flipRows(RIGHT_16), width: 16 },
    { art: whiten(FRONT_16), width: 14 },
  ],
};

const CODES: Record<string, number> = { '.': 0, K: 1, E: 1, W: 2, O: 3, L: 4, D: 5 };

/** Paleta base: negro, blanco, naranja y los 2 tonos extra del pico (solo se usan en 16×16). */
export const BASE_PALETTE = ['#000000', '#ffffff', '#ff8c00', '#ffbe5c', '#c9650a'];
export const basePalette = () => BASE_PALETTE.slice();

/** Asegura que la paleta tenga los colores base que usa `defaultFrame`. */
export function withBasePalette(palette: string[]): string[] {
  const out = palette.slice();
  BASE_PALETTE.forEach((c, i) => {
    if (out.length <= i) out.push(out.includes(c) ? `#${(0x101010 * (i + 4)).toString(16).padStart(6, '0')}` : c);
  });
  return out;
}

/** Cara de un pato nuevo (pato blanco). Usa los índices 1.. de la paleta base. */
export function defaultFrame(size: DuckSize, face: number): Frame {
  return TEMPLATES[size][face].art.flatMap((row) => [...row].map((c) => CODES[c]));
}

/** Las 4 caras por defecto de un tamaño. */
export const defaultFrames = (size: DuckSize): Frame[] =>
  Array.from({ length: MAX_FRAMES }, (_, face) => defaultFrame(size, face));

export const faceWidth = (size: DuckSize, face: number) => TEMPLATES[size][face].width;

/** ¿La celda pertenece a la silueta original de esa cara? */
export function isLocked(size: DuckSize, face: number, x: number, y: number): boolean {
  return TEMPLATES[size][face]?.art[y]?.[x] === 'K';
}

/** ¿La celda es cuerpo/cabeza pintable (blanco en la plantilla, sin pico ni ojo)? */
export const isBodyCell = (size: DuckSize, face: number, x: number, y: number) =>
  TEMPLATES[size][face]?.art[y]?.[x] === 'W';

/** Solo la silueta con el color `colorIdx`, todo lo demás transparente. */
export function templateFrame(size: DuckSize, face: number, colorIdx = 1): Frame {
  const f = new Array<number>(size * size).fill(0);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) if (isLocked(size, face, x, y)) f[idx(x, y, size)] = colorIdx;
  return f;
}

/** Quita de `points` las celdas bloqueadas (para el borrador). */
export function withoutLocked(size: DuckSize, face: number, points: [number, number][]): [number, number][] {
  return points.filter(([x, y]) => !isLocked(size, face, x, y));
}

/** Devuelve la cara con las celdas bloqueadas que estén vacías restauradas a `colorIdx`. */
export function repairFrame(size: DuckSize, face: number, frame: Frame, colorIdx = 1): Frame {
  const next = frame.slice();
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      if (isLocked(size, face, x, y) && next[idx(x, y, size)] === 0) next[idx(x, y, size)] = colorIdx;
  return next;
}

/** ¿Algún píxel de silueta (en cualquier tamaño) usa este color? Entonces no se puede quitar de la paleta. */
export function colorUsedByTemplate(duck: Duck, colorIdx: number): boolean {
  return SIZES.some((size) =>
    duck.frames[size].some((f, face) => {
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++)
          if (isLocked(size, face, x, y) && f[idx(x, y, size)] === colorIdx) return true;
      return false;
    }),
  );
}
