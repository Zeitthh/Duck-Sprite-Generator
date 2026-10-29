// Manda un lote exportado (../exports/<lote>) al proyecto de Unity y regenera el índice de patos del juego.
//   ../exports/<lote>/<pato>/...   ->   <Unity>/Assets/DuckSports/Resources/Ducks/<pato>/...
//   <Unity>/Assets/DuckSports/Resources/Ducks/index.json                (lo lee DuckLibrary)
// Con --replace, los patos que ya estaban en Unity y NO vienen en el lote se borran (Unity queda igual que el lote).
// Uso: npx vite-node scripts/send-to-unity.ts <lote> [--replace]
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const exportsDir = resolve(here, '../../exports');
const ducksDir = resolve(here, '../../../Assets/DuckSports/Resources/Ducks'); // WebApp/app/scripts -> raíz del proyecto de Unity

const batch = process.argv[2];
const replace = process.argv.includes('--replace');
if (!batch) throw new Error('Uso: send-to-unity.ts <lote> [--replace]');
const src = join(exportsDir, batch);
if (!existsSync(src)) throw new Error(`No existe ${src}`);

const folders = (dir: string) => readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf8'));

mkdirSync(ducksDir, { recursive: true });

// Nombres: los del lote (roster.json); si falta, los del índice anterior; si no, el slug en mayúsculas iniciales.
const names = new Map<string, string>();
const oldIndex = join(ducksDir, 'index.json');
if (existsSync(oldIndex)) for (const d of readJson(oldIndex).ducks) names.set(d.id, d.name);
const rosterPath = join(src, 'roster.json');
if (existsSync(rosterPath)) for (const d of readJson(rosterPath).ducks) names.set(d.slug, d.name);
const titleCase = (slug: string) => slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const incoming = folders(src);
if (replace)
  for (const f of folders(ducksDir))
    if (!incoming.includes(f)) {
      rmSync(join(ducksDir, f), { recursive: true, force: true });
      rmSync(join(ducksDir, `${f}.meta`), { force: true });
    }

for (const f of incoming) {
  mkdirSync(join(ducksDir, f), { recursive: true });
  // Un accesorio de un envío anterior que el pato ya no lleva se quita (y su .meta).
  for (const old of readdirSync(join(ducksDir, f)))
    if (old.startsWith('accessory-') && !existsSync(join(src, f, old.replace(/\.meta$/, ''))))
      rmSync(join(ducksDir, f, old), { force: true });
  for (const file of readdirSync(join(src, f))) copyFileSync(join(src, f, file), join(ducksDir, f, file));
}

// Índice con TODOS los patos que hay ahora en Unity (los del lote y los que ya estaban).
const entries = folders(ducksDir)
  .sort()
  .map((id) => {
    const dir = join(ducksDir, id);
    const accJson = readdirSync(dir).find((f) => f.startsWith('accessory-') && f.endsWith('.json'));
    let accessory: { slug: string; sheet: string } | null = null;
    if (accJson) accessory = { slug: readJson(join(dir, accJson)).accessory, sheet: `${id}/${accJson.replace(/\.json$/, '')}` };
    const body = (() => {
      const p = join(src, 'roster.json');
      return existsSync(p) ? (readJson(p).ducks.find((d: { slug: string }) => d.slug === id)?.body ?? null) : null;
    })();
    return { id, name: names.get(id) ?? titleCase(id), body, sheet: `${id}/${id}`, accessory };
  });
writeFileSync(oldIndex, JSON.stringify({ ducks: entries }, null, 2));
console.log(`Unity: ${incoming.length} patos copiados a Resources/Ducks (${entries.length} en el índice, ${entries.filter((e) => e.accessory).length} con accesorio)`);
