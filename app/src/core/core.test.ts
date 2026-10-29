import { describe, expect, it } from 'vitest';
import { createZip, crc32 } from './zip';
import { accessorySheetPixels, buildGif, imageSide, pngScale as pngScaleForGif } from './export';
import { encodeGif } from './gif';
import {
  ACCESSORIES,
  accessoryColors,
  accessoryOnly,
  blankAccessory,
  boundsOf,
  canvasSize,
  compose,
  composeForImage,
  defaultAccessories,
  fillArt,
  getAccessory,
  isAccessoryColor,
  layerCells,
  mirrorFace,
  paintArt,
  parseAccessories,
  slotsOf,
} from './accessories';
import { ACCESSORY_COLORS, BASIC_COLORS, PASTEL_BACKGROUNDS, PREVIEW_BACKGROUNDS, backgroundName, nearestAccessoryColor, nextBackground } from './palette';
import { generateTestDucks } from './testDucks';
import { PNG_FACE_PX, atSize, buildAccessoryManifest, buildManifest, pngScale, slugify, uniqueSlugs } from './export';
import { emptyFrame, flipFrameH, floodFill, idx, linePoints, paintCells, withMirror } from './grid';
import { moveToIndex } from './list';
import { addColor, normalizeHex, removeColor, replaceColor } from './palette';
import { cloneDuck, newDuck, newProject, parseProject } from './project';
import {
  colorUsedByTemplate,
  defaultFrame,
  faceWidth,
  isLocked,
  repairFrame,
  templateFrame,
  withBasePalette,
  withoutLocked,
} from './template';
import { THEMES, THEME_COLORS, THEME_LABEL, loadTheme } from './theme';
import { ENABLED_SIZES, FACE_NAMES, MAX_FRAMES, SIZES } from './types';

const proj = (...ducks: unknown[]) => ({ version: 1, fps: 6, ducks });

describe('grid', () => {
  it('línea incluye extremos y es continua', () => {
    const p = linePoints(0, 0, 5, 2);
    expect(p[0]).toEqual([0, 0]);
    expect(p[p.length - 1]).toEqual([5, 2]);
    for (let i = 1; i < p.length; i++) {
      expect(Math.abs(p[i][0] - p[i - 1][0])).toBeLessThanOrEqual(1);
      expect(Math.abs(p[i][1] - p[i - 1][1])).toBeLessThanOrEqual(1);
    }
  });
  it('pinta, refleja e ignora fuera de rango', () => {
    const f = paintCells(emptyFrame(8), withMirror([[1, 2]], 8), 3);
    expect(f[idx(1, 2, 8)]).toBe(3);
    expect(f[idx(6, 2, 8)]).toBe(3);
    expect(paintCells(emptyFrame(8), [[-1, 0], [8, 0]], 1).every((v) => v === 0)).toBe(true);
  });
  it('relleno respeta bordes', () => {
    const wall = paintCells(emptyFrame(8), Array.from({ length: 8 }, (_, y): [number, number] => [4, y]), 1);
    const g = floodFill(wall, 0, 0, 2);
    expect(g[idx(0, 0, 8)]).toBe(2);
    expect(g[idx(5, 0, 8)]).toBe(0);
  });
  it('voltear dos veces es identidad', () => {
    const f = paintCells(emptyFrame(8), [[2, 3], [5, 5]], 1);
    expect(flipFrameH(flipFrameH(f))).toEqual(f);
  });
});

describe('paleta', () => {
  it('normaliza hex', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex('ff8c00')).toBe('#ff8c00');
    expect(normalizeHex('#12345')).toBeNull();
  });
  it('añadir no duplica; reemplazar rechaza duplicados', () => {
    const d = newDuck();
    expect(addColor(d, '#FFFFFF')!.index).toBe(2);
    expect(addColor(d, '#123456')!.index).toBe(6);
    expect(replaceColor(d, 1, '#ffffff')).toBeNull();
    expect(replaceColor(d, 1, '#112233')!.palette[0]).toBe('#112233');
  });
  it('quitar color reindexa las dos versiones', () => {
    const d = newDuck();
    d.frames[8][0] = emptyFrame(8).map((_, i) => (i === 0 ? 1 : i === 1 ? 3 : 0));
    d.frames[16][0] = emptyFrame(16).map((_, i) => (i === 0 ? 1 : i === 1 ? 3 : 0));
    const r = removeColor(d, 1);
    expect(r.palette).toHaveLength(4);
    for (const sz of SIZES) {
      expect(r.frames[sz][0][0]).toBe(0);
      expect(r.frames[sz][0][1]).toBe(2);
    }
  });
});

describe('un pato, dos tamaños', () => {
  it('pato nuevo: 4 caras en 8×8 y 4 en 16×16; se edita el 8×8', () => {
    const d = newDuck('Pato 1');
    expect(d.size).toBe(8);
    expect(d.palette).toEqual(['#000000', '#ffffff', '#ff8c00', '#ffbe5c', '#c9650a']);
    for (const sz of SIZES) {
      expect(d.frames[sz]).toHaveLength(MAX_FRAMES);
      d.frames[sz].forEach((f, face) => {
        expect(f).toHaveLength(sz * sz);
        expect(f).toEqual(defaultFrame(sz, face));
      });
    }
  });
  it('las dos versiones comparten nombre y paleta', () => {
    const d = newDuck('Lucas');
    const a = atSize(d, 8);
    const b = atSize(d, 16);
    expect(a.name).toBe(b.name);
    expect(a.palette).toBe(b.palette);
    expect(a.frames).not.toBe(b.frames);
  });
  it('el 8×8 usa 3 colores; el 16×16 usa además los 2 tonos del pico', () => {
    const d = newDuck();
    expect(Math.max(...d.frames[8].flat())).toBe(3);
    expect(Math.max(...d.frames[16].flat())).toBe(5);
  });
  it('clonar copia las dos versiones sin compartir memoria', () => {
    const d = newDuck();
    const c = cloneDuck(d);
    expect(c.frames).toEqual(d.frames);
    c.frames[16][0][0] = 9;
    expect(d.frames[16][0][0]).toBe(0);
  });
  it('el 16×16 es el 8×8 escalado ×2; solo cambia el tono del pico', () => {
    for (let face = 0; face < 4; face++) {
      const small = defaultFrame(8, face);
      const big = defaultFrame(16, face);
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const a = small[(y >> 1) * 8 + (x >> 1)];
          const b = big[y * 16 + x];
          if (a === 3) expect([3, 4, 5]).toContain(b);
          else expect(b).toBe(a);
        }
    }
  });
  it('pico 16×16 con 3 tonos de naranja en right, front y left; back sin pico', () => {
    const d = newDuck();
    for (const face of [0, 1, 2]) for (const tono of [3, 4, 5]) expect(d.frames[16][face]).toContain(tono);
    expect(d.frames[16][3].every((v) => v <= 2)).toBe(true);
  });
});

describe('plantilla (silueta)', () => {
  for (const size of SIZES) {
    it(`${size}×${size}: la silueta por defecto es negra y las caras difieren donde deben`, () => {
      for (let face = 0; face < 4; face++) {
        const f = defaultFrame(size, face);
        const t = templateFrame(size, face);
        expect(t.filter(Boolean).length).toBeGreaterThan(10);
        for (let i = 0; i < size * size; i++) if (t[i]) expect(f[i]).toBe(1);
      }
      expect(templateFrame(size, 1)).toEqual(templateFrame(size, 3));
      expect(templateFrame(size, 0)).not.toEqual(templateFrame(size, 2));
      expect(templateFrame(size, 0)).not.toEqual(templateFrame(size, 1));
    });
    it(`${size}×${size}: left es el espejo exacto de right`, () => {
      for (const fn of [defaultFrame, templateFrame]) {
        const r = fn(size, 0);
        const l = fn(size, 2);
        for (let y = 0; y < size; y++)
          for (let x = 0; x < size; x++) expect(l[y * size + x]).toBe(r[y * size + size - 1 - x]);
      }
    });
    it(`${size}×${size}: front/back son simétricas dentro de su ancho`, () => {
      const w = faceWidth(size, 1);
      expect(w).toBe(size === 8 ? 7 : 14);
      const f = templateFrame(size, 1);
      for (let y = 0; y < size; y++) for (let x = 0; x < w; x++) expect(f[y * size + x]).toBe(f[y * size + w - 1 - x]);
    });
  }
  it('el ojo es editable y la silueta no', () => {
    expect(isLocked(8, 0, 3, 1)).toBe(true);
    expect(isLocked(8, 0, 4, 3)).toBe(false);
    expect(isLocked(16, 0, 8, 2)).toBe(true);
    expect(withoutLocked(8, 0, [[3, 1], [4, 3]])).toEqual([[4, 3]]);
  });
  it('caras: right, front, left, back; siluetas 8×8 del video 17/16/17', () => {
    expect([...FACE_NAMES]).toEqual(['right', 'front', 'left', 'back']);
    expect([0, 1, 2, 3].map((f) => templateFrame(8, f).filter(Boolean).length)).toEqual([17, 16, 17, 16]);
  });
  it('withBasePalette completa los 5 colores base', () => {
    expect(withBasePalette([])).toHaveLength(5);
    expect(withBasePalette(['#112233'])[0]).toBe('#112233');
  });
  it('repara siluetas borradas', () => {
    for (const size of SIZES) expect(repairFrame(size, 0, emptyFrame(size), 1)).toEqual(templateFrame(size, 0));
  });
  it('un color usado por la silueta (en cualquier tamaño) no se puede quitar', () => {
    const d = newDuck();
    expect(colorUsedByTemplate(d, 1)).toBe(true);
    expect(colorUsedByTemplate(d, 2)).toBe(false);
    // Recolorear solo el 8×8 no basta: el 16×16 sigue usando el color 1.
    const only8 = { ...d, frames: { ...d.frames, 8: d.frames[8].map((f) => f.map((v) => (v === 1 ? 2 : v))) } };
    expect(colorUsedByTemplate(only8, 1)).toBe(true);
    const both = { ...only8, frames: { ...only8.frames, 16: d.frames[16].map((f) => f.map((v) => (v === 1 ? 2 : v))) } };
    expect(colorUsedByTemplate(both, 1)).toBe(false);
  });
});

describe('proyecto', () => {
  it('proyecto nuevo: un pato con las dos versiones', () => {
    const p = newProject();
    expect(p.ducks).toHaveLength(1);
    expect(p.ducks[0].frames[8]).toHaveLength(4);
    expect(p.ducks[0].frames[16]).toHaveLength(4);
  });
  it('ida y vuelta (recuerda qué versión se estaba editando)', () => {
    const d = newDuck('A');
    d.size = 16;
    expect(parseProject(JSON.parse(JSON.stringify(proj(d))))).toEqual({ version: 1, fps: 6, ducks: [d], accessories: defaultAccessories() });
  });
  it('formato anterior (lista de caras de un tamaño): conserva ese tamaño y crea el otro', () => {
    const base = newDuck('Viejo');
    const legacy8 = { id: 'x', name: 'Viejo', size: 8, palette: ['#000000', '#ffffff', '#ff8c00'], frames: base.frames[8] };
    const out8 = parseProject(proj(legacy8)).ducks[0];
    expect(out8.frames[8]).toEqual(base.frames[8]);
    expect(out8.frames[16]).toEqual(base.frames[16]);
    expect(out8.palette).toHaveLength(5); // se completaron los tonos del pico
    const legacy16 = { id: 'y', name: 'V16', size: 16, palette: base.palette, frames: base.frames[16] };
    const out16 = parseProject(proj(legacy16)).ducks[0];
    expect(out16.size).toBe(16);
    expect(out16.frames[16]).toEqual(base.frames[16]);
    expect(out16.frames[8]).toEqual(base.frames[8]);
  });
  it('completa caras faltantes con el pato por defecto', () => {
    const d = newDuck('A');
    const out = parseProject(proj({ ...d, frames: { 8: [d.frames[8][0]], 16: d.frames[16] } })).ducks[0];
    expect(out.frames[8]).toHaveLength(4);
    expect(out.frames[8][3]).toEqual(defaultFrame(8, 3));
  });
  it('rechaza tamaños y datos inválidos', () => {
    expect(() => parseProject(proj({ ...newDuck('X'), size: 12 }))).toThrow();
    const wrongLen = newDuck('X');
    wrongLen.frames[8][0] = emptyFrame(16);
    expect(() => parseProject(proj(wrongLen))).toThrow();
    const badIdx = newDuck();
    badIdx.frames[16][0][0] = 99;
    expect(() => parseProject(proj(badIdx))).toThrow();
    expect(() => parseProject(null)).toThrow();
    expect(() => parseProject({ version: 2, ducks: [] })).toThrow();
  });
});

describe('exportación', () => {
  it('slugs únicos y sin acentos', () => {
    expect(slugify('Pato Café!')).toBe('pato-cafe');
    expect(uniqueSlugs([newDuck('Pato'), newDuck('pato')])).toEqual(['pato', 'pato-2']);
  });
  it('mismo pato en dos tamaños: mismos nombres de sprite, distinto tamaño de celda', () => {
    const d = newDuck('Lucas');
    const m8 = buildManifest([atSize(d, 8)], 6, 'lucas_8x8.png');
    const m16 = buildManifest([atSize(d, 16)], 6, 'lucas_16x16.png');
    expect(m8.sprites.map((s) => s.name)).toEqual(m16.sprites.map((s) => s.name));
    expect(m8.sprites.map((s) => s.name)).toEqual(['lucas_right', 'lucas_front', 'lucas_left', 'lucas_back']);
    expect(m8.cellSize).toBe(8);
    expect(m8.pixelsPerUnit).toBe(8);
    expect(m8.sheet).toMatchObject({ file: 'lucas_8x8.png', width: 32, height: 8 });
    expect(m16.cellSize).toBe(16);
    expect(m16.sheet).toMatchObject({ file: 'lucas_16x16.png', width: 64, height: 16 });
    expect(m16.sprites[1]).toMatchObject({ face: 'front', x: 16, y: 0, w: 16, h: 16 });
    expect(m8.animations[0]).toEqual({
      name: 'lucas',
      fps: 6,
      sprites: ['lucas_right', 'lucas_front', 'lucas_left', 'lucas_back'],
    });
  });
});

describe('accesorios', () => {

  it('hay Hat, Cape, Crown y los sombreros nuevos, con 4 caras de 16×16 para cada tamaño de pato', () => {
    expect(ACCESSORIES.map((a) => a.id)).toEqual([
      'hat', 'cape', 'crown', 'santa', 'cowboy', 'wizard', 'witch', 'chef', 'party', 'grad',
      'pumpkin', 'skull', 'eggshell', 'beanie', 'flowerpot', 'leaf', 'feather', 'scarf',
      'cheese', 'banana', 'catears', 'halo', 'cone', 'fez', 'mushroom', 'burger',
      'cherry', 'icecream', 'candle', 'bunny', 'horns', 'bow', 'pizza', 'plunger', 'sticky',
    ]);
    for (const a of ACCESSORIES)
      for (const size of SIZES) {
        expect(a.faces[size]).toHaveLength(4);
        for (const f of a.faces[size])
          for (const rows of [f.under, f.over])
            if (rows) {
              expect(rows).toHaveLength(16);
              rows.forEach((r) => expect(r).toHaveLength(16));
            }
      }
    expect(getAccessory('nada')).toBeNull();
    expect(getAccessory(null)).toBeNull();
  });
  it('el lienzo tiene margen: 16 para el pato 8×8 y 32 para el 16×16', () => {
    expect(canvasSize(8)).toBe(16);
    expect(canvasSize(16)).toBe(32);
    const d = newDuck();
    expect(compose(d, 8, 0, null)).toHaveLength(256);
    expect(compose(d, 16, 0, null)).toHaveLength(1024);
  });
  it('sin accesorio el pato queda centrado en el lienzo (8×8 y 16×16)', () => {
    const d = newDuck();
    for (const size of SIZES) {
      const n = canvasSize(size);
      const off = size / 2;
      const cells = compose(d, size, 0, null);
      expect(cells.filter(Boolean).length).toBe(d.frames[size][0].filter(Boolean).length);
      cells.forEach((c, i) => {
        const x = i % n;
        const y = Math.floor(i / n);
        if (c) expect(x >= off && x < off + size && y >= off && y < off + size).toBe(true);
      });
    }
  });
  it('8×8 (modelo base): gorro y corona son los dibujos del 16×16; la capa es propia', () => {
    const get = (id: string) => getAccessory(id)!;
    expect(get('hat').faces[8]).toEqual(get('hat').faces[16]);
    expect(get('crown').faces[8]).toEqual(get('crown').faces[16]);
    expect(get('cape').faces[8]).not.toEqual(get('cape').faces[16]);
    const rowsWithPaint = (size: 8 | 16) => get('hat').faces[size][0].over.filter((r) => /[^.]/.test(r)).length;
    expect(rowsWithPaint(8)).toBe(4); // 2 de copa + banda + ala
    // La capa 8×8 es la pequeña de siempre: no crece hacia atrás como la del 16×16.
    const lit = (size: 8 | 16) => get('cape').faces[size][0].under.join('').replace(/\./g, '').length;
    expect(lit(8)).toBeLessThan(lit(16));
    expect(get('cape').faces[8][0].under.filter((r) => /[^.]/.test(r))).toHaveLength(1);
  });
  it('cada accesorio cambia el resultado en las 4 caras y en los dos tamaños', () => {
    const d = newDuck();
    for (const a of ACCESSORIES)
      for (const size of SIZES)
        for (let face = 0; face < 4; face++)
          expect(compose(d, size, face, a)).not.toEqual(compose(d, size, face, null));
  });
  it('el sombrero y la corona usan el margen sobre la cabeza', () => {
    const d = newDuck();
    for (const id of ['hat', 'crown']) {
      const cells = compose(d, 8, 0, getAccessory(id)!);
      expect(cells.some((c, i) => c && Math.floor(i / 16) < 5)).toBe(true); // por encima de la cabeza (fila 5)
    }
    // Gorro 8×8: copa de 2 filas (2-3) + banda (4) + ala (5), y nada más arriba.
    const hat = compose(d, 8, 0, getAccessory('hat')!);
    expect([2, 3, 4, 5].every((y) => hat.slice(y * 16, y * 16 + 16).some(Boolean))).toBe(true);
    expect(hat.slice(0, 2 * 16).some(Boolean)).toBe(false);
    // 16×16 (apagado): el mismo dibujo, escalado ×2 sobre el lienzo de 32.
    const big = compose(d, 16, 0, getAccessory('hat')!);
    expect(big.slice(4 * 32, 5 * 32).some(Boolean)).toBe(true);
    expect(big.slice(0, 4 * 32).some(Boolean)).toBe(false);
  });
  it('over tapa al pato; under queda detrás', () => {
    const d = newDuck();
    const hat = getAccessory('hat')!;
    const cape = getAccessory('cape')!;
    expect(compose(d, 8, 0, hat)[5 * 16 + 8]).toBe(accessoryColors(hat).B); // el ala cubre el contorno
    const cc = accessoryColors(cape);
    // Capa 8×8 (pequeña): el vuelo (under) se ve donde el pato es transparente...
    expect(compose(d, 8, 0, cape)[6 * 16 + 4]).toBe(cc.C);
    // ...y la capa va POR ENCIMA de lo blanco del pato (hombro/espalda: fila 8, columnas 5-8) con el broche en el pecho.
    const white = d.palette[1];
    expect(d.frames[8][0][4 * 8 + 1]).toBe(2); // (5,8) del lienzo es blanco en el pato
    for (const x of [5, 6, 7, 8]) expect(compose(d, 8, 0, cape)[8 * 16 + x]).toBe(cc.C);
    expect(compose(d, 8, 0, cape)[8 * 16 + 9]).toBe(cc.Y);
    expect(compose(d, 8, 0, cape).includes(white)).toBe(true); // queda blanco en el resto del pato
    // Left es el espejo: la capa también cubre lo blanco del lado izquierdo.
    for (const x of [7, 8, 9, 10]) expect(compose(d, 8, 2, cape)[8 * 16 + x]).toBe(cc.C);
    // 16×16 (apagado): la capa tiene pixel bajo el contorno negro del pato, pero el pato va delante.
    const under = layerCells(cape.faces[16][0].under, 16, cc);
    expect(under[18 * 32 + 10]).not.toBeNull();
    expect(compose(d, 16, 0, cape)[18 * 32 + 10]).toBe(d.palette[0]);
  });
  it('sombreros nuevos: se apoyan en la cabeza (fila 5), caben en el lienzo y son del mismo dibujo en 8×8 y 16×16', () => {
    const d = newDuck();
    for (const id of ['santa', 'cowboy', 'wizard', 'witch', 'chef', 'party', 'grad', 'pumpkin', 'skull', 'eggshell', 'beanie', 'flowerpot', 'leaf', 'feather', 'scarf', 'cheese', 'banana', 'catears', 'halo', 'cone', 'fez', 'mushroom', 'burger', 'cherry', 'icecream', 'candle', 'bunny', 'horns', 'bow', 'pizza', 'plunger', 'sticky']) {
      const a = getAccessory(id)!;
      expect(a.faces[8]).toEqual(a.faces[16]);
      for (let face = 0; face < 4; face++) {
        const b = boundsOf(accessoryOnly(a, 8, null, face), 16)!;
        expect(b.y).toBeGreaterThanOrEqual(0);
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(16);
        expect(b.y + b.h).toBeGreaterThanOrEqual(6); // llega hasta la fila 5 (o más) sobre la cabeza
        expect(b.w).toBeLessThanOrEqual(9);
        // el pato conserva el ojo: la fila 7 (ojo/pico) de RIGHT no se tapa salvo la borla del birrete
      }
      expect(compose(d, 8, 0, a)).not.toEqual(compose(d, 8, 0, null));
    }
  });
  it('un proyecto guardado con los accesorios antiguos recibe los nuevos; uno que los borró no', () => {
    const old = defaultAccessories()
      .filter((a) => ['hat', 'cape', 'crown'].includes(a.id))
      .map((a) => ({ ...a, rev: 5 }));
    expect(parseAccessories(JSON.parse(JSON.stringify(old))).map((a) => a.id)).toContain('santa');
    const cur = defaultAccessories().filter((a) => a.id !== 'santa');
    expect(parseAccessories(JSON.parse(JSON.stringify(cur))).map((a) => a.id)).not.toContain('santa');
  });
  it('left es el espejo de right en cada tamaño', () => {
    for (const a of ACCESSORIES)
      for (const size of SIZES) {
        const colors = accessoryColors(a);
        const n = canvasSize(size);
        for (const layer of ['under', 'over'] as const) {
          const r = layerCells(a.faces[size][0][layer], size, colors);
          const l = layerCells(a.faces[size][2][layer], size, colors);
          for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) expect(l[y * n + x]).toBe(r[y * n + n - 1 - x]);
        }
      }
  });
  it('color principal: solo colores básicos; los tonos se derivan', () => {
    for (const a of ACCESSORIES) expect(isAccessoryColor(a.defaultColor)).toBe(true);
    const cape = getAccessory('cape')!;
    const red = BASIC_COLORS.find((c) => c.name === 'Red')!.hex;
    const colors = accessoryColors(cape, red);
    expect(colors.C).toBe(red);
    expect(colors.D).not.toBe(red);
    expect(colors.Y).toBe(cape.fixed.Y);
    expect(accessoryColors(cape, '#123456').C).toBe(cape.defaultColor);
    expect(accessoryColors(cape, null).C).toBe(cape.defaultColor);
  });
  it('el color elegido cambia el accesorio en la composición (en los dos tamaños)', () => {
    const base = newDuck();
    const green = BASIC_COLORS.find((c) => c.name === 'Green')!.hex;
    const painted = { ...base, accessory: 'cape', accessoryColor: green };
    const cape = getAccessory('cape')!;
    for (const size of SIZES) {
      expect(compose(painted, size, 0, cape)).not.toEqual(compose(base, size, 0, cape));
      expect(compose(painted, size, 0, cape).includes(green)).toBe(true);
    }
  });
  it('la miniatura del selector no está vacía', () => {
    for (const a of ACCESSORIES) for (const size of SIZES) expect(accessoryOnly(a, size).some(Boolean)).toBe(true);
  });
  it('las miniaturas muestran solo el accesorio, sin el pato, en cada cara', () => {
    for (const a of ACCESSORIES)
      for (let face = 0; face < 4; face++) {
        const only = accessoryOnly(a, 8, null, face);
        expect(only.some(Boolean)).toBe(true);
        // Es exactamente `under` + `over` del accesorio: ningún píxel del pato.
        const colors = accessoryColors(a);
        const expected = layerCells(a.faces[8][face].under, 8, colors);
        layerCells(a.faces[8][face].over, 8, colors).forEach((c, i) => {
          if (c) expected[i] = c;
        });
        expect(only).toEqual(expected);
      }
    // El color elegido se refleja en la miniatura.
    const green = BASIC_COLORS.find((c) => c.name === 'Green')!.hex;
    expect(accessoryOnly(getAccessory('crown')!, 8, green).includes(green)).toBe(true);
  });
  it('boundsOf recorta al contenido', () => {
    const cells = new Array<string | null>(256).fill(null);
    expect(boundsOf(cells, 16)).toBeNull();
    cells[3 * 16 + 5] = '#fff';
    cells[6 * 16 + 9] = '#fff';
    expect(boundsOf(cells, 16)).toEqual({ x: 5, y: 3, w: 5, h: 4 });
    const crown = boundsOf(accessoryOnly(getAccessory('crown')!, 8), 16)!;
    expect(crown.w).toBeLessThanOrEqual(5);
    expect(crown.h).toBe(2);
  });
  it('accesorio y color se guardan; uno desconocido o no básico se ignora', () => {
    const d = { ...newDuck(), accessory: 'cape', accessoryColor: BASIC_COLORS[7].hex };
    const out = parseProject(proj(d)).ducks[0];
    expect(out.accessory).toBe('cape');
    expect(out.accessoryColor).toBe(BASIC_COLORS[7].hex);
    expect(parseProject(proj({ ...d, accessory: 'ovni' })).ducks[0].accessory).toBeNull();
    expect(parseProject(proj({ ...d, accessoryColor: 'no-es-un-color' })).ducks[0].accessoryColor).toBeNull();
    expect(isAccessoryColor(parseProject(proj({ ...d, accessoryColor: '#123456' })).ducks[0].accessoryColor)).toBe(true);
    expect(newDuck().accessory).toBeNull();
    expect(newDuck().accessoryColor).toBeNull();
  });
});

describe('editor de accesorios', () => {
  it('pintar y borrar en una capa', () => {
    const blank = blankAccessory('x').faces[8][0].over;
    expect(blank).toHaveLength(16);
    const painted = paintArt(blank, [[3, 4], [4, 4]], 'M');
    expect(painted[4].slice(3, 5)).toBe('MM');
    expect(painted[0]).toBe(blank[0]); // el resto no cambia
    expect(paintArt(painted, [[3, 4]], '.')[4].slice(3, 5)).toBe('.M');
    expect(paintArt(blank, [[-1, 0], [16, 0], [0, 16]], 'M')).toEqual(blank); // fuera de rango se ignora
  });
  it('rellenar respeta los bordes', () => {
    let rows = blankAccessory('x').faces[8][0].over;
    rows = paintArt(rows, Array.from({ length: 16 }, (_, y): [number, number] => [8, y]), 'K'); // pared
    const filled = fillArt(rows, 0, 0, 'M');
    expect(filled[0][0]).toBe('M');
    expect(filled[15][7]).toBe('M');
    expect(filled[0][9]).toBe('.'); // el otro lado queda igual
    expect(filled[5][8]).toBe('K');
    expect(fillArt(rows, 8, 0, 'K')).toBe(rows); // mismo color: sin cambios
  });
  it('espejar una cara', () => {
    const f = blankAccessory('x').faces[8][0];
    f.over = paintArt(f.over, [[2, 3]], 'M');
    expect(mirrorFace(f).over[3][13]).toBe('M');
    expect(mirrorFace(mirrorFace(f))).toEqual(f);
  });
  it('un accesorio nuevo está vacío, no es de fábrica y tiene su paleta de letras', () => {
    const a = blankAccessory('custom-1', 'Mine');
    expect(a.builtin).toBe(false);
    expect(slotsOf(a).map((s) => s.role)).toEqual(['main', 'shade', 'fixed', 'fixed', 'fixed', 'fixed']);
    for (const size of SIZES) for (const f of a.faces[size]) expect([...f.over, ...f.under].every((r) => r === '.'.repeat(16))).toBe(true);
    expect(isAccessoryColor(a.defaultColor)).toBe(true);
  });
  it('los de fábrica se marcan como tales y los editados se conservan al guardar/leer', () => {
    expect(defaultAccessories().every((a) => a.builtin)).toBe(true);
    const list = defaultAccessories();
    const mine = blankAccessory('custom-1', 'Mine');
    mine.faces[8][0].over = paintArt(mine.faces[8][0].over, [[5, 5]], 'M');
    list[0].faces[8][0].over = paintArt(list[0].faces[8][0].over, [[0, 0]], 'H'); // editar el sombrero de fábrica
    const out = parseProject(JSON.parse(JSON.stringify({ ...proj(newDuck()), accessories: [...list, mine] })));
    expect(out.accessories.map((a) => a.id)).toEqual(
      [...defaultAccessories().map((a) => a.id), 'custom-1'],
    );
    expect(out.accessories[0].faces[8][0].over[0][0]).toBe('H');
    expect(out.accessories.at(-1)!.faces[8][0].over[5][5]).toBe('M');
    expect(out.accessories.at(-1)!.builtin).toBe(false);
  });
  it('proyectos sin accesorios (anteriores) reciben los de fábrica', () => {
    expect(parseProject(proj(newDuck())).accessories).toEqual(defaultAccessories());
    expect(parseAccessories(undefined)).toEqual(defaultAccessories());
  });
  it('los de fábrica guardados con un dibujo anterior se actualizan; los propios y los actuales no', () => {
    const old = defaultAccessories();
    old[0].rev = 1; // sombrero de una versión anterior
    old[0].faces[8][0].over[0] = 'XXXXXXXXXXXXXXXX'.replace(/X/g, '.'); // (cualquier dibujo viejo)
    old[0].faces[8][0].over[1] = '.'.repeat(15) + 'H';
    const mine = blankAccessory('custom-1');
    mine.rev = 1;
    const out = parseAccessories([...old, mine]);
    expect(out[0]).toEqual(defaultAccessories()[0]); // se restauró al dibujo actual
    expect(out.find((a) => a.id === mine.id)!.rev).toBe(1); // el propio no se toca
    // Uno de fábrica ya actual conserva sus ediciones.
    const edited = defaultAccessories();
    edited[1].faces[8][0].over = paintArt(edited[1].faces[8][0].over, [[0, 0]], 'C');
    expect(parseAccessories(edited)[1].faces[8][0].over[0][0]).toBe('C');
  });
  it('lo que el usuario borró (incluso de fábrica) se queda borrado al guardar y leer', () => {
    const only = parseAccessories([blankAccessory('custom-1')]);
    expect(only.map((a) => a.id)).toEqual(['custom-1']);
    expect(parseAccessories([])).toEqual([]);
    const sinSombrero = defaultAccessories().filter((a) => a.id !== 'hat');
    expect(parseAccessories(sinSombrero).map((a) => a.id)).toEqual(
      defaultAccessories().map((a) => a.id).filter((id) => id !== 'hat'),
    );
    // Un pato que llevaba el accesorio borrado se queda sin accesorio.
    const d = { ...newDuck(), accessory: 'hat' };
    expect(parseProject({ ...proj(d), accessories: sinSombrero }).ducks[0].accessory).toBeNull();
  });
  it('rechaza accesorios mal formados', () => {
    const bad = blankAccessory('x');
    bad.faces[8][0].over[0] = 'MMM'; // fila corta
    expect(() => parseAccessories([bad])).toThrow();
    const unknown = blankAccessory('y');
    unknown.faces[8][0].over = paintArt(unknown.faces[8][0].over, [[0, 0]], 'Z'); // letra que no existe
    expect(() => parseAccessories([unknown])).toThrow();
    expect(() => parseAccessories([blankAccessory('z'), blankAccessory('z')])).toThrow(); // id repetido
    expect(() => parseAccessories('nope')).toThrow();
  });
  it('un pato con un accesorio que ya no existe lo pierde', () => {
    const d = { ...newDuck(), accessory: 'custom-9' };
    expect(parseProject({ ...proj(d), accessories: defaultAccessories() }).ducks[0].accessory).toBeNull();
    const ok = parseProject({ ...proj(d), accessories: [...defaultAccessories(), blankAccessory('custom-9')] });
    expect(ok.ducks[0].accessory).toBe('custom-9');
  });
  it('un accesorio propio se compone sobre el pato con su dibujo', () => {
    const mine = blankAccessory('custom-1');
    mine.faces[8][0].over = paintArt(mine.faces[8][0].over, [[8, 1]], 'M');
    const cells = compose(newDuck(), 8, 0, mine);
    expect(cells[1 * 16 + 8]).toBe(mine.defaultColor);
  });
});

describe('16×16 apagado (modelo base 8×8)', () => {
  it('solo el 8×8 está activo, pero los datos del 16×16 se conservan', () => {
    expect(ENABLED_SIZES).toEqual([8]);
    const d = newDuck('X');
    expect(d.frames[16]).toHaveLength(4);
    const p = parseProject(JSON.parse(JSON.stringify(proj(d))));
    expect(p.ducks[0].frames[16]).toEqual(d.frames[16]);
  });
});

describe('fondo de la vista previa', () => {
  const lightness = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return { r, g, b, spread: Math.max(r, g, b) - Math.min(r, g, b), min: Math.min(r, g, b) };
  };
  it('rota por transparente y los pasteles, y vuelve a empezar', () => {
    expect(PREVIEW_BACKGROUNDS[0]).toBeNull(); // transparente
    expect(PREVIEW_BACKGROUNDS.slice(1)).toEqual(PASTEL_BACKGROUNDS.map((c) => c.hex));
    const n = PREVIEW_BACKGROUNDS.length;
    let bg: string | null = null;
    const seen: (string | null)[] = [bg];
    for (let i = 0; i < n; i++) seen.push((bg = nextBackground(bg)));
    expect(seen[n]).toBeNull(); // dio la vuelta completa
    expect(new Set(seen.slice(0, n)).size).toBe(n); // sin repetir ninguno
  });
  it('solo pasteles: nada gris, nada oscuro ni saturado', () => {
    for (const { hex } of PASTEL_BACKGROUNDS) {
      const c = lightness(hex);
      expect(c.spread).toBeGreaterThanOrEqual(40); // no es gris (los grises tienen R≈G≈B)
      expect(c.min).toBeGreaterThanOrEqual(150); // claro
    }
    // Ninguno de los colores básicos grises / blanco / negro está en la rotación.
    const forbidden = BASIC_COLORS.filter((c) => ['Black', 'White', 'Light gray', 'Gray', 'Dark gray'].includes(c.name)).map((c) => c.hex);
    for (const hex of forbidden) expect(PREVIEW_BACKGROUNDS).not.toContain(hex);
  });
  it('nombres para el tooltip', () => {
    expect(backgroundName(null)).toBe('Transparent');
    expect(backgroundName('#a0c4ff')).toBe('Pastel blue');
  });
});

describe('PNG automático (pato + accesorio)', () => {
  it('sin accesorio solo sale el pato; con accesorio, el lienzo con margen', () => {
    const d = newDuck();
    expect(composeForImage(d, 8, 0, null)).toHaveLength(64);
    const hat = getAccessory('hat')!;
    expect(composeForImage(d, 8, 0, hat)).toHaveLength(256);
    // El recorte sin accesorio conserva todos los píxeles del pato.
    expect(composeForImage(d, 8, 0, null).filter(Boolean).length).toBe(d.frames[8][0].filter(Boolean).length);
    // Y es exactamente lo mismo que el pato.
    composeForImage(d, 8, 0, null).forEach((c, i) => {
      const v = d.frames[8][0][i];
      expect(c).toBe(v ? d.palette[v - 1] : null);
    });
  });
  it('la escala se elige sola según el lado: cada cara queda de ~128 px', () => {
    expect(PNG_FACE_PX).toBe(128);
    expect(pngScale(8)).toBe(16); // pato 8×8 sin accesorio
    expect(pngScale(16)).toBe(8); // pato 8×8 con accesorio (lienzo 16×16)
    expect(pngScale(32)).toBe(4); // pato 16×16 con accesorio
    expect(pngScale(1000)).toBe(1); // nunca menos de 1
  });
});

describe('temas', () => {
  it('solo Dim y Light (sin modo noche ni modo sistema)', () => {
    expect(THEMES).toEqual(['dim', 'light']);
    expect(Object.keys(THEME_COLORS)).toEqual(['dim', 'light']);
    expect(THEME_LABEL).toEqual({ dim: 'Dim', light: 'Light' });
  });
  it('Dim es oscuro y Light es claro, con texto legible en ambos', () => {
    const lum = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).reduce((a, b) => a + b, 0) / 3;
    expect(lum(THEME_COLORS.dim.bg)).toBeLessThan(80);
    expect(lum(THEME_COLORS.light.bg)).toBeGreaterThan(220);
    for (const t of THEMES) expect(Math.abs(lum(THEME_COLORS[t].text) - lum(THEME_COLORS[t].bg))).toBeGreaterThan(120);
  });
  it('sin localStorage (o con un valor viejo) se usa Dim', () => {
    expect(loadTheme()).toBe('dim');
  });
});

describe('reordenar listas (arrastrar)', () => {
  const L = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
  const ids = (l: { id: string }[]) => l.map((x) => x.id).join('');
  it('mueve un elemento a la posición pedida', () => {
    expect(ids(moveToIndex(L, 'a', 2))).toBe('bcad');
    expect(ids(moveToIndex(L, 'd', 0))).toBe('dabc');
    expect(ids(moveToIndex(L, 'b', 3))).toBe('acdb');
    expect(ids(moveToIndex(L, 'c', 1))).toBe('acbd');
  });
  it('sin cambio devuelve la misma lista (no ensucia el historial); ids raros y posiciones fuera de rango', () => {
    expect(moveToIndex(L, 'b', 1)).toBe(L);
    expect(moveToIndex(L, 'zzz', 0)).toBe(L);
    expect(ids(moveToIndex(L, 'a', 99))).toBe('bcda'); // se limita al final
    expect(ids(moveToIndex(L, 'd', -5))).toBe('dabc'); // y al principio
    expect(ids(L)).toBe('abcd'); // la original no se modifica
  });
});

describe('hojas de accesorios (aparte de la del pato)', () => {
  const hat = () => getAccessory('hat')!;
  it('una hoja por accesorio: 4 caras por 1 fila por capa con dibujo (over primero)', () => {
    const m = buildAccessoryManifest(hat(), 8, 'hat', 'accessory-hat.png')!;
    expect(m.kind).toBe('accessory');
    expect(m.sheet).toEqual({ file: 'accessory-hat.png', width: 64, height: 16 }); // el sombrero solo tiene capa `over`
    expect(m.sprites.map((s) => s.name)).toEqual(['hat_right_over', 'hat_front_over', 'hat_left_over', 'hat_back_over']);
    const cape = buildAccessoryManifest(getAccessory('cape')!, 8, 'cape', 'c.png')!;
    expect(cape.sheet.height).toBe(32); // la capa tiene `over` y `under`
    expect(cape.sprites.filter((s) => s.layer === 'under')).toHaveLength(4);
    expect(cape.sprites[0].layer).toBe('over');
    expect(cape.sprites[4]).toMatchObject({ layer: 'under', y: 16, x: 0 });
  });
  it('encaja con el pato sin cálculos: lienzo completo (16), mismo píxel que el pato (8 por unidad)', () => {
    const m = buildAccessoryManifest(hat(), 8, 'hat', 'h.png')!;
    expect(m.cellSize).toBe(canvasSize(8));
    expect(m.pixelsPerUnit).toBe(8); // el mismo que la hoja del pato 8×8
    expect(buildManifest([atSize(newDuck(), 8)], 6, 'd.png').pixelsPerUnit).toBe(m.pixelsPerUnit);
    expect(m.sprites.every((s) => s.w === 16 && s.h === 16)).toBe(true);
    // El pato (8×8) cae justo en el centro del lienzo del accesorio: celdas 4..11.
    expect((16 - 8) / 2).toBe(4);
  });
  it('un accesorio vacío no genera hoja', () => {
    expect(buildAccessoryManifest(blankAccessory('x'), 8, 'x', 'x.png')).toBeNull();
  });
  it('los nombres de archivo no se repiten aunque dos accesorios se llamen igual (ni quedan vacíos)', () => {
    expect(uniqueSlugs([{ name: 'Gorro' }, { name: 'gorro' }, { name: '???' }], 'accessory')).toEqual(['gorro', 'gorro-2', 'accessory']);
    expect(slugify('???')).toBe('duck');
    expect(slugify('???', 'accessory')).toBe('accessory');
  });
});

describe('12 colores para accesorios', () => {
  it('son 12, sin variantes de gris (solo negro y blanco)', () => {
    expect(ACCESSORY_COLORS).toHaveLength(12);
    expect(new Set(ACCESSORY_COLORS.map((c) => c.hex)).size).toBe(12);
    const names = ACCESSORY_COLORS.map((c) => c.name);
    expect(names).toContain('Black');
    expect(names).toContain('White');
    for (const gris of ['Light gray', 'Gray', 'Dark gray']) expect(names).not.toContain(gris);
    expect(BASIC_COLORS).toHaveLength(16); // la paleta del pato sigue teniendo los 16
  });
  it('todos los accesorios de fábrica usan uno de los 12 como color por defecto', () => {
    for (const a of defaultAccessories()) expect(isAccessoryColor(a.defaultColor)).toBe(true);
    expect(getAccessory('hat')!.defaultColor).toBe('#000000');
  });
  it('un gris guardado pasa al color permitido más parecido', () => {
    const black = ACCESSORY_COLORS[0].hex;
    const white = ACCESSORY_COLORS[1].hex;
    expect(nearestAccessoryColor('#404040')).toBe(black); // gris oscuro -> negro
    expect(nearestAccessoryColor('#c8c8c8')).toBe(white); // gris claro -> blanco
    expect(nearestAccessoryColor('#2f7fe0')).toBe('#2f7fe0'); // uno permitido se queda igual
    expect(nearestAccessoryColor('basura')).toBe(ACCESSORY_COLORS[2].hex);
    const acc = { ...blankAccessory('x'), defaultColor: '#808080' };
    expect(isAccessoryColor(parseAccessories([acc])[0].defaultColor)).toBe(true);
    const d = { ...newDuck(), accessory: 'hat', accessoryColor: '#404040' };
    expect(parseProject(proj(d)).ducks[0].accessoryColor).toBe(black);
  });
  it('un color fuera de los 12 no se aplica al accesorio', () => {
    const hat = getAccessory('hat')!;
    expect(accessoryColors(hat, '#808080').H).toBe(hat.defaultColor);
  });
});

describe('32 patos de prueba', () => {
  const ducks = generateTestDucks(32);
  it('son 32, todos con un cuerpo de color distinto y sin accesorios', () => {
    expect(ducks).toHaveLength(32);
    expect(new Set(ducks.map((d) => d.palette[1])).size).toBe(32); // 32 colores de cuerpo distintos
    expect(new Set(ducks.map((d) => d.id)).size).toBe(32);
    expect(new Set(ducks.map((d) => d.name)).size).toBe(32);
    for (const d of ducks) {
      expect(d.accessory).toBeNull();
      expect(d.accessoryColor).toBeNull();
      expect(d.palette[1]).not.toBe('#ffffff'); // ninguno queda blanco
    }
  });
  it('conservan la plantilla de siempre (solo cambia la paleta)', () => {
    const base = newDuck();
    for (const d of ducks) {
      expect(d.frames).toEqual(base.frames);
      expect(d.palette[0]).toBe('#000000');
      expect(d.palette).toHaveLength(5);
    }
  });
  it('el pico se ve contra el cuerpo (no es del mismo color)', () => {
    for (const d of ducks) expect(d.palette[2]).not.toBe(d.palette[1]);
  });
  it('el archivo generado se puede importar', () => {
    const out = parseProject(JSON.parse(JSON.stringify({ version: 1, fps: 6, ducks })));
    expect(out.ducks).toHaveLength(32);
    expect(out.ducks.every((d) => d.accessory === null)).toBe(true);
  });
});

// ---------- Decodificador de GIF independiente (para comprobar el codificador) ----------
function decodeGif(bytes: Uint8Array) {
  const text = (a: number, n: number) => String.fromCharCode(...bytes.slice(a, a + n));
  const out = { sig: text(0, 6), width: bytes[6] | (bytes[7] << 8), height: bytes[8] | (bytes[9] << 8), palette: [] as string[], frames: [] as number[][], delays: [] as number[], transparent: null as number | null, loop: null as number | null, trailer: bytes[bytes.length - 1] === 0x3b };
  const gct = bytes[10] & 0x80 ? 2 << (bytes[10] & 7) : 0;
  let pos = 13;
  for (let i = 0; i < gct; i++, pos += 3) out.palette.push('#' + [0, 1, 2].map((k) => bytes[pos + k].toString(16).padStart(2, '0')).join(''));
  const subBlocks = () => {
    const data: number[] = [];
    for (let len = bytes[pos++]; len > 0; len = bytes[pos++]) {
      for (let k = 0; k < len; k++) data.push(bytes[pos + k]);
      pos += len;
    }
    return data;
  };
  let pendingDelay = 0;
  while (bytes[pos] !== 0x3b) {
    const b = bytes[pos++];
    if (b === 0x21) {
      const label = bytes[pos++];
      if (label === 0xf9) {
        pos++; // tamaño del bloque (4)
        const packed = bytes[pos];
        pendingDelay = bytes[pos + 1] | (bytes[pos + 2] << 8);
        if (packed & 1) out.transparent = bytes[pos + 3];
        pos += 5;
      } else if (label === 0xff) {
        const data = subBlocks(); // "NETSCAPE2.0" + [1, loop (2 bytes)]
        if (data.length >= 14) out.loop = data[12] | (data[13] << 8);
      } else subBlocks();
    } else if (b === 0x2c) {
      pos += 8; // izquierda, arriba, ancho, alto
      pos++; // empaquetado (sin tabla local)
      const minCode = bytes[pos++];
      const data = subBlocks();
      // LZW estándar
      const clear = 1 << minCode;
      const eoi = clear + 1;
      let size = minCode + 1;
      let dict: number[][] = [];
      let next = eoi + 1;
      let prev: number[] | null = null;
      const px: number[] = [];
      let bit = 0;
      const read = () => {
        let v = 0;
        for (let k = 0; k < size; k++, bit++) v |= ((data[bit >> 3] >> (bit & 7)) & 1) << k;
        return v;
      };
      for (;;) {
        const code = read();
        if (code === clear) {
          dict = [];
          size = minCode + 1;
          next = eoi + 1;
          prev = null;
          continue;
        }
        if (code === eoi) break;
        let entry: number[];
        if (code < clear) entry = [code];
        else if (code < next) entry = dict[code];
        else if (code === next && prev) entry = [...prev, prev[0]];
        else throw new Error('código LZW inválido');
        px.push(...entry);
        if (prev && next < 4096) {
          dict[next++] = [...prev, entry[0]];
          if (next === 1 << size && size < 12) size++;
        }
        prev = entry;
      }
      out.frames.push(px);
      out.delays.push(pendingDelay);
    } else throw new Error('bloque GIF desconocido ' + b);
  }
  return out;
}

describe('GIF animado', () => {
  it('ida y vuelta: los píxeles salen exactamente como entraron (incluye tablas LZW que se llenan y reinician)', () => {
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) >> 8);
    const palette = Array.from({ length: 16 }, (_, i) => '#' + (i * 0x111111).toString(16).padStart(6, '0'));
    const W = 120, H = 100;
    const noisy = Uint8Array.from({ length: W * H }, () => rnd() % 16); // ruido: llena la tabla de 4096 códigos
    const flat = new Uint8Array(W * H).fill(3); // todo igual: la compresión más repetitiva
    const stripes = Uint8Array.from({ length: W * H }, (_, i) => (Math.floor(i / W) + (i % W >> 3)) % 5);
    const gif = encodeGif({ width: W, height: H, palette, frames: [noisy, flat, stripes], delayCs: 17, transparentIndex: 0 });
    const d = decodeGif(gif);
    expect(d.sig).toBe('GIF89a');
    expect([d.width, d.height]).toEqual([W, H]);
    expect(d.trailer).toBe(true);
    expect(d.frames).toHaveLength(3);
    expect(d.frames[0]).toEqual([...noisy]);
    expect(d.frames[1]).toEqual([...flat]);
    expect(d.frames[2]).toEqual([...stripes]);
    expect(d.delays).toEqual([17, 17, 17]);
    expect(d.transparent).toBe(0);
    expect(d.loop).toBe(0); // bucle infinito
    expect(d.palette.slice(0, 3)).toEqual(['#000000', '#111111', '#222222']);
  });
  it('paletas pequeñas (2 colores) y grandes (200 colores)', () => {
    const two = encodeGif({ width: 4, height: 4, palette: ['#000000', '#ffffff'], frames: [Uint8Array.from([0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0])], delayCs: 10 });
    expect(decodeGif(two).frames[0]).toEqual([0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0]);
    const pal = Array.from({ length: 200 }, (_, i) => '#' + i.toString(16).padStart(2, '0').repeat(3));
    const px = Uint8Array.from({ length: 64 * 64 }, (_, i) => (i * 7) % 200);
    expect(decodeGif(encodeGif({ width: 64, height: 64, palette: pal, frames: [px], delayCs: 5 })).frames[0]).toEqual([...px]);
  });
  it('rechaza datos mal formados', () => {
    expect(() => encodeGif({ width: 2, height: 2, palette: ['#000000'], frames: [new Uint8Array(3)], delayCs: 10 })).toThrow();
    expect(() => encodeGif({ width: 1, height: 1, palette: ['#000000'], frames: [Uint8Array.from([5])], delayCs: 10 })).toThrow();
    expect(() => encodeGif({ width: 1, height: 1, palette: [], frames: [], delayCs: 10 })).toThrow();
  });

  it('el GIF del pato: 4 caras en bucle, 128×128, fondo transparente, a la velocidad del proyecto', () => {
    const d = newDuck();
    const g = decodeGif(buildGif(d, null, 6));
    expect([g.width, g.height]).toEqual([128, 128]); // pato 8×8 sin accesorio: ×16
    expect(g.frames).toHaveLength(4);
    expect(g.delays).toEqual([17, 17, 17, 17]); // 6 fps
    expect(g.transparent).toBe(0);
    expect(g.frames[0]).not.toEqual(g.frames[1]); // cada cara es distinta
    expect(g.frames[0][0]).toBe(0); // la esquina está vacía = transparente
  });
  it('con accesorio usa el lienzo con margen (16 -> ×8, también 128×128) y los pixeles coinciden con las caras', () => {
    const d = { ...newDuck(), accessory: 'cape', accessoryColor: BASIC_COLORS.find((c) => c.name === 'Red')!.hex };
    const acc = getAccessory('cape')!;
    const g = decodeGif(buildGif(d, acc, 8));
    expect([g.width, g.height]).toEqual([128, 128]);
    expect(g.delays[0]).toBe(13); // 8 fps
    const n = canvasSize(8);
    const scale = pngScaleForGif(n);
    for (let face = 0; face < 4; face++) {
      const cells = composeForImage(d, 8, face, acc);
      for (const [x, y] of [[10, 10], [60, 70], [100, 50], [5, 120], [64, 64]]) {
        const c = cells[Math.floor(y / scale) * n + Math.floor(x / scale)];
        const idx = g.frames[face][y * 128 + x];
        expect(idx === 0 ? null : g.palette[idx]).toBe(c);
      }
    }
    expect(g.palette).toContain(BASIC_COLORS.find((c) => c.name === 'Red')!.hex); // el color elegido está en el GIF
  });
});

describe('exportar solo el accesorio actual', () => {
  it('la hoja usa el color elegido para el pato (o el de fábrica si no hay)', () => {
    const cape = getAccessory('cape')!;
    const m = buildAccessoryManifest(cape, 8, 'cape', 'accessory-cape.png')!;
    const red = BASIC_COLORS.find((c) => c.name === 'Red')!.hex;
    const withRed = accessorySheetPixels(cape, 8, m, red);
    const factory = accessorySheetPixels(cape, 8, m, null);
    expect(withRed).toHaveLength(factory.length); // los mismos píxeles...
    expect(withRed.some((p) => p.color === red)).toBe(true);
    expect(factory.some((p) => p.color === red)).toBe(false);
    expect(factory.some((p) => p.color === cape.defaultColor)).toBe(true); // ...con los colores de fábrica
    expect(withRed.every((p) => p.x >= 0 && p.x < m.sheet.width && p.y >= 0 && p.y < m.sheet.height)).toBe(true);
  });
});

// ---------- ZIP: lector independiente ----------
function readZip(zip: Uint8Array) {
  const v = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  // fin del directorio central: últimos 22 bytes (sin comentario)
  const eocd = zip.length - 22;
  expect(v.getUint32(eocd, true)).toBe(0x06054b50);
  const count = v.getUint16(eocd + 10, true);
  const cdSize = v.getUint32(eocd + 12, true);
  const cdStart = v.getUint32(eocd + 16, true);
  expect(cdStart + cdSize).toBe(eocd); // el directorio central termina justo donde empieza el fin
  const files: { name: string; data: Uint8Array; crcOk: boolean }[] = [];
  let p = cdStart;
  for (let i = 0; i < count; i++) {
    expect(v.getUint32(p, true)).toBe(0x02014b50);
    const crc = v.getUint32(p + 16, true);
    const size = v.getUint32(p + 24, true);
    const nameLen = v.getUint16(p + 28, true);
    const local = v.getUint32(p + 42, true);
    const name = new TextDecoder().decode(zip.slice(p + 46, p + 46 + nameLen));
    // cabecera local
    expect(v.getUint32(local, true)).toBe(0x04034b50);
    expect(v.getUint16(local + 8, true)).toBe(0); // sin compresión
    const lNameLen = v.getUint16(local + 26, true);
    const start = local + 30 + lNameLen;
    const data = zip.slice(start, start + size);
    files.push({ name, data, crcOk: crc32(data) === crc });
    p += 46 + nameLen;
  }
  expect(p).toBe(cdStart + cdSize);
  return files;
}

describe('ZIP (una sola descarga)', () => {
  it('crc32 conocido', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926); // valor de referencia estándar
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
  it('ida y vuelta: nombres, contenidos y CRC', () => {
    const files = [
      { name: 'duck-1.png', data: Uint8Array.from([137, 80, 78, 71, 0, 255, 10]) },
      { name: 'duck-1.json', data: new TextEncoder().encode('{"a":1,"ñ":"é"}') },
      { name: 'accessory-cape.json', data: new Uint8Array(0) },
      { name: 'grande.bin', data: Uint8Array.from({ length: 70000 }, (_, i) => (i * 31) & 255) },
    ];
    const out = readZip(createZip(files, new Date(2026, 9, 5, 12, 30, 10)));
    expect(out.map((f) => f.name)).toEqual(files.map((f) => f.name));
    out.forEach((f, i) => {
      expect([...f.data]).toEqual([...files[i].data]);
      expect(f.crcOk).toBe(true);
    });
  });
  it('rechaza nombres repetidos', () => {
    expect(() => createZip([{ name: 'a', data: new Uint8Array(1) }, { name: 'a', data: new Uint8Array(1) }])).toThrow();
  });
  it('un ZIP vacío es válido', () => {
    expect(readZip(createZip([]))).toEqual([]);
  });
});

describe('PNG: completo o solo la cara actual', () => {
  it('el lado de la imagen depende del accesorio (pato 8 -> 8 celdas; con accesorio -> lienzo de 16)', () => {
    const d = newDuck();
    expect(imageSide(d, null)).toBe(8);
    expect(imageSide(d, getAccessory('hat')!)).toBe(16);
  });
  it('el zoom automático deja cada cara de 128 px, sola o en la tira', () => {
    const d = newDuck();
    for (const acc of [null, getAccessory('cape')!]) {
      const side = imageSide(d, acc) * pngScale(imageSide(d, acc));
      expect(side).toBe(128);
      // La tira mide 4 caras de ancho y una cara sola, 1.
      expect(side * MAX_FRAMES).toBe(512);
    }
  });
  it('cada cara que se exporta es exactamente la de composeForImage', () => {
    const d = newDuck();
    const acc = getAccessory('crown')!;
    for (let face = 0; face < MAX_FRAMES; face++) expect(composeForImage(d, 8, face, acc)).toHaveLength(imageSide(d, acc) ** 2);
  });
});
