import { useEffect } from "react";
const SKIP = "input,textarea,select,[data-noswipe],.overflow-x-auto,svg,[role=slider]";
/** horizontaal vegen = terug. Werkt overal op de pagina (niet alleen vanaf de rand), naar links of naar rechts,
    behalve op invoervelden, steppers, grafieken en zijwaarts scrollende rijen. Geen aanwijzing op het scherm. */
export function useSwipeBack(onBack: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let x0 = 0, y0 = 0, t0 = 0, on = false;
    const start = (e: TouchEvent) => { const t = e.touches[0], el = e.target as Element | null; on = e.touches.length === 1 && !(el && el.closest && el.closest(SKIP)); x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); };
    const end = (e: TouchEvent) => { if (!on) return; on = false; const t = e.changedTouches[0], dx = t.clientX - x0, dy = Math.abs(t.clientY - y0);
      if (Math.abs(dx) > 80 && dy < Math.abs(dx) * 0.5 && Date.now() - t0 < 700 && !document.querySelector("[aria-modal=true]")) onBack(); };
    window.addEventListener("touchstart", start, { passive: true }); window.addEventListener("touchend", end, { passive: true });
    return () => { window.removeEventListener("touchstart", start); window.removeEventListener("touchend", end); };
  }, [onBack, enabled]);
}
