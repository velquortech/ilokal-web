import { useEffect, useState } from 'react';

/**
 * Count-up animation — a 1:1 port of the export's `animate()`:
 * cubic ease-out `target * (1 - (1 - p)^3)` over `duration` ms, kicked off the
 * first time `active` becomes true (the design triggers on the stats strip
 * entering the viewport at threshold 0.35).
 */
export function useCountUp(
  target: number,
  duration: number,
  active: boolean,
): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, active]);

  return value;
}
