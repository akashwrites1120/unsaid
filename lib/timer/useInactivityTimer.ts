/**
 * React Hook for Inactivity Timer.
 *
 * The underlying timer instance is created once per threshold and callbacks
 * are kept in refs so changing handler identities never restart the
 * countdown. State is polled at 100ms — sub-second granularity without a
 * re-render per animation frame (NFR-6).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TimerState } from './inactivityTimer';
import { createInactivityTimer } from './inactivityTimer';

export interface UseInactivityTimerOptions {
  /** 0 disables the timer entirely (used before the session hydrates). */
  thresholdMs: number;
  onFail?: () => void;
}

export interface UseInactivityTimerReturn {
  state: TimerState;
  formattedRemaining: string;
  start: () => void;
  pause: () => void;
  stop: () => void;
  reset: () => void;
  activity: () => void;
}

const IDLE_STATE: TimerState = {
  status: 'idle',
  remainingMs: 0,
  elapsedMs: 0,
  totalPausedMs: 0,
  lastResetAt: null,
};

export function useInactivityTimer(
  options: UseInactivityTimerOptions
): UseInactivityTimerReturn {
  const { thresholdMs, onFail } = options;

  const timerRef = useRef<ReturnType<typeof createInactivityTimer> | null>(null);
  const onFailRef = useRef(onFail);

  const [state, setState] = useState<TimerState>(IDLE_STATE);

  // Keep the latest failure callback without re-creating the timer.
  useEffect(() => {
    onFailRef.current = onFail;
  }, [onFail]);

  // Create the timer once per threshold.
  useEffect(() => {
    if (thresholdMs <= 0) {
      timerRef.current = null;
      return;
    }

    const timer = createInactivityTimer({
      thresholdMs,
      callbacks: {
        onFail: () => {
          setState({ ...timer.getState(), status: 'failed', remainingMs: 0 });
          onFailRef.current?.();
        },
      },
    });
    timerRef.current = timer;
    // Push the initial snapshot so the UI shows the full threshold while
    // waiting for the first write (instead of a stale idle zero).
    setState(timer.getState());

    return () => {
      timer.destroy();
      if (timerRef.current === timer) timerRef.current = null;
    };
  }, [thresholdMs]);

  // Poll engine state while running for a smooth but cheap countdown.
  useEffect(() => {
    if (state.status !== 'running') return;

    const interval = setInterval(() => {
      const current = timerRef.current?.getState();
      if (current) setState(current);
    }, 100);

    return () => clearInterval(interval);
  }, [state.status]);

  const start = useCallback(() => {
    timerRef.current?.start();
    if (timerRef.current) setState(timerRef.current.getState());
  }, []);

  const pause = useCallback(() => {
    timerRef.current?.pause();
    if (timerRef.current) setState(timerRef.current.getState());
  }, []);

  const stop = useCallback(() => {
    timerRef.current?.stop();
    if (timerRef.current) setState(timerRef.current.getState());
  }, []);

  const reset = useCallback(() => {
    timerRef.current?.reset();
    if (timerRef.current) setState(timerRef.current.getState());
  }, []);

  const activity = useCallback(() => {
    timerRef.current?.activity();
  }, []);

  return {
    state,
    formattedRemaining: formatRemaining(state.remainingMs),
    start,
    pause,
    stop,
    reset,
    activity,
  };
}

/** Whole seconds remaining, e.g. "12". */
function formatRemaining(ms: number): string {
  return String(Math.max(0, Math.ceil(ms / 1000)));
}
