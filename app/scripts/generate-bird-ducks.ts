// Muestras de los patos con patrón de aves de México:
//   ../test-ducks/aves-mexico.duck.json  -> se abre con "Import" (un pato por ave, con su nombre)
//   ../test-ducks/aves-mexico.png        -> hoja de contacto sin texto (4 caras por ave, en el orden de la lista)
//   ../test-ducks/aves-mexico.html       -> la misma hoja con el nombre de cada ave
// Uso: npx vite-node scripts/generate-bird-ducks.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { newDuck } from '../src/core/project';
import { applyPattern, MEXICAN_BIRDS } from '../src/core/randomize';
import { DEFAULT_FPS } from '../src/core/types';
import { encodePng, hex, newImage } from './png';

const ducks = MEXICAN_BIRDS.map((b) => ({ ...applyPattern(newDuck(b.name), b), name: b.name }));

mkdirSync('../test-ducks', { recursive: true });
writeFileSync('../test-ducks/aves-mexico.duck.json', JSON.stringify({ version: 1, fps: DEFAULT_FPS, ducks }, null, 2));

const FACES = 4;
const S = 6;
const CELL = 8 * S + 12;
const PER_ROW = 6; // aves por fila de la hoja (cada una con sus 4 caras)
const GROUP = FACES * CELL + 20;
const rows = Math.ceil(ducks.length / PER_ROW);
const img = newImage(PER_ROW * GROUP + 12, rows * CELL + 12, '#e9ecf3');
ducks.forEach((d, i) => {
  const gx = 12 + (i % PER_ROW) * GROUP;
  const gy = 12 + Math.floor(i / PER_ROW) * CELL;
  d.frames[8].forEach((frame, face) => {
    const ox = gx + face * CELL;
    img.fill(ox - 6, gy - 6, 8 * S + 12, 8 * S + 12, hex('#f8f9fc'));
    frame.forEach((v, k) => {
      if (v) img.fill(ox + (k % 8) * S, gy + Math.floor(k / 8) * S, S, S, hex(d.palette[v - 1]));
    });
  });
});
writeFileSync('../test-ducks/aves-mexico.png', encodePng(img));

const data = JSON.stringify(ducks.map((d) => ({ n: d.name, p: d.palette, f: d.frames[8] })));
const html = `<!doctype html><meta charset="utf-8"><title>Aves de México</title>
<style>body{font:14px system-ui;background:#e9ecf3;margin:16px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px}
.c{background:#f8f9fc;border-radius:8px;padding:8px}.c b{display:block;margin-bottom:4px}canvas{image-rendering:pixelated;width:100%}</style>
<h2>Aves de México (${ducks.length})</h2><div class="g" id="g"></div>
<script>const D=${data};
for(const d of D){const c=document.createElement('canvas');c.width=35;c.height=8;const x=c.getContext('2d');
d.f.forEach((f,i)=>f.forEach((v,k)=>{if(v){x.fillStyle=d.p[v-1];x.fillRect(i*9+k%8,Math.floor(k/8),1,1)}}));
const w=document.createElement('div');w.className='c';w.innerHTML='<b>'+d.n+'</b>';w.appendChild(c);g.appendChild(w)}</script>`;
writeFileSync('../test-ducks/aves-mexico.html', html);
console.log(`${ducks.length} patos; aves-mexico.png ${img.W}x${img.H}`);
