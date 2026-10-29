// Genera 32 patos de colores distintos para probar la app (sin accesorios):
//   ../test-ducks/32-ducks.duck.json   -> se abre con "Import" (añade los patos, no reemplaza nada)
//   ../test-ducks/32-ducks.png         -> vista previa de los 32 (cara RIGHT)
// Uso: npx vite-node scripts/generate-test-ducks.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { generateTestDucks } from '../src/core/testDucks';
import { DEFAULT_FPS } from '../src/core/types';
import { encodePng, hex, newImage } from './png';

const COUNT = 32;
const ducks = generateTestDucks(COUNT);

mkdirSync('../test-ducks', { recursive: true });
writeFileSync('../test-ducks/32-ducks.duck.json', JSON.stringify({ version: 1, fps: DEFAULT_FPS, ducks }, null, 2));

// Hoja de contacto: 8 columnas × 4 filas, cada pato (cara RIGHT, 8×8) ampliado ×7.
const COLS = 8;
const S = 7;
const CELL = 8 * S + 12;
const rows = Math.ceil(COUNT / COLS);
const img = newImage(COLS * CELL + 12, rows * CELL + 12, '#e9ecf3');
ducks.forEach((d, i) => {
  const ox = 12 + (i % COLS) * CELL;
  const oy = 12 + Math.floor(i / COLS) * CELL;
  img.fill(ox - 6, oy - 6, 8 * S + 12, 8 * S + 12, hex('#f8f9fc'));
  d.frames[8][0].forEach((v, k) => {
    if (v) img.fill(ox + (k % 8) * S, oy + Math.floor(k / 8) * S, S, S, hex(d.palette[v - 1]));
  });
});
writeFileSync('../test-ducks/32-ducks.png', encodePng(img));
console.log(`test-ducks/32-ducks.duck.json (${ducks.length} patos) y 32-ducks.png ${img.W}x${img.H}`);
