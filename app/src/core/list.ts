/**
 * Mueve el elemento con ese `id` para que quede en la posición `toIndex` de la lista resultante.
 * Si no hay cambio devuelve la MISMA lista (así no se guarda un punto de deshacer inútil).
 */
export function moveToIndex<T extends { id: string }>(list: T[], id: string, toIndex: number): T[] {
  const from = list.findIndex((x) => x.id === id);
  if (from < 0) return list;
  const to = Math.max(0, Math.min(list.length - 1, toIndex));
  if (to === from) return list;
  const out = list.slice();
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item);
  return out;
}
