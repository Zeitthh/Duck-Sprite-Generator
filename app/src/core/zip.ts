/**
 * Empaquetador ZIP mínimo, sin dependencias: archivos sin comprimir (método "store") con CRC-32.
 * Sirve para entregar varios archivos en UNA sola descarga.
 */
export interface ZipFile {
  name: string;
  data: Uint8Array;
}

const TABLE = Array.from({ length: 256 }, (_, k) => {
  let c = k;
  for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of data) c = TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function createZip(files: ZipFile[], date = new Date()): Uint8Array<ArrayBuffer> {
  const names = files.map((f) => new TextEncoder().encode(f.name));
  if (new Set(files.map((f) => f.name)).size !== files.length) throw new Error('ZIP: nombres de archivo repetidos');

  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const dosDate = (Math.max(0, date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  const localSize = files.reduce((n, f, i) => n + 30 + names[i].length + f.data.length, 0);
  const centralSize = files.reduce((n, _f, i) => n + 46 + names[i].length, 0);
  const out = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(out.buffer);
  let pos = 0;
  const u16 = (v: number) => {
    view.setUint16(pos, v, true);
    pos += 2;
  };
  const u32 = (v: number) => {
    view.setUint32(pos, v, true);
    pos += 4;
  };

  const offsets: number[] = [];
  files.forEach((f, i) => {
    offsets.push(pos);
    u32(0x04034b50); // cabecera local
    u16(20); // versión necesaria
    u16(0x0800); // nombres en UTF-8
    u16(0); // sin compresión
    u16(dosTime);
    u16(dosDate);
    u32(crc32(f.data));
    u32(f.data.length);
    u32(f.data.length);
    u16(names[i].length);
    u16(0);
    out.set(names[i], pos);
    pos += names[i].length;
    out.set(f.data, pos);
    pos += f.data.length;
  });

  const centralStart = pos;
  files.forEach((f, i) => {
    u32(0x02014b50); // directorio central
    u16(20); // versión con la que se creó
    u16(20);
    u16(0x0800);
    u16(0);
    u16(dosTime);
    u16(dosDate);
    u32(crc32(f.data));
    u32(f.data.length);
    u32(f.data.length);
    u16(names[i].length);
    u16(0); // extra
    u16(0); // comentario
    u16(0); // disco
    u16(0); // atributos internos
    u32(0); // atributos externos
    u32(offsets[i]);
    out.set(names[i], pos);
    pos += names[i].length;
  });

  u32(0x06054b50); // fin del directorio central
  u16(0);
  u16(0);
  u16(files.length);
  u16(files.length);
  u32(centralSize);
  u32(centralStart);
  u16(0);
  return out;
}
