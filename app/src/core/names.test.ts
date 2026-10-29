import { describe, expect, it } from 'vitest';
import { DUCK_NAMES, parseNames, randomDuckName } from './names';

describe('nombres de patos', () => {
  it('el archivo trae más de 1024 nombres únicos', () => {
    expect(DUCK_NAMES.length).toBeGreaterThan(1024);
    expect(new Set(DUCK_NAMES.map((n) => n.toLowerCase())).size).toBe(DUCK_NAMES.length);
  });
  it('todos los nombres son de una sola palabra', () => {
    expect(DUCK_NAMES.filter((n) => /\s/.test(n))).toEqual([]);
  });
  it('parseNames ignora comentarios y líneas vacías', () => {
    expect(parseNames('# x\n\n Churro \r\nWifi\n')).toEqual(['Churro', 'Wifi']);
  });
  it('randomDuckName evita los usados y numera si se agotan', () => {
    expect(randomDuckName(['a'], ['A', 'B'], () => 0)).toBe('B');
    expect(randomDuckName(['a', 'b'], ['A', 'B'], () => 0)).toBe('A 2');
  });
});
