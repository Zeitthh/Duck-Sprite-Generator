import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';

const THRESHOLD = 6; // px que hay que mover con el botón apretado para que cuente como arrastre

/**
 * Reordena los bloques de una lista (`<ul>` con `<li>`) arrastrándolos con el clic izquierdo del ratón.
 * Un clic normal sigue funcionando; no se arrastra desde los campos de texto. En pantallas táctiles se usan
 * los botones de subir / bajar. Funciona en listas verticales y en la tira horizontal (flex-direction: row).
 */
export function useReorder(onReorder: (id: string, toIndex: number) => void) {
  const listRef = useRef<HTMLUListElement>(null);
  const start = useRef<{ id: string; index: number; x: number; y: number; rect: DOMRect; active: boolean; sx: number; sy: number } | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const raf = useRef(0);
  const justDragged = useRef(false);
  const [drag, setDrag] = useState<{ id: string; index: number; dx: number; dy: number; slot: number } | null>(null);

  /** Posición (entre los demás bloques) donde caería el arrastrado según dónde está el puntero. */
  const slotAt = (x: number, y: number, dragIndex: number) => {
    const ul = listRef.current;
    if (!ul) return 0;
    const horizontal = getComputedStyle(ul).flexDirection === 'row';
    let slot = 0;
    Array.from(ul.children).forEach((el, i) => {
      if (i === dragIndex) return;
      const r = el.getBoundingClientRect();
      const center = horizontal ? r.left + r.width / 2 : r.top + r.height / 2;
      if ((horizontal ? x : y) > center) slot++;
    });
    return slot;
  };

  /** Coloca el bloque arrastrado bajo el puntero, contando lo que se haya desplazado la lista. */
  const updateDrag = () => {
    const s = start.current;
    const ul = listRef.current;
    if (!s || !s.active) return;
    // El bloque solo se mueve a lo largo de la lista y nunca sale de su parte visible, así que su desplazamiento no agranda
    // el área desplazable (sin barras de desplazamiento) ni cambia el tamaño de nada.
    let mx = 0;
    let my = 0;
    if (ul) {
      const u = ul.getBoundingClientRect();
      const scrollX = ul.scrollLeft - s.sx;
      const scrollY = ul.scrollTop - s.sy;
      const dx = pointer.current.x - s.x + scrollX; // al desplazar la lista el bloque viaja con ella: se compensa
      const dy = pointer.current.y - s.y + scrollY;
      if (getComputedStyle(ul).flexDirection === 'row') mx = Math.min(Math.max(dx, u.left - (s.rect.left - scrollX)), u.right - (s.rect.right - scrollX));
      else my = Math.min(Math.max(dy, u.top - (s.rect.top - scrollY)), u.bottom - (s.rect.bottom - scrollY));
    }
    setDrag({ id: s.id, index: s.index, dx: mx, dy: my, slot: slotAt(pointer.current.x, pointer.current.y, s.index) });
  };

  /** Mientras se arrastra, la lista se desplaza sola si el puntero está cerca de su borde (arriba/abajo o izquierda/derecha). */
  const autoScroll = () => {
    raf.current = 0;
    const s = start.current;
    const ul = listRef.current;
    if (!s || !s.active || !ul) return;
    const u = ul.getBoundingClientRect();
    const horizontal = getComputedStyle(ul).flexDirection === 'row';
    const pos = horizontal ? pointer.current.x : pointer.current.y;
    const lo = horizontal ? u.left : u.top;
    const hi = horizontal ? u.right : u.bottom;
    const ZONE = 56;
    const MAX = 16;
    let v = 0;
    if (pos < lo + ZONE) v = -MAX * Math.min(1, (lo + ZONE - pos) / ZONE);
    else if (pos > hi - ZONE) v = MAX * Math.min(1, (pos - (hi - ZONE)) / ZONE);
    if (v !== 0) {
      if (horizontal) ul.scrollLeft += v;
      else ul.scrollTop += v;
      updateDrag();
    }
    raf.current = requestAnimationFrame(autoScroll);
  };

  const finish = (e: ReactPointerEvent<HTMLElement>, cancelled: boolean) => {
    const s = start.current;
    start.current = null;
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* puntero ya liberado */
    }
    if (s?.active) {
      // El "click" que sigue a soltar no debe seleccionar ni activar nada.
      justDragged.current = true;
      setTimeout(() => (justDragged.current = false), 0);
      if (!cancelled) onReorder(s.id, slotAt(e.clientX, e.clientY, s.index));
    }
    setDrag(null);
  };

  const itemProps = (id: string, index: number) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => {
      if (e.button !== 0 || e.pointerType !== 'mouse') return;
      if ((e.target as HTMLElement).closest('input, select, textarea')) return;
      start.current = { id, index, x: e.clientX, y: e.clientY, rect: e.currentTarget.getBoundingClientRect(), active: false, sx: listRef.current?.scrollLeft ?? 0, sy: listRef.current?.scrollTop ?? 0 };
    },
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => {
      const s = start.current;
      if (!s || s.id !== id) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (!s.active) {
        if (Math.hypot(dx, dy) < THRESHOLD) return;
        s.active = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId); // se captura al empezar a arrastrar, no antes (así los clics normales no se rompen)
        } catch {
          /* sin captura: el arrastre sigue funcionando mientras el puntero esté encima */
        }
      }
      pointer.current = { x: e.clientX, y: e.clientY };
      updateDrag();
      if (!raf.current) raf.current = requestAnimationFrame(autoScroll);
    },
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => finish(e, false),
    onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => finish(e, true),
    onClickCapture: (e: { preventDefault: () => void; stopPropagation: () => void }) => {
      if (justDragged.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
  });

  /** El bloque arrastrado sigue al puntero. */
  const itemStyle = (id: string): CSSProperties | undefined =>
    drag?.id === id ? { transform: `translate(${drag.dx}px, ${drag.dy}px)` } : undefined;

  /** Clases: el bloque arrastrado y la marca de dónde caería. */
  const itemClass = (id: string, index: number) => {
    if (!drag) return '';
    if (drag.id === id) return 'dragging';
    const others = Array.from({ length: listRef.current?.children.length ?? 0 }, (_, i) => i).filter((i) => i !== drag.index);
    if (drag.slot < others.length) return others[drag.slot] === index ? 'drop-before' : '';
    return others[others.length - 1] === index ? 'drop-after' : '';
  };

  return { listRef, itemProps, itemStyle, itemClass, dragging: drag !== null };
}
