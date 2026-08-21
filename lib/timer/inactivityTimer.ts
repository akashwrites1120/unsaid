/**
 * Inactivity Timer
 * Core timer logic for the writing challenge.
 * Handles countdown, reset on activity, and failure detection.
 */

export type TimerStatus = 'idle' | 'running' | 'paused' | 'failed' | 'stopped';

export interface TimerState {
  status: TimerStatus;
  remainingMs: number;
  elapsedMs: number;
  totalPausedMs: number;
  lastResetAt: number | null;
}

export interface TimerCallbacks {
  onTick?: (remainingMs: number) => void;
  onFail?: () => void;
  onStatusChange?: (status: TimerStatus) => void;
}

export interface TimerOptions {
  thresholdMs: number;
  callbacks?: TimerCallbacks;
}

/**
 * Creates an inactivity timer that counts down from thresholdMs.
 * Resets on activity events. Fails when countdown reaches zero.
 */
export function createInactivityTimer(options: TimerOptions) {
  const { thresholdMs, callbacks = {} } = options;
  const { onTick, onFail, onStatusChange } = callbacks;

  const state: TimerState = {
    status: 'idle',
    remainingMs: thresholdMs,
    elapsedMs: 0,
    totalPausedMs: 0,
    lastResetAt: null,
  };

  let animationFrameId: number | null = null;
  let startTime = 0;
  let pausedAt = 0;

  function updateStatus(newStatus: TimerStatus) {
    if (state.status !== newStatus) {
      state.status = newStatus;
      onStatusChange?.(newStatus);
    }
  }

  function tick(timestamp: number) {
    if (state.status !== 'running') return;

    const elapsed = timestamp - startTime - state.totalPausedMs;
    state.elapsedMs = elapsed;
    state.remainingMs = Math.max(0, thresholdMs - elapsed);

    onTick?.(state.remainingMs);

    if (state.remainingMs <= 0) {
      updateStatus('failed');
      onFail?.();
      return;
    }

    animationFrameId = requestAnimationFrame(tick);
  }

  function start() {
    if (state.status === 'running') return;

    const now = performance.now();

    if (state.status === 'paused') {
      // Resume from pause
      state.totalPausedMs += now - pausedAt;
    } else {
      // Fresh start or restart after failure/stop
      state.remainingMs = thresholdMs;
      state.elapsedMs = 0;
      state.totalPausedMs = 0;
    }

    startTime = now;
    state.lastResetAt = now;
    updateStatus('running');
    animationFrameId = requestAnimationFrame(tick);
  }

  function pause() {
    if (state.status !== 'running') return;

    pausedAt = performance.now();
    updateStatus('paused');

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function stop() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    updateStatus('stopped');
  }

  function reset() {
    if (state.status === 'running') {
      const now = performance.now();
      state.totalPausedMs += now - startTime;
    }

    state.remainingMs = thresholdMs;
    state.elapsedMs = 0;
    state.lastResetAt = performance.now();

    if (state.status === 'running') {
      startTime = performance.now();
      animationFrameId = requestAnimationFrame(tick);
    }
  }

  function activity() {
    // Called on any user activity (keystroke, paste, etc.)
    reset();
  }

  function getState(): TimerState {
    return { ...state };
  }

  function destroy() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  return {
    start,
    pause,
    stop,
    reset,
    activity,
    getState,
    destroy,
  };
}

/**
 * Format milliseconds as MM:SS or SS.s
 */
export function formatTime(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.ceil(ms / 1000);

  if (totalSeconds >= 60) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Format elapsed milliseconds as MM:SS
 */
export function formatElapsed(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}