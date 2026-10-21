import { useCallback, useEffect, useRef, useState } from "react";

/** Plays the saved track back in real time by advancing the current time each animation frame. */
export function useReplay(end: number, setTime: (updater: (t: number | null) => number) => void) {
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      let finished = false;
      setTime((t) => {
        const next = (t ?? 0) + dt;
        if (next >= end) finished = true;
        return Math.min(next, end);
      });
      if (finished) setPlaying(false);
      else raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, end, setTime]);

  const toggle = useCallback(() => {
    setPlaying((p) => {
      // Restart from the beginning when replay is pressed at the end.
      if (!p) setTime((t) => (t === null || t >= end ? 0 : t));
      return !p;
    });
  }, [end, setTime]);

  const pause = useCallback(() => setPlaying(false), []);

  return { playing, toggle, pause };
}
