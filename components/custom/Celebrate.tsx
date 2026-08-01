'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * A confetti burst for the moments that deserve one.
 *
 * Hand-rolled on a canvas rather than pulled from a package: the stack is
 * frozen, and a burst is ~60 lines of physics. Canvas over DOM nodes because
 * 90 animated elements is 90 layers for the compositor, while a canvas is one.
 *
 * Fires ONLY where a real outcome landed — a deal published, a product added,
 * a shop verified. Not on edit, not on delete, not on save-draft. Confetti
 * over a deletion is a bug, so `celebrate()` is deliberately awkward to reach:
 * you have to ask for it.
 *
 * Under `prefers-reduced-motion` it is a no-op and the caller's toast carries
 * the whole message. That is read straight from `matchMedia` rather than
 * motion's hook: this is the component's only would-be use of the library, and
 * reading the media query keeps it standalone — it works outside a
 * `MotionConfig`, which is how most of the dialogs that call it are mounted.
 */

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const COLORS = ['#D70005', '#FEE87B', '#FCD9F7', '#FEF8D6', '#DD2920'];
const COUNT = 90;
const GRAVITY = 0.32;
const DRAG = 0.988;
const FADE_AFTER = 900;
const LIFETIME = 2600;

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  color: string;
};

type CelebrateContext = { celebrate: () => void };

const Ctx = createContext<CelebrateContext>({ celebrate: () => {} });

/** Fire the burst. Safe to call when no provider is mounted — it no-ops. */
export function useCelebrate() {
  return useContext(Ctx).celebrate;
}

export function CelebrateProvider({ children }: { children: ReactNode }) {
  const [armed, setArmed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef(0);
  const startedAt = useRef(0);

  const celebrate = useCallback(() => {
    if (prefersReducedMotion()) return;
    startedAt.current = 0;
    setArmed(true);
  }, []);

  useEffect(() => {
    if (!armed) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Two vents from the lower corners, the way a party popper actually
    // throws — a single centre burst reads as a loading spinner.
    const pieces: Piece[] = Array.from({ length: COUNT }, (_, i) => {
      const left = i % 2 === 0;
      const spread = (Math.PI / 180) * (46 + (i % 17) * 2.4);
      const speed = 15 + (i % 11) * 1.35;
      return {
        x: left ? w * 0.08 : w * 0.92,
        y: h + 8,
        vx: (left ? 1 : -1) * Math.cos(spread) * speed,
        vy: -Math.sin(spread) * speed,
        rot: (i % 12) * 0.5,
        vr: ((i % 7) - 3) * 0.14,
        w: 7 + (i % 4) * 2,
        h: 10 + (i % 3) * 3,
        color: COLORS[i % COLORS.length],
      };
    });

    const tick = (now: number) => {
      if (!startedAt.current) startedAt.current = now;
      const elapsed = now - startedAt.current;

      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha =
        elapsed < FADE_AFTER
          ? 1
          : Math.max(0, 1 - (elapsed - FADE_AFTER) / (LIFETIME - FADE_AFTER));

      for (const p of pieces) {
        p.vy += GRAVITY;
        p.vx *= DRAG;
        p.vy *= DRAG;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        // Scaling height by cos() fakes the flutter of a tumbling rectangle
        // without tracking a third axis.
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot)));
        ctx.restore();
      }

      if (elapsed < LIFETIME) {
        raf.current = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, w, h);
        setArmed(false);
      }
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [armed]);

  return (
    <Ctx.Provider value={{ celebrate }}>
      {children}
      {armed && (
        <canvas
          ref={canvasRef}
          aria-hidden
          // `pointer-events-none` matters: the canvas covers the viewport, and
          // a celebration that eats the click on the button you just pressed
          // is worse than no celebration.
          className="pointer-events-none fixed inset-0 z-[100] h-screen w-screen"
        />
      )}
    </Ctx.Provider>
  );
}
