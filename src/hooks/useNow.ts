import { useSyncExternalStore } from 'react';

/** How often every `useNow()` subscriber is refreshed. */
const TICK_MS = 30_000;

let snapshot = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function tick() {
  snapshot = Date.now();
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);

  if (listeners.size === 1) {
    // Bring the first subscriber up to date, then keep it ticking.
    tick();
    timer = setInterval(tick, TICK_MS);
  }

  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Stable on the server; time only matters on the device. */
const getServerSnapshot = () => snapshot;
const getSnapshot = () => snapshot;

/**
 * Returns a timestamp that refreshes every 30 seconds.
 *
 * Reading `Date.now()` while rendering is an impure read: the result depends on
 * wall-clock time rather than on props or state, which breaks memoization and
 * concurrent rendering. Anything derived from "now" — overdue checks, remaining
 * trial days, countdowns — should read the clock through this hook instead.
 *
 * The tick is deliberately coarse. A one-second clock would re-render every
 * mounted screen; screens that need second-level precision run their own
 * interval.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}