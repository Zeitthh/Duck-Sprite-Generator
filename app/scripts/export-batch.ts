// Exporta un lote de patos igual que el botón Export de la webapp (una carpeta por pato con lo que trae su .zip):
//   ../exports/<lote>/<pato>/<pato>.png + <pato>.json                  hoja del pato
//   ../exports/<lote>/<pato>/accessory-<nombre>.png + .json            hoja de su accesorio (si lo lleva)
//   ../exports/<lote>/<lote>.duck.json                                 proyecto completo (se abre con "Import")
//   ../exports/<lote>/roster.json                                      resumen: pato -> accesorio y color
// Los 32 patos son los de prueba (un color de cuerpo distinto cada uno); la mitad lleva un accesorio y color al azar.
// El azar es determinista (semilla fija), así que repetir el comando da el mismo lote.
// Con --project <archivo.duck.json> se exportan los patos y accesorios de ese proyecto (el de "Save") en vez de generar patos de prueba.
// Uso: npx vite-node scripts/export-batch.ts [semilla] [--project <archivo.duck.json>]
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { defaultAccessories } from '../src/core/accessories';
import { buildAccessoryManifest, buildManifest, accessorySheetPixels, atSize, slugify, uniqueSlugs } from '../src/core/export';
import { DUCK_NAMES, randomDuckName } from '../src/core/names';
import { ACCESSORY_COLORS } from '../src/core/palette';
import { generateTestDucks } from '../src/core/testDucks';
import { parseProject } from '../src/core/project';
import { DEFAULT_FPS, type Duck } from '../src/core/types';
import { encodePng } from './png';

const BATCH = '32-ducks';
const COUNT = 32;
const WITH_ACCESSORY = 16;
const projectArg = process.argv.indexOf('--project');
const projectFile = projectArg >= 0 ? process.argv[projectArg + 1] : null;
const seed = process.argv[2] && !process.argv[2].startsWith('--') ? Number(process.argv[2]) : 20261007;

/** PRNG pequeño y determinista (mulberry32). */
function rng(s: number) {
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = rng(seed);
const pick = <T>(list: readonly T[]) => list[Math.floor(rnd() * list.length)];

// ---- los patos ----
const loaded = projectFile ? parseProject(JSON.parse(readFileSync(projectFile, 'utf8'))) : null;
const accessories = loaded ? loaded.accessories : defaultAccessories();
const ducks: Duck[] = loaded ? loaded.ducks : generateTestDucks(COUNT);
if (!loaded) {
  const used: string[] = [];
  ducks.forEach((d, i) => {
    d.name = randomDuckName(used, DUCK_NAMES, rnd);
    used.push(d.name);
    ducks[i] = d;
  });

  // 16 de los 32, elegidos al azar, llevan accesorio y color al azar (uno de los 12 colores permitidos).
  const order = ducks.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const i of order.slice(0, WITH_ACCESSORY)) {
    ducks[i].accessory = pick(accessories).id;
    ducks[i].accessoryColor = pick(ACCESSORY_COLORS).hex;
  }

}

// ---- escritura ----
const out = `../exports/${BATCH}`;
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

/** Imagen RGBA con fondo transparente (los sprites de Unity no llevan fondo). */
function sheet(W: number, H: number, pixels: { x: number; y: number; color: string }[]) {
  const px = Buffer.alloc(W * H * 4);
  for (const p of pixels) {
    const i = (p.y * W + p.x) * 4;
    px[i] = parseInt(p.color.slice(1, 3), 16);
    px[i + 1] = parseInt(p.color.slice(3, 5), 16);
    px[i + 2] = parseInt(p.color.slice(5, 7), 16);
    px[i + 3] = 255;
  }
  return encodePng({ W, H, px });
}

const slugs = uniqueSlugs(ducks);
const roster: Record<string, unknown>[] = [];

ducks.forEach((duck, k) => {
  const slug = slugs[k];
  const dir = `${out}/${slug}`;
  mkdirSync(dir, { recursive: true });

  // Hoja del pato (solo se exporta el tamaño activo: 8×8). Mismo manifiesto que el botón Export.
  const sized = atSize(duck, 8);
  const manifest = buildManifest([sized], DEFAULT_FPS, `${slug}.png`);
  const pixels: { x: number; y: number; color: string }[] = [];
  sized.frames.forEach((frame, col) =>
    frame.forEach((v, i) => {
      if (v) pixels.push({ x: col * manifest.cellSize + (i % 8), y: Math.floor(i / 8), color: duck.palette[v - 1] });
    }),
  );
  writeFileSync(`${dir}/${slug}.png`, sheet(manifest.sheet.width, manifest.sheet.height, pixels));
  writeFileSync(`${dir}/${slug}.json`, JSON.stringify(manifest, null, 2));

  // Hoja del accesorio, en el color elegido para este pato.
  const acc = accessories.find((a) => a.id === duck.accessory) ?? null;
  let accFile: string | null = null;
  if (acc) {
    const accSlug = slugify(acc.name, 'accessory');
    accFile = `accessory-${accSlug}`;
    const am = buildAccessoryManifest(acc, 8, accSlug, `${accFile}.png`)!;
    writeFileSync(`${dir}/${accFile}.png`, sheet(am.sheet.width, am.sheet.height, accessorySheetPixels(acc, 8, am, duck.accessoryColor)));
    writeFileSync(`${dir}/${accFile}.json`, JSON.stringify(am, null, 2));
  }

  roster.push({
    slug,
    name: duck.name,
    body: duck.palette[1],
    accessory: acc ? slugify(acc.name, 'accessory') : null,
    accessoryColor: acc ? duck.accessoryColor : null,
    accessoryFile: accFile,
  });
});

writeFileSync(`${out}/${BATCH}.duck.json`, JSON.stringify({ version: 1, fps: DEFAULT_FPS, ducks, accessories }, null, 2));
writeFileSync(`${out}/roster.json`, JSON.stringify({ batch: BATCH, seed, ducks: roster }, null, 2));
console.log(`exports/${BATCH}: ${ducks.length} patos, ${roster.filter((r) => r.accessory).length} con accesorio (semilla ${seed})`);
