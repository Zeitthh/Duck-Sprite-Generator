import raw from '../data/duck-names.txt?raw';

/** Nombres graciosos de `src/data/duck-names.txt` (una línea por nombre; `#` y líneas vacías se ignoran). */
export function parseNames(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

export const DUCK_NAMES: readonly string[] = parseNames(raw);

/** Nombre aleatorio que no esté en `used` (sin distinguir mayúsculas); si se agotan, añade un número. */
export function randomDuckName(used: Iterable<string> = [], names: readonly string[] = DUCK_NAMES, rnd = Math.random): string {
  const taken = new Set([...used].map((n) => n.trim().toLowerCase()));
  const free = names.filter((n) => !taken.has(n.toLowerCase()));
  if (free.length > 0) return free[Math.floor(rnd() * free.length)];
  const base = names.length > 0 ? names[Math.floor(rnd() * names.length)] : 'Duck';
  let i = 2;
  while (taken.has(`${base} ${i}`.toLowerCase())) i++;
  return `${base} ${i}`;
}
