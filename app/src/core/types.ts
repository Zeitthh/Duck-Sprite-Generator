/** 8×8 es el icono (por defecto); 16×16 es la versión detallada. */
export type DuckSize = 8 | 16;
export const SIZES: DuckSize[] = [8, 16];
export const DEFAULT_SIZE: DuckSize = 8;
/**
 * Tamaños que usan la interfaz y la exportación. El modelo base es el 8×8. El 16×16 está APAGADO pero su código
 * y sus datos se conservan: para reactivarlo, `[8, 16]`.
 */
export const ENABLED_SIZES: DuckSize[] = [8];
/** Las 4 caras de cada pato, en orden (índices 0..3). Todas se crean al añadir el pato. */
export const FACE_NAMES = ['right', 'front', 'left', 'back'] as const;
export type FaceName = (typeof FACE_NAMES)[number];
export const MAX_FRAMES = FACE_NAMES.length;
export const MAX_COLORS = 32;
export const DEFAULT_FPS = 6;

/** size × size valores: 0 = transparente, n = palette[n - 1]. */
export type Frame = number[];

/** Las 4 caras de cada tamaño. Los píxeles de la silueta (ver template.ts) nunca son 0. */
export type DuckFrames = Record<DuckSize, Frame[]>;

/**
 * Un pato = el mismo pato en dos tamaños de píxel (8×8 y 16×16). Comparten nombre y paleta;
 * `size` es la versión que se está editando. Al exportar salen las dos.
 */
export interface Duck {
  id: string;
  name: string;
  size: DuckSize;
  /** Colores "#rrggbb", compartidos por las dos versiones. */
  palette: string[];
  frames: DuckFrames;
  /** Id del accesorio puesto (ver accessories.ts) o null. Por ahora solo afecta a la vista previa. */
  accessory: string | null;
  /** Color principal del accesorio (uno de los colores básicos) o null = el de por defecto. */
  accessoryColor: string | null;
}

/** Una cara de un accesorio: dos capas de 16 filas × 16 caracteres ('.' = vacío, letra = color del accesorio). */
export interface FaceArt {
  /** Detrás del pato (solo se ve donde el pato es transparente). */
  under: string[];
  /** Encima del pato. */
  over: string[];
}

/** Accesorio editable. Cada tamaño de pato tiene su propio dibujo, con las 4 caras (right, front, left, back). */
export interface Accessory {
  id: string;
  name: string;
  /** Los que vienen de fábrica no se pueden borrar (sí restablecer). */
  builtin: boolean;
  /** Versión del dibujo de fábrica; si un proyecto guardado trae una menor, se actualiza al abrirlo. */
  rev: number;
  /** Letra del color principal: el único que se puede cambiar (entre los colores básicos). */
  main: string;
  /** Color principal por defecto (uno de los colores básicos). */
  defaultColor: string;
  /** Letras que son un tono del principal: letra -> factor de brillo (0.6 = más oscuro). */
  shades: Record<string, number>;
  /** Colores fijos de las demás letras. */
  fixed: Record<string, string>;
  faces: Record<DuckSize, FaceArt[]>;
}

export interface Project {
  version: 1;
  fps: number;
  ducks: Duck[];
  /** Accesorios (de fábrica + los creados por el usuario). */
  accessories: Accessory[];
}
