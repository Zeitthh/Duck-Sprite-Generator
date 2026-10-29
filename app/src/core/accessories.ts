import { isAccessoryColor, nearestAccessoryColor, normalizeHex } from './palette';
import { SIZES, type Accessory, type Duck, type DuckSize, type FaceArt } from './types';

/**
 * Accesorios = capas que se dibujan alrededor del pato en un LIENZO CON MARGEN: el lienzo mide el doble
 * que el pato (pato 8×8 -> lienzo 16×16, con el pato centrado y 4 px libres por lado; pato 16×16 -> 32×32).
 *
 * Cada tamaño de pato tiene SU PROPIO dibujo del accesorio, en una cuadrícula de 16×16 que se escala al lienzo
 * (×1 para el pato 8×8, ×2 para el 16×16). Cada cara tiene dos capas:
 *  - `under`: detrás del pato (solo se ve donde el pato es transparente), p. ej. el vuelo de una capa.
 *  - `over`:  encima del pato, p. ej. un sombrero.
 * Letras: '.' vacío; el color de cada letra se resuelve con `accessoryColors`.
 * Los accesorios viven en el proyecto (`Project.accessories`) y se editan en la pestaña Accessories.
 */

export const CANVAS = 16;
export const BLANK_ROW = '.'.repeat(CANVAS);
export type Layer = 'under' | 'over';
export const LAYERS: Layer[] = ['over', 'under'];

/** 16 filas; `rows` indica solo las que tienen dibujo (índice de fila -> texto). */
const art = (rows: Record<number, string> = {}) => Array.from({ length: CANVAS }, (_, y) => rows[y] ?? BLANK_ROW);
export const blankFace = (): FaceArt => ({ under: art(), over: art() });
const layer = (under: Record<number, string> | undefined, over: Record<number, string> | undefined): FaceArt => ({
  under: art(under),
  over: art(over),
});

export const flipRows = (rows: string[]) => rows.map((r) => [...r].reverse().join(''));
export const cloneFace = (f: FaceArt): FaceArt => ({ under: f.under.slice(), over: f.over.slice() });
export const mirrorFace = (f: FaceArt): FaceArt => ({ under: flipRows(f.under), over: flipRows(f.over) });

/** right, front -> [right, front, left (espejo de right), back (= front salvo que se indique)]. */
const faces4 = (right: FaceArt, front: FaceArt, back: FaceArt = front): FaceArt[] => [
  cloneFace(right),
  cloneFace(front),
  mirrorFace(right),
  cloneFace(back),
];

// El pato 8×8 queda en las filas/columnas 4..11 del lienzo; la cabeza empieza en la fila 5.
const CAPE_SIDES = { 8: '...C.......C....', 9: '..CC.......CC...', 10: '..CD.......DC...' };

/** Versión actual de los accesorios de fábrica (súbela cuando cambie su dibujo para actualizar proyectos guardados). */
export const FACTORY_REV = 10;

/** Revisión en la que se añadió cada accesorio de fábrica nuevo (los proyectos anteriores lo reciben al cargarse). */
const ADDED_IN: Record<string, number> = {
  santa: 6, cowboy: 6, wizard: 6, witch: 6, chef: 6, party: 6, grad: 6,
  pumpkin: 7, skull: 7, eggshell: 7, beanie: 7, flowerpot: 7,
  leaf: 8, scarf: 8, feather: 8,
  cheese: 9, banana: 9, catears: 9, halo: 9, cone: 9, fez: 9, mushroom: 9, burger: 9,
  cherry: 10, icecream: 10, candle: 10, bunny: 10, horns: 10, bow: 10, pizza: 10, plunger: 10, sticky: 10,
};

/** Sombrero de fábrica: el mismo dibujo (cuadrícula de 16×16) para el pato 8×8 y el 16×16. */
function hat(
  id: string,
  name: string,
  main: string,
  defaultColor: string,
  shades: Record<string, number>,
  fixed: Record<string, string>,
  right: Record<number, string>,
  front: Record<number, string>,
  back: Record<number, string> = front,
): Accessory {
  const mk = () => faces4(layer(undefined, right), layer(undefined, front), layer(undefined, back));
  return { id, name, builtin: true, rev: FACTORY_REV, main, defaultColor, shades, fixed, faces: { 8: mk(), 16: mk() } };
}

/** Vista de lado de un sombrero de frente: la cabeza del pato asoma una columna a la derecha. */
const sideOf = (front: Record<number, string>): Record<number, string> =>
  Object.fromEntries(Object.entries(front).map(([y, r]) => [y, '.' + r.slice(0, CANVAS - 1)]));

/** Accesorios de fábrica. Siempre se devuelven copias nuevas (se pueden editar sin tocar estos datos). */
export function defaultAccessories(): Accessory[] {
  return [
    {
      id: 'hat',
      name: 'Hat',
      builtin: true,
      rev: FACTORY_REV,
      main: 'H',
      defaultColor: '#000000',
      shades: { B: 0.7 },
      fixed: { R: '#d62839' },
      faces: {
        // 8×8 (modelo base): copa de 2 filas + banda + ala (el mismo dibujo que se usaba en 16×16)
        8: faces4(
          layer(undefined, { 2: '.......HHH......', 3: '.......HHH......', 4: '.......RRR......', 5: '......BBBBB.....' }),
          layer(undefined, { 2: '......HHH.......', 3: '......HHH.......', 4: '......RRR.......', 5: '.....BBBBB......' }),
        ),
        // 16×16 (apagado): el mismo dibujo
        16: faces4(
          layer(undefined, { 2: '.......HHH......', 3: '.......HHH......', 4: '.......RRR......', 5: '......BBBBB.....' }),
          layer(undefined, { 2: '......HHH.......', 3: '......HHH.......', 4: '......RRR.......', 5: '.....BBBBB......' }),
        ),
      },
    },
    {
      id: 'cape',
      name: 'Cape',
      builtin: true,
      rev: FACTORY_REV,
      main: 'C',
      defaultColor: '#2f7fe0',
      shades: { D: 0.6 },
      fixed: { Y: '#f2c230' },
      faces: {
        // 8×8 (modelo base): la capa pequeña de siempre, en right/left POR ENCIMA de lo blanco del pato
        // (hombros y espalda) y con el broche en el pecho, como en el sprite de referencia. Sin vuelo largo.
        8: faces4(
          layer(
            { 6: '....CC..........' },
            { 7: '....CCC.........', 8: '....CCCCCY......', 9: '.....DCCC.......' },
          ),
          layer(undefined, { 8: '.....CCCCC......', 9: '.......Y........' }),
          layer(undefined, { 8: '.....CCCCC......', 9: '.....DDDDD......' }),
        ),
        // 16×16 (apagado): vuelo hacia atrás y solapas a los lados
        16: faces4(
          layer(
            { 8: '..CCC...........', 9: '.CCCCC..........', 10: '.CCCC...........', 11: '.DDD............' },
            { 7: '....CCC.........', 8: '....CCCY........' },
          ),
          layer(CAPE_SIDES, { 8: '.....CCCCC......', 9: '.......Y........' }),
          layer(CAPE_SIDES, { 8: '.....CCCCC......', 9: '.....DDDDD......' }),
        ),
      },
    },
    {
      id: 'crown',
      name: 'Crown',
      builtin: true,
      rev: FACTORY_REV,
      main: 'G',
      defaultColor: '#ffd21f',
      shades: {},
      fixed: { R: '#d62839' },
      faces: {
        // 8×8 (modelo base) y 16×16 (apagado): puntas + base sobre la cabeza
        8: faces4(
          layer(undefined, { 4: '......G.G.G.....', 5: '......GGRGG.....' }),
          layer(undefined, { 4: '.....G.G.G......', 5: '.....GGRGG......' }),
        ),
        16: faces4(
          layer(undefined, { 4: '......G.G.G.....', 5: '......GGRGG.....' }),
          layer(undefined, { 4: '.....G.G.G......', 5: '.....GGRGG......' }),
        ),
      },
    },
    // ---- Sombreros (sobre la cabeza: RIGHT cols 7-9, FRONT cols 6-8; el ala/borde tapa el contorno de la fila 5) ----
    hat('santa', 'Santa hat', 'H', '#e03131', { D: 0.7 }, { W: '#ffffff' },
      { 2: '....WW..........', 3: '....HHD.........', 4: '.....HHHH.......', 5: '.....WWWWWW.....' },
      { 2: '.......WW.......', 3: '......HHH.......', 4: '.....HHHHH......', 5: '.....WWWWW......' }),
    hat('cowboy', 'Cowboy hat', 'H', '#7a4b2a', { D: 0.6 }, {},
      { 3: '.......HDH......', 4: '....H.DDDDDH....', 5: '....HHHHHHHH....' },
      { 3: '......HDH.......', 4: '...H.DDDDD.H....', 5: '...HHHHHHHHH....' }),
    hat('wizard', 'Wizard hat', 'H', '#2f7fe0', { D: 0.6 }, { Y: '#f2c230' },
      { 1: '........H.......', 2: '.......HH.......', 3: '.......HYH......', 4: '......DDDDD.....', 5: '.....HHHHHHH....' },
      { 1: '.......H........', 2: '......HHH.......', 3: '......HYH.......', 4: '.....DDDDD......', 5: '....HHHHHHH.....' }),
    hat('witch', 'Witch hat', 'H', '#000000', {}, { B: '#7e3fbf', Y: '#f2c230' },
      { 1: '....HH..........', 2: '......HH........', 3: '.......HHH......', 4: '......BBYBB.....', 5: '....HHHHHHHH....' },
      { 1: '.........H......', 2: '.......HH.......', 3: '......HHH.......', 4: '.....BBYBB......', 5: '...HHHHHHHHH....' }),
    hat('chef', 'Chef hat', 'H', '#ffffff', { D: 0.8 }, {},
      { 1: '.......HHH......', 2: '......HHHHH.....', 3: '......HHDHH.....', 4: '.......HHH......', 5: '.......DDD......' },
      { 1: '......HHH.......', 2: '.....HHHHH......', 3: '.....HHDHH......', 4: '......HHH.......', 5: '......DDD.......' }),
    hat('party', 'Party hat', 'H', '#ff8fc7', { D: 0.7 }, { Y: '#f2c230' },
      { 1: '........Y.......', 2: '........H.......', 3: '.......HHD......', 4: '.......DHH......', 5: '......HHDHH.....' },
      { 1: '.......Y........', 2: '.......H........', 3: '......HHD.......', 4: '......DHH.......', 5: '.....HHDHH......' }),
    hat('grad', 'Graduation cap', 'H', '#000000', { D: 0.6 }, { Y: '#f2c230' },
      { 3: '......HHHH......', 4: '....HHHHHHHH....', 5: '....Y..DDD......', 6: '....Y...........' },
      { 3: '......HHH.......', 4: '...HHHHHHHHH....', 5: '......DDD..Y....', 6: '...........Y....' }),
    // ---- Hats del Chao Garden (Sonic Adventure): pequeños, 4-5 filas y 5-7 columnas ----
    hat('pumpkin', 'Pumpkin', 'H', '#ff8c00', { D: 0.7 }, { G: '#3aa655' },
      sideOf({ 2: '.......G........', 3: '.....HHHHH......', 4: '....HHDHDHH.....', 5: '....HDHHHDH.....' }),
      { 2: '.......G........', 3: '.....HHHHH......', 4: '....HHDHDHH.....', 5: '....HDHHHDH.....' }),
    hat('skull', 'Skull', 'H', '#ffffff', { D: 0.7 }, { K: '#000000' },
      sideOf({ 2: '.....HHHHH......', 3: '....HHHHHHH.....', 4: '....HKKHKKH.....', 5: '.....DHKHD......' }),
      { 2: '.....HHHHH......', 3: '....HHHHHHH.....', 4: '....HKKHKKH.....', 5: '.....DHKHD......' }),
    hat('eggshell', 'Eggshell', 'H', '#ffffff', { D: 0.8 }, {},
      sideOf({ 2: '......HHH.......', 3: '.....HHHHH......', 4: '....HHHHHHD.....', 5: '....H.HHH.H.....' }),
      { 2: '......HHH.......', 3: '.....HHHHH......', 4: '....HHHHHHD.....', 5: '....H.HHH.H.....' }),
    hat('beanie', 'Beanie', 'H', '#e03131', { D: 0.7 }, { W: '#ffffff' },
      sideOf({ 2: '......WWW.......', 3: '.....HHHHH......', 4: '....HHDHDHH.....', 5: '....WWWWWWW.....' }),
      { 2: '......WWW.......', 3: '.....HHHHH......', 4: '....HHDHDHH.....', 5: '....WWWWWWW.....' }),
    hat('flowerpot', 'Flower pot', 'H', '#7a4b2a', { D: 0.7 }, { G: '#3aa655', P: '#ff8fc7' },
      sideOf({ 1: '.......P........', 2: '......PGP.......', 3: '.....HHHHH......', 4: '......HDH.......', 5: '......HHH.......' }),
      { 1: '.......P........', 2: '......PGP.......', 3: '.....HHHHH......', 4: '......HDH.......', 5: '......HHH.......' }),
    hat('leaf', 'Leaf', 'G', '#3aa655', { D: 0.6 }, {},
      sideOf({ 3: '.....GG.GG......', 4: '......GGG.......', 5: '.......D........' }),
      { 3: '.....GG.GG......', 4: '......GGG.......', 5: '.......D........' }),
    hat('feather', 'Feather', 'H', '#e03131', { D: 0.6 }, {},
      sideOf({ 1: '........H.......', 2: '.......HH.......', 3: '.......HD.......', 4: '......HHD.......', 5: '......DD........' }),
      { 1: '........H.......', 2: '.......HH.......', 3: '.......HD.......', 4: '......HHD.......', 5: '......DD........' }),
    // La bufanda va en el cuello (filas 8-10), no en la cabeza; la cola cuelga hacia atrás en la vista de lado.
    hat('scarf', 'Scarf', 'H', '#e03131', { D: 0.6 }, { W: '#ffffff' },
      { 8: '....HHHHH.......', 9: '...HDHH.........', 10: '..HW............' },
      { 8: '.....HHHHH......', 9: '.........H......', 10: '.........W......' },
      { 8: '.....HHHHH......', 9: '.....DDDDD......' }),
    // ---- Hats estilo Among Us: objetos random sobre la cabeza ----
    hat('cheese', 'Cheese', 'H', '#ffd21f', { D: 0.7 }, {},
      sideOf({ 3: '......HHHH......', 4: '.....HDHHHH.....', 5: '....HHHHDHH.....' }),
      { 3: '......HHHH......', 4: '.....HDHHHH.....', 5: '....HHHHDHH.....' }),
    hat('banana', 'Banana', 'H', '#ffd21f', { D: 0.7 }, { B: '#7a4b2a' },
      sideOf({ 3: '....HH...HB.....', 4: '.....HHHHH......', 5: '......DDD.......' }),
      { 3: '....HH...HB.....', 4: '.....HHHHH......', 5: '......DDD.......' }),
    hat('catears', 'Cat ears', 'H', '#000000', {}, { P: '#ff8fc7' },
      sideOf({ 3: '.....H...H......', 4: '.....HH.HH......', 5: '.....PH.HP......' }),
      { 3: '.....H...H......', 4: '.....HH.HH......', 5: '.....PH.HP......' }),
    hat('halo', 'Halo', 'H', '#ffd21f', { D: 0.7 }, {},
      sideOf({ 3: '......HHH.......', 4: '.....H...H......', 5: '......DDD.......' }),
      { 3: '......HHH.......', 4: '.....H...H......', 5: '......DDD.......' }),
    hat('cone', 'Traffic cone', 'H', '#ff8c00', {}, { W: '#ffffff' },
      sideOf({ 2: '.......H........', 3: '......HHH.......', 4: '......WWW.......', 5: '.....HHHHH......' }),
      { 2: '.......H........', 3: '......HHH.......', 4: '......WWW.......', 5: '.....HHHHH......' }),
    hat('fez', 'Fez', 'H', '#e03131', { D: 0.7 }, { Y: '#f2c230' },
      sideOf({ 2: '.......YY.......', 3: '......HHHY......', 4: '.....HHHHH......', 5: '.....DDDDD......' }),
      { 2: '.......YY.......', 3: '......HHHY......', 4: '.....HHHHH......', 5: '.....DDDDD......' }),
    hat('mushroom', 'Mushroom', 'H', '#e03131', { D: 0.7 }, { W: '#ffffff' },
      sideOf({ 2: '......HHH.......', 3: '.....HWHHH......', 4: '....HHHHWHH.....', 5: '....DDDDDDD.....' }),
      { 2: '......HHH.......', 3: '.....HWHHH......', 4: '....HHHHWHH.....', 5: '....DDDDDDD.....' }),
    hat('burger', 'Hamburger', 'H', '#7a4b2a', { D: 0.7 }, { Y: '#f2c230', G: '#3aa655', K: '#4a2a14' },
      sideOf({ 2: '.....HHHHH......', 3: '....HHYHYHH.....', 4: '....GGGGGGG.....', 5: '....KKKKKKK.....' }),
      { 2: '.....HHHHH......', 3: '....HHYHYHH.....', 4: '....GGGGGGG.....', 5: '....KKKKKKK.....' }),
    hat('cherry', 'Cherry', 'H', '#e03131', { D: 0.7 }, { G: '#3aa655' },
      sideOf({ 2: '.......G........', 3: '......G.G.......', 4: '.....HH.HH......', 5: '.....DH.DH......' }),
      { 2: '.......G........', 3: '......G.G.......', 4: '.....HH.HH......', 5: '.....DH.DH......' }),
    hat('icecream', 'Ice cream', 'H', '#ff8fc7', { D: 0.8 }, { C: '#d9a05b' },
      sideOf({ 2: '......HHH.......', 3: '.....HHDHH......', 4: '.....CCCCC......', 5: '......CCC.......' }),
      { 2: '......HHH.......', 3: '.....HHDHH......', 4: '.....CCCCC......', 5: '......CCC.......' }),
    hat('candle', 'Candle', 'H', '#ffffff', { D: 0.8 }, { O: '#ff8c00', Y: '#ffd21f' },
      sideOf({ 1: '.......O........', 2: '.......Y........', 3: '......HHD.......', 4: '......HHD.......', 5: '......HHD.......' }),
      { 1: '.......O........', 2: '.......Y........', 3: '......HHD.......', 4: '......HHD.......', 5: '......HHD.......' }),
    hat('bunny', 'Bunny ears', 'H', '#ffffff', { D: 0.8 }, { P: '#ff8fc7' },
      sideOf({ 1: '.....HH.HH......', 2: '.....HP.PH......', 3: '.....HP.PH......', 4: '.....HP.PH......', 5: '.....HH.HH......' }),
      { 1: '.....HH.HH......', 2: '.....HP.PH......', 3: '.....HP.PH......', 4: '.....HP.PH......', 5: '.....HH.HH......' }),
    hat('horns', 'Devil horns', 'H', '#e03131', { D: 0.7 }, {},
      sideOf({ 3: '....H.....H.....', 4: '....HH...HH.....', 5: '.....HH.HH......' }),
      { 3: '....H.....H.....', 4: '....HH...HH.....', 5: '.....HH.HH......' }),
    hat('bow', 'Bow', 'H', '#ff8fc7', { D: 0.7 }, {},
      sideOf({ 3: '....HH...HH.....', 4: '....HHHDHHH.....', 5: '....HH.D.HH.....' }),
      { 3: '....HH...HH.....', 4: '....HHHDHHH.....', 5: '....HH.D.HH.....' }),
    hat('pizza', 'Pizza', 'H', '#ffd21f', { D: 0.7 }, { R: '#e03131', B: '#7a4b2a' },
      sideOf({ 2: '.....BBBBB......', 3: '.....HRHHH......', 4: '......HRH.......', 5: '.......H........' }),
      { 2: '.....BBBBB......', 3: '.....HRHHH......', 4: '......HRH.......', 5: '.......H........' }),
    hat('plunger', 'Plunger', 'H', '#e03131', { D: 0.7 }, { B: '#7a4b2a' },
      sideOf({ 1: '.......B........', 2: '.......B........', 3: '.......B........', 4: '......HHH.......', 5: '.....HHHHH......' }),
      { 1: '.......B........', 2: '.......B........', 3: '.......B........', 4: '......HHH.......', 5: '.....HHHHH......' }),
    hat('sticky', 'Sticky note', 'H', '#ffd21f', { D: 0.6 }, {},
      sideOf({ 2: '.....HHHHH......', 3: '.....HDDDH......', 4: '.....HHHHH......', 5: '.....HDDDH......' }),
      { 2: '.....HHHHH......', 3: '.....HDDDH......', 4: '.....HHHHH......', 5: '.....HDDDH......' }),
  ];
}

/** Los accesorios de fábrica tal cual vienen (solo lectura; para pruebas y valores por defecto). */
export const ACCESSORIES: Accessory[] = defaultAccessories();

/** Accesorio nuevo y vacío, con los colores de siempre: principal (M), su tono oscuro (D) y 4 fijos. */
export function blankAccessory(id: string, name = 'New accessory'): Accessory {
  return {
    id,
    name,
    builtin: false,
    rev: 1,
    main: 'M',
    defaultColor: '#ffd21f',
    shades: { D: 0.6 },
    fixed: { K: '#000000', W: '#ffffff', R: '#d62839', Y: '#f2c230' },
    faces: { 8: Array.from({ length: 4 }, blankFace), 16: Array.from({ length: 4 }, blankFace) },
  };
}

export const getAccessory = (id: string | null | undefined, list: Accessory[] = ACCESSORIES) =>
  list.find((a) => a.id === id) ?? null;

export { isAccessoryColor };

function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.round(Math.min(255, ((n >> shift) & 255) * factor));
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

/** Color de cada letra del accesorio. `main` = color principal elegido (o el de por defecto). */
export function accessoryColors(acc: Accessory, main?: string | null): Record<string, string> {
  const m = isAccessoryColor(main) ? main : acc.defaultColor;
  const out: Record<string, string> = { ...acc.fixed, [acc.main]: m };
  for (const [letter, factor] of Object.entries(acc.shades)) out[letter] = shade(m, factor);
  return out;
}

/** Letras con las que se puede dibujar (la paleta del editor): principal, tonos y fijos, con su papel. */
export function slotsOf(acc: Accessory): { letter: string; role: 'main' | 'shade' | 'fixed' }[] {
  return [
    { letter: acc.main, role: 'main' },
    ...Object.keys(acc.shades).map((letter) => ({ letter, role: 'shade' as const })),
    ...Object.keys(acc.fixed).map((letter) => ({ letter, role: 'fixed' as const })),
  ];
}

// ---------- edición (funciones puras sobre las filas de una capa) ----------

/** Pinta celdas con `ch` ('.' = borrar). Devuelve filas nuevas. */
export function paintArt(rows: string[], cells: [number, number][], ch: string): string[] {
  const out = rows.map((r) => [...r]);
  for (const [x, y] of cells) if (x >= 0 && y >= 0 && x < CANVAS && y < CANVAS) out[y][x] = ch;
  return out.map((r) => r.join(''));
}

/** Relleno por inundación (4 vecinos) de la capa. */
export function fillArt(rows: string[], x: number, y: number, ch: string): string[] {
  if (x < 0 || y < 0 || x >= CANVAS || y >= CANVAS) return rows;
  const grid = rows.map((r) => [...r]);
  const target = grid[y][x];
  if (target === ch) return rows;
  const stack: [number, number][] = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop()!;
    if (cx < 0 || cy < 0 || cx >= CANVAS || cy >= CANVAS || grid[cy][cx] !== target) continue;
    grid[cy][cx] = ch;
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
  return grid.map((r) => r.join(''));
}

// ---------- validación (proyecto guardado / importado) ----------

function parseFace(raw: unknown, letters: Set<string>, where: string): FaceArt {
  const f = raw as Record<string, unknown> | null;
  const layerRows = (key: 'under' | 'over'): string[] => {
    const rows = f?.[key];
    if (!Array.isArray(rows) || rows.length !== CANVAS) throw new Error(`${where}: ${key} must have ${CANVAS} rows`);
    return rows.map((r) => {
      if (typeof r !== 'string' || r.length !== CANVAS || ![...r].every((c) => c === '.' || letters.has(c)))
        throw new Error(`${where}: invalid ${key} row`);
      return r;
    });
  };
  return { under: layerRows('under'), over: layerRows('over') };
}

function parseAccessory(raw: unknown, index: number): Accessory {
  const a = raw as Record<string, unknown> | null;
  const where = `Accessory ${index + 1}`;
  if (!a || typeof a.id !== 'string' || !a.id || typeof a.name !== 'string' || typeof a.main !== 'string' || a.main.length !== 1)
    throw new Error(`${where}: invalid structure`);
  const shades: Record<string, number> = {};
  for (const [k, v] of Object.entries((a.shades ?? {}) as Record<string, unknown>)) {
    if (k.length !== 1 || typeof v !== 'number' || !(v > 0 && v <= 2)) throw new Error(`${where}: invalid shade`);
    shades[k] = v;
  }
  const fixed: Record<string, string> = {};
  for (const [k, v] of Object.entries((a.fixed ?? {}) as Record<string, unknown>)) {
    const hex = typeof v === 'string' ? normalizeHex(v) : null;
    if (k.length !== 1 || !hex) throw new Error(`${where}: invalid color`);
    fixed[k] = hex;
  }
  const letters = new Set([a.main, ...Object.keys(shades), ...Object.keys(fixed)]);
  if (letters.size !== 1 + Object.keys(shades).length + Object.keys(fixed).length || letters.has('.'))
    throw new Error(`${where}: repeated or invalid letters`);
  const facesRaw = (a.faces ?? {}) as Record<string, unknown>;
  const faces = {} as Record<DuckSize, FaceArt[]>;
  for (const size of SIZES) {
    const list = facesRaw[size];
    if (!Array.isArray(list) || list.length !== 4) throw new Error(`${where}: needs 4 faces for ${size}×${size}`);
    faces[size] = list.map((f, i) => parseFace(f, letters, `${where}, ${size}×${size}, face ${i + 1}`));
  }
  return {
    id: a.id,
    name: a.name,
    builtin: a.builtin === true,
    rev: typeof a.rev === 'number' ? a.rev : 0,
    main: a.main,
    // Un color que ya no está entre los 12 (p. ej. un gris) pasa al más parecido.
    defaultColor: isAccessoryColor(a.defaultColor) ? a.defaultColor : nearestAccessoryColor(String(a.defaultColor)),
    shades,
    fixed,
    faces,
  };
}

/** Valida los accesorios de un proyecto. Sin datos -> los de fábrica. Lo que el usuario borró se queda borrado. */
export function parseAccessories(raw: unknown): Accessory[] {
  if (raw == null) return defaultAccessories();
  if (!Array.isArray(raw)) throw new Error('Invalid accessories');
  const list = raw.map(parseAccessory);
  if (new Set(list.map((a) => a.id)).size !== list.length) throw new Error('Repeated accessory ids');
  // Los de fábrica siempre se marcan como tales (no se pueden borrar) y, si el proyecto trae una versión
  // anterior del dibujo de fábrica, se actualizan a la actual.
  const factory = new Map(defaultAccessories().map((a) => [a.id, a]));
  // Los de fábrica añadidos después de la versión con la que se guardó el proyecto se incorporan al cargarlo.
  const savedRev = Math.min(...list.filter((a) => factory.has(a.id)).map((a) => a.rev));
  const upgraded = list.map((a) => {
    const def = factory.get(a.id);
    if (!def) return a;
    return a.rev < def.rev ? def : { ...a, builtin: true };
  });
  const have = new Set(list.map((a) => a.id));
  for (const def of factory.values()) if (!have.has(def.id) && savedRev < (ADDED_IN[def.id] ?? 0)) upgraded.push(def);
  return upgraded;
}

// ---------- dibujo ----------

/** Lado del lienzo con margen para un pato de ese tamaño (8 -> 16, 16 -> 32). */
export const canvasSize = (size: DuckSize) => size * 2;

/** Colores (o null) de una capa (dibujo de 16×16) sobre el lienzo de ese pato: ×1 para el 8×8, ×2 para el 16×16. */
export function layerCells(
  rows: string[] | undefined,
  size: DuckSize,
  colors: Record<string, string>,
): (string | null)[] {
  const n = canvasSize(size);
  const out = new Array<string | null>(n * n).fill(null);
  if (!rows) return out;
  const k = n / CANVAS;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const ch = rows[Math.floor(y / k)][Math.floor(x / k)];
      if (ch !== '.') out[y * n + x] = colors[ch] ?? null;
    }
  return out;
}

/** Una cara del pato con su accesorio sobre el lienzo con margen: under -> pato -> over. */
export function compose(duck: Duck, size: DuckSize, face: number, acc: Accessory | null): (string | null)[] {
  const n = canvasSize(size);
  const off = size / 2;
  const colors = acc ? accessoryColors(acc, duck.accessoryColor) : {};
  const faceArt = acc?.faces[size][face];
  const cells = faceArt ? layerCells(faceArt.under, size, colors) : new Array<string | null>(n * n).fill(null);
  duck.frames[size][face].forEach((v, i) => {
    if (v) cells[(Math.floor(i / size) + off) * n + (i % size) + off] = duck.palette[v - 1];
  });
  if (faceArt) {
    layerCells(faceArt.over, size, colors).forEach((c, i) => {
      if (c) cells[i] = c;
    });
  }
  return cells;
}

/** Solo el accesorio (sin el pato) de ese tamaño y cara, sobre el lienzo con margen. */
export function accessoryOnly(acc: Accessory, size: DuckSize, main?: string | null, face = 0): (string | null)[] {
  const colors = accessoryColors(acc, main);
  const out = layerCells(acc.faces[size][face].under, size, colors);
  layerCells(acc.faces[size][face].over, size, colors).forEach((c, i) => {
    if (c) out[i] = c;
  });
  return out;
}

/** Rectángulo que ocupa lo dibujado en un lienzo de n×n (null si está vacío). */
export function boundsOf(cells: (string | null)[], n: number): { x: number; y: number; w: number; h: number } | null {
  let x0 = n, y0 = n, x1 = -1, y1 = -1;
  cells.forEach((c, i) => {
    if (!c) return;
    const x = i % n, y = Math.floor(i / n);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  });
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Cara lista para exportar: con accesorio, el lienzo con margen; sin accesorio, solo el pato (size × size). */
export function composeForImage(duck: Duck, size: DuckSize, face: number, acc: Accessory | null): (string | null)[] {
  const cells = compose(duck, size, face, acc);
  if (acc) return cells;
  const n = canvasSize(size);
  const off = size / 2;
  const out: (string | null)[] = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) out.push(cells[(y + off) * n + x + off]);
  return out;
}
