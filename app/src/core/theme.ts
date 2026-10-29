/** Solo dos temas: Dim (oscuro suave, el de siempre) y Light. No hay modo noche ni modo sistema. */
export type Theme = 'dim' | 'light';
export const THEMES: Theme[] = ['dim', 'light'];

export interface ThemeColors {
  bg: string;
  panel: string;
  line: string;
  text: string;
  dim: string;
  accent: string;
  danger: string;
  /** Fondo de los botones. */
  btn: string;
  /** Fondo de los campos de texto. */
  input: string;
  /** Dos tonos de la cuadrícula "transparente" de los lienzos. */
  checkerA: string;
  checkerB: string;
  /** Líneas de la cuadrícula sobre los lienzos. */
  grid: string;
  scheme: 'dark' | 'light';
}

export const THEME_COLORS: Record<Theme, ThemeColors> = {
  // Oscuro suave, azulado y con menos contraste.
  dim: {
    bg: '#15202b', panel: '#1c2a38', line: '#2f4153', text: '#e7edf3', dim: '#8da2b5',
    accent: '#ff8c00', danger: '#ff6b6b', btn: '#243546', input: '#101a24',
    checkerA: '#223242', checkerB: '#2b3e50', grid: 'rgba(255,255,255,0.1)', scheme: 'dark',
  },
  light: {
    bg: '#f3f4f8', panel: '#ffffff', line: '#d6d9e2', text: '#1c1e26', dim: '#6b7080',
    accent: '#e67700', danger: '#d92d3a', btn: '#eef0f6', input: '#ffffff',
    checkerA: '#e4e6ee', checkerB: '#f3f4f9', grid: 'rgba(0,0,0,0.12)', scheme: 'light',
  },
};

export const THEME_LABEL: Record<Theme, string> = { dim: 'Dim', light: 'Light' };

const KEY = 'duck-editor:theme';

export function loadTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    if (t === 'dim' || t === 'light') return t;
  } catch {
    /* storage bloqueado: tema por defecto */
  }
  return 'dim'; // cualquier otro valor guardado (p. ej. 'dark' de una versión anterior) vuelve a Dim
}

export function saveTheme(t: Theme) {
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* ignorar */
  }
}

/** Pone los colores del tema como variables CSS del documento. */
export function applyTheme(t: Theme) {
  const c = THEME_COLORS[t];
  const root = document.documentElement;
  const vars: Record<string, string> = {
    '--bg': c.bg, '--panel': c.panel, '--line': c.line, '--text': c.text, '--dim': c.dim,
    '--accent': c.accent, '--danger': c.danger, '--btn': c.btn, '--input': c.input,
    '--checker-a': c.checkerA, '--checker-b': c.checkerB, '--grid': c.grid,
  };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.style.colorScheme = c.scheme;
  root.dataset.theme = t;
}
