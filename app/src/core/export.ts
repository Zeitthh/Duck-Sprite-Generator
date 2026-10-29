import { accessoryColors, canvasSize, composeForImage, layerCells, type Layer } from './accessories';
import { drawFrame } from './draw';
import { encodeGif } from './gif';
import { FACE_NAMES, MAX_FRAMES, type Accessory, type Duck, type DuckSize, type Frame, type Project } from './types';

export interface SpriteEntry {
  name: string;
  duck: string;
  /** right | front | left | back */
  face: string;
  frame: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface AnimationEntry {
  name: string;
  fps: number;
  sprites: string[];
}

/** Contenido de ducks.json. Coordenadas con origen arriba-izquierda. */
export interface SheetManifest {
  version: 1;
  /** Lado de cada celda del sheet = el pato más grande (hoy siempre 8). */
  cellSize: number;
  /** Para Unity: igual a cellSize, así el pato más grande mide 1 unidad. */
  pixelsPerUnit: number;
  fps: number;
  sheet: { file: string; width: number; height: number };
  sprites: SpriteEntry[];
  animations: AnimationEntry[];
}

/** Un pato visto en un solo tamaño (lo que se exporta en cada sheet). */
export interface SizedDuck {
  name: string;
  palette: string[];
  size: DuckSize;
  frames: Frame[];
}

export const atSize = (d: Duck, size: DuckSize): SizedDuck => ({
  name: d.name,
  palette: d.palette,
  size,
  frames: d.frames[size],
});

export function slugify(name: string, fallback = 'duck'): string {
  const s = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || fallback;
}

/** Un slug por pato, único dentro de la lista (-2, -3... si se repite). */
export function uniqueSlugs(ducks: { name: string }[], fallback = 'duck'): string[] {
  const seen = new Map<string, number>();
  return ducks.map((d) => {
    const base = slugify(d.name, fallback);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });
}

/** Una fila por pato, una columna por cuadro usado (compactados, máx. 4). Cada pato va en la esquina de su celda. */
export function buildManifest(ducks: SizedDuck[], fps: number, file = 'ducks.png'): SheetManifest {
  const slugs = uniqueSlugs(ducks);
  const cell = Math.max(8, ...ducks.map((d) => d.size));
  const sprites: SpriteEntry[] = [];
  const animations: AnimationEntry[] = [];
  ducks.forEach((d, row) => {
    const used = d.frames;
    const names: string[] = [];
    used.forEach((_, col) => {
      const name = `${slugs[row]}_${FACE_NAMES[col]}`;
      names.push(name);
      sprites.push({ name, duck: slugs[row], face: FACE_NAMES[col], frame: col, x: col * cell, y: row * cell, w: d.size, h: d.size });
    });
    animations.push({ name: slugs[row], fps, sprites: names });
  });
  return {
    version: 1,
    cellSize: cell,
    pixelsPerUnit: cell,
    fps,
    sheet: { file, width: cell * MAX_FRAMES, height: Math.max(1, ducks.length) * cell },
    sprites,
    animations,
  };
}

export function drawSheet(ducks: SizedDuck[], manifest: SheetManifest): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = manifest.sheet.width;
  canvas.height = manifest.sheet.height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ducks.forEach((d, row) => {
    d.frames.forEach((f, col) =>
      drawFrame(ctx, d, f, 1, col * manifest.cellSize, row * manifest.cellSize));
  });
  return canvas;
}

/** Píxeles de pantalla por lado de cada cara en el PNG: el valor se elige solo según el tamaño del lienzo. */
export const PNG_FACE_PX = 128;
export const pngScale = (side: number) => Math.max(1, Math.floor(PNG_FACE_PX / side));

/** Lado (en celdas) de la imagen exportada: con accesorio, el lienzo con margen; sin accesorio, solo el pato. */
export const imageSide = (duck: Duck, acc: Accessory | null) => (acc ? canvasSize(duck.size) : duck.size);

/** Dibuja las caras pedidas del pato CON su accesorio, una al lado de la otra, con el zoom automático. */
function drawComposed(duck: Duck, acc: Accessory | null, faces: number[]): HTMLCanvasElement {
  const size = duck.size;
  const n = imageSide(duck, acc);
  const scale = pngScale(n);
  const canvas = document.createElement('canvas');
  canvas.width = faces.length * n * scale;
  canvas.height = n * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  faces.forEach((face, col) => {
    composeForImage(duck, size, face, acc).forEach((c, i) => {
      if (!c) return;
      ctx.fillStyle = c;
      ctx.fillRect(col * n * scale + (i % n) * scale, Math.floor(i / n) * scale, scale, scale);
    });
  });
  return canvas;
}

/** Tira horizontal con las 4 caras del pato CON su accesorio. */
export const drawComposedStrip = (duck: Duck, acc: Accessory | null) =>
  drawComposed(duck, acc, Array.from({ length: MAX_FRAMES }, (_, i) => i));

/** Una sola cara del pato CON su accesorio (la que se está editando). */
export const drawComposedFace = (duck: Duck, acc: Accessory | null, face: number) => drawComposed(duck, acc, [face]);

// ---------------- Hojas de accesorios (una por accesorio, aparte de la del pato) ----------------

export interface AccessorySprite {
  name: string;
  accessory: string;
  face: string;
  /** `over` va delante del pato; `under`, detrás. */
  layer: Layer;
  frame: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** ducks.json de un accesorio. Se usa igual que la hoja del pato: mismo tamaño de píxel y pivote al centro. */
export interface AccessoryManifest {
  version: 1;
  kind: 'accessory';
  accessory: string;
  /** Tamaño del pato para el que está dibujado (8 -> lienzo de 16×16). */
  duckSize: number;
  cellSize: number;
  /** Igual que el del pato (su tamaño): así cada píxel del accesorio mide lo mismo que uno del pato. */
  pixelsPerUnit: number;
  sheet: { file: string; width: number; height: number };
  sprites: AccessorySprite[];
}

/**
 * Hoja de un accesorio: 4 columnas (las caras) y una fila por capa que tenga dibujo (primero `over`, luego `under`).
 * Cada sprite es el lienzo con margen completo (el pato queda en el centro), por eso, con el pivote al centro y el mismo
 * pixelsPerUnit, se superpone al sprite del pato sin ningún cálculo. Devuelve null si el accesorio está vacío.
 */
export function buildAccessoryManifest(acc: Accessory, size: DuckSize, slug: string, file: string): AccessoryManifest | null {
  const n = canvasSize(size);
  const layers = (['over', 'under'] as Layer[]).filter((layer) =>
    acc.faces[size].some((f) => f[layer].some((row) => /[^.]/.test(row))),
  );
  if (layers.length === 0) return null;
  const sprites: AccessorySprite[] = [];
  layers.forEach((layer, row) =>
    FACE_NAMES.forEach((face, col) =>
      sprites.push({ name: `${slug}_${face}_${layer}`, accessory: slug, face, layer, frame: col, x: col * n, y: row * n, w: n, h: n }),
    ),
  );
  return {
    version: 1,
    kind: 'accessory',
    accessory: slug,
    duckSize: size,
    cellSize: n,
    pixelsPerUnit: size,
    sheet: { file, width: MAX_FRAMES * n, height: layers.length * n },
    sprites,
  };
}

/** Los píxeles de la hoja de un accesorio (posición y color), con el color principal elegido (o el de fábrica). */
export function accessorySheetPixels(
  acc: Accessory,
  size: DuckSize,
  manifest: AccessoryManifest,
  main?: string | null,
): { x: number; y: number; color: string }[] {
  const colors = accessoryColors(acc, main);
  const n = manifest.cellSize;
  const out: { x: number; y: number; color: string }[] = [];
  for (const sp of manifest.sprites)
    layerCells(acc.faces[size][sp.frame][sp.layer], size, colors).forEach((c, i) => {
      if (c) out.push({ x: sp.x + (i % n), y: sp.y + Math.floor(i / n), color: c });
    });
  return out;
}

/** Dibuja la hoja de un accesorio. `main` = el color principal que lleva el pato (null = el de fábrica). */
export function drawAccessorySheet(acc: Accessory, size: DuckSize, manifest: AccessoryManifest, main?: string | null): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = manifest.sheet.width;
  canvas.height = manifest.sheet.height;
  const ctx = canvas.getContext('2d')!;
  for (const p of accessorySheetPixels(acc, size, manifest, main)) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 1, 1);
  }
  return canvas;
}

// ---------------- GIF animado del pato (con su accesorio) ----------------

/** Fotogramas del GIF: las 4 caras en bucle, ampliadas por el mismo zoom automático que el PNG; fondo transparente. */
export function buildGif(duck: Duck, acc: Accessory | null, fps: number): Uint8Array<ArrayBuffer> {
  const size = duck.size;
  const n = acc ? canvasSize(size) : size;
  const scale = pngScale(n);
  const side = n * scale;
  const faces = Array.from({ length: MAX_FRAMES }, (_, face) => composeForImage(duck, size, face, acc));
  // Índice 0 = transparente; el resto, los colores que aparecen en alguna cara.
  const palette = ['#000000'];
  const indexOf = new Map<string, number>();
  for (const cells of faces)
    for (const c of cells)
      if (c && !indexOf.has(c)) {
        indexOf.set(c, palette.length);
        palette.push(c);
      }
  const frames = faces.map((cells) => {
    const px = new Uint8Array(side * side);
    for (let y = 0; y < side; y++)
      for (let x = 0; x < side; x++) {
        const c = cells[Math.floor(y / scale) * n + Math.floor(x / scale)];
        px[y * side + x] = c ? indexOf.get(c)! : 0;
      }
    return px;
  });
  return encodeGif({ width: side, height: side, palette, frames, delayCs: Math.round(100 / fps), transparentIndex: 0 });
}

export const projectToJson = (p: Project) => JSON.stringify(p);

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const downloadText = (text: string, filename: string, type = 'application/json') =>
  downloadBlob(new Blob([text], { type }), filename);

/** Los bytes de un canvas como PNG (para meterlo en un ZIP). */
export const canvasToBytes = (canvas: HTMLCanvasElement) =>
  new Promise<Uint8Array>((resolve, reject) =>
    canvas.toBlob(async (b) => (b ? resolve(new Uint8Array(await b.arrayBuffer())) : reject(new Error('No se pudo crear el PNG'))), 'image/png'),
  );

export const textToBytes = (text: string) => new TextEncoder().encode(text);

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((b) => b && downloadBlob(b, filename), 'image/png');
}
