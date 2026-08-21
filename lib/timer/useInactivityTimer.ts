/**
 * React Hook for Inactivity Timer
 * Provides a React-friendly interface to the timer logic.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TimerState, TimerStatus } from './inactivityTimer';
import { createInactivityTimer, formatTime, formatElapsed } from './inactivityTimer';

export interface UseInactivityTimerOptions {
  thresholdMs: number;
  onFail?: () => void;
  onStatusChange?: (status: TimerStatus) => void;
}

export interface UseInactivityTimerReturn {
  state: TimerState;
  formattedRemaining: string;
  formattedElapsed: string;
  start: () => void;
  pause: () => void;
  stop: () => void;
  reset: () => void;
  activity: () => void;
}

export function useInactivityTimer(
  options: UseInactivityTimerOptions
): UseInactivityTimerReturn {
  const { thresholdMs, onFail, onStatusChange } = options;
  const timerRef = useRef<ReturnType<typeof createInactivityTimer> | null>(null);
  const [state, setState] = useState<TimerState>({
    status: 'idle',
    remainingMs: thresholdMs,
    elapsedMs: 0,
    totalPausedMs: 0,
    lastResetAt: null,
  });

  // Initialize timer
  useEffect(() => {
    timerRef.current = createInactivityTimer({
      thresholdMs,
      callbacks: {
        onTick: (remainingMs) => {
          setState((prev) => ({ ...prev, remainingMs }));
        },
        onFail: () => {
          setState((prev) => ({ ...prev, status: 'failed', remainingMs: 0 }));
          onFail?.();
        },
        onStatusChange: (status) => {
          setState((prev) => ({ ...prev, status }));
          onStatusChange?.(status);
        },
      },
    });

    return () => {
      timerRef.current?.destroy();
    };
  }, [thresholdMs, onFail, onStatusChange]);

  const start = useCallback(() => {
    timerRef.current?.start();
  }, []);

  const pause = useCallback(() => {
    timerRef.current?.pause();
  }, []);

  const stop = useCallback(() => {
    timerRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    timerRef.current?.reset();
  }, []);

  const activity = useCallback(() => {
    timerRef.current?.activity();
  }, []);

  // Update elapsed time in state when running
  useEffect(() => {
    if (!timerRef.current || state.status !== 'running') return;

    const interval = setInterval(() => {
      const currentState = timerRef.current?.getState();
      if (currentState) {
        setState(currentState);
      }
    }, 100); // Update more frequently for smooth countdown

    return () => clearInterval(interval);
  }, [state.status]);

  return {
    state,
    formattedRemaining: formatTime(state.remainingMs),
    formattedElapsed: formatElapsed(state.elapsedMs),
    start,
    pause,
    stop,
    reset,
    activity,
  };
}