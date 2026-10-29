// Genera exports/accessories-8x8.png y exports/accessories-16x16.png: cada accesorio SOLO (sin el pato), en las 4 caras (RIGHT, FRONT, LEFT, BACK).
// Uso: npx vite-node scripts/accessory-sheet.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { ACCESSORIES, accessoryOnly, canvasSize } from '../src/core/accessories';
import type { DuckSize } from '../src/core/types';
import { encodePng, hex, newImage } from './png';

function render(size: DuckSize) {
  const n = canvasSize(size); // 16 para el 8×8, 32 para el 16×16
  const S = 128 / n; // cada lienzo se dibuja a 128 px
  const GAP = 4;
  const rows = ACCESSORIES;
  const img = newImage(4 * (n * S + GAP) + GAP, rows.length * (n * S + GAP) + GAP, '#4fc3ff');
  rows.forEach((acc, r) => {
    for (let f = 0; f < 4; f++) {
      const ox = GAP + f * (n * S + GAP);
      const oy = GAP + r * (n * S + GAP);
      img.fill(ox, oy, n * S, n * S, hex('#6dcfff')); // lienzo con margen, un poco más claro
      accessoryOnly(acc, size, null, f).forEach((c, i) => {
        if (c) img.fill(ox + (i % n) * S, oy + Math.floor(i / n) * S, S, S, hex(c));
      });
    }
  });
  return img;
}

mkdirSync('../exports', { recursive: true });
for (const size of [8, 16] as DuckSize[]) {
  const img = render(size);
  writeFileSync(`../exports/accessories-${size}x${size}.png`, encodePng(img));
  console.log(`exports/accessories-${size}x${size}.png ${img.W}x${img.H}`);
}
