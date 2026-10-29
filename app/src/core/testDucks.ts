import { newDuck } from './project';
import type { Duck } from './types';

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, '0');
  }
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Pico oscuro para los patos naranjas / amarillos, donde el pico de siempre se perdería contra el cuerpo. */
const DARK_BEAK = ['#8b4a1f', '#b8743a', '#5e2f12'];

/**
 * Patos de prueba: la misma plantilla de siempre, cada uno con un color de cuerpo distinto (tonos repartidos por
 * toda la rueda de color, variando saturación y luminosidad). Sin accesorios. Solo para probar la app.
 */
export function generateTestDucks(count = 32): Duck[] {
  return Array.from({ length: count }, (_, i) => {
    const hue = (i * 360) / count;
    const body = hslToHex(hue, [88, 66][i % 2], [60, 48, 72][i % 3]);
    const duck = newDuck(`Duck ${String(i + 1).padStart(2, '0')} ${body}`);
    // palette: 1 negro (contorno y ojo), 2 cuerpo, 3-5 pico (medio, claro, oscuro)
    const palette = duck.palette.slice();
    palette[1] = body;
    if (hue >= 10 && hue <= 65) palette.splice(2, 3, ...DARK_BEAK);
    return { ...duck, palette, accessory: null, accessoryColor: null };
  });
}
