import { describe, expect, it } from 'vitest';
import { MEXICAN_BIRDS } from './randomize';

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const zones = (b: (typeof MEXICAN_BIRDS)[number]) => [b.crown, b.face, b.chest, b.belly].map(rgb);
/** Distancia entre dos patrones: suma de los cuadrados de la diferencia de color por zona. */
const dist = (a: (typeof MEXICAN_BIRDS)[number], b: (typeof MEXICAN_BIRDS)[number]) => {
  const za = zones(a);
  const zb = zones(b);
  return za.reduce((s, c, i) => s + c.reduce((t, v, k) => t + (v - zb[i][k]) ** 2, 0), 0);
};

describe('aves de México', () => {
  it('no repite nombres y todos los colores son hex válidos', () => {
    expect(new Set(MEXICAN_BIRDS.map((b) => b.name)).size).toBe(MEXICAN_BIRDS.length);
    for (const b of MEXICAN_BIRDS) for (const c of [b.crown, b.face, b.chest, b.belly]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('no hay dos patrones casi idénticos', () => {
    const close: string[] = [];
    MEXICAN_BIRDS.forEach((a, i) =>
      MEXICAN_BIRDS.slice(i + 1).forEach((b) => {
        if (dist(a, b) < 6000) close.push(`${a.name} ~ ${b.name} (${dist(a, b)})`);
      }),
    );
    expect(close).toEqual([]);
  });
});
