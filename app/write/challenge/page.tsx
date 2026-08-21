'use client';

/**
 * The writing challenge screen.
 *
 * Fixes over previous version:
 * - The editor is never disabled while the timer runs (it was previously,
 *   making the challenge unwinnable).
 * - Word count updates synchronously with input and strips HTML tags before
 *   counting (tags were previously counted as words).
 * - Session stats (elapsed, streaks, word count) are written through a
 *   single shared shape that results reads.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useInactivityTimer } from '@/lib/timer/useInactivityTimer';
import { formatElapsed } from '@/lib/timer/inactivityTimer';
import { getChallengeMode } from '@/lib/config/challengeModes';
import { publishConfig } from '@/lib/config/publishConfig';
import {
  createDebouncedSave,
  loadSessionFromStorage,
  saveDraft,
  saveSessionToStorage,
  type WritingSession,
} from '@/lib/storage/draftStorage';
import { countWords } from '@/lib/utils/text';
import { TipTapEditor } from '@/components/editor/TipTapEditor';

type Phase = 'loading' | 'missing' | 'ready' | 'running' | 'failed';

export default function WritingChallengePage() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('loading');
  const [session, setSession] = useState<WritingSession | null>(null);
  const [words, setWords] = useState(0);
  const [totalElapsedMs, setTotalElapsedMs] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [announcement, setAnnouncement] = useState('');

  // Mutable run bookkeeping (kept out of state to avoid re-render churn).
  const sessionRef = useRef<WritingSession | null>(null);
  const contentRef = useRef('');
  const attemptStartRef = useRef(0); // epoch ms when current attempt began
  const baseElapsedRef = useRef(0); // ms accumulated across finished attempts
  const phaseRef = useRef<Phase>('loading');

  const persistSession = useCallback(() => {
    if (!sessionRef.current) return;
    saveSessionToStorage({ ...sessionRef.current, content: contentRef.current });
  }, []);

  const debouncedSaveRef = useRef<() => void>(() => {});

  // Hydrate from sessionStorage. Deferred one microtask so we never call
  // setState synchronously inside the effect body.
  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      const saved = loadSessionFromStorage();
      if (cancelled) return;

      if (!saved || !saved.topic || !saved.mode) {
        setPhase('missing');
        return;
      }

      sessionRef.current = saved;
      contentRef.current = saved.content ?? '';
      baseElapsedRef.current = saved.elapsedMs ?? 0;

      setSession(saved);
      setWords(saved.wordCount || countWords(contentRef.current));
      setTotalElapsedMs(baseElapsedRef.current);
      setPhase('ready');

      debouncedSaveRef.current = createDebouncedSave(() => {
        const s = sessionRef.current;
        if (!s) return null;
        return {
          id: `${s.startedAt}-${s.mode}`,
          topic: s.topic,
          content: contentRef.current,
          mode: s.mode,
          category: s.category,
          wordCount: countWords(contentRef.current),
          elapsedTime: baseElapsedRef.current + (Date.now() - attemptStartRef.current),
          status: 'draft',
        };
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Elapsed + WPM ticker (1s cadence is plenty for these).
  const running = phase === 'running';
  useEffect(() => {
    if (!running) return;

    const update = () => {
      const attemptMs = Date.now() - attemptStartRef.current;
      const total = baseElapsedRef.current + attemptMs;
      setTotalElapsedMs(total);

      const currentWords = countWords(contentRef.current);
      const minutes = attemptMs / 60_000;
      setWpm(minutes > 1 / 60 && currentWords > 0 ? Math.round(currentWords / minutes) : 0);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [running]);

  const finalizeAndNavigate = useCallback(
    (status: 'completed' | 'failed') => {
      const s = sessionRef.current;
      if (!s) return;

      const attemptMs =
        attemptStartRef.current > 0 ? Date.now() - attemptStartRef.current : 0;
      const elapsedMs = baseElapsedRef.current + attemptMs;
      const streakMs =
        attemptStartRef.current > 0 ? Date.now() - attemptStartRef.current : 0;

      saveSessionToStorage({
        ...s,
        content: contentRef.current,
        wordCount: countWords(contentRef.current),
        elapsedMs,
        longestStreakMs: Math.max(s.longestStreakMs ?? 0, streakMs),
        status,
      });

      // Also snapshot to IndexedDB — drafts are never lost (NFR-2).
      saveDraft({
        id: `${s.startedAt}-${s.mode}`,
        topic: s.topic,
        content: contentRef.current,
        mode: s.mode,
        category: s.category,
        wordCount: countWords(contentRef.current),
        elapsedTime: elapsedMs,
        status: status === 'completed' ? 'completed' : 'failed',
      }).catch((err) => console.error('Draft save failed:', err));

      router.push('/write/results');
    },
    [router]
  );

  const timer = useInactivityTimer({
    thresholdMs: session ? getChallengeMode(session.mode).inactivityThresholdMs : 0,
    onFail: () => {
      phaseRef.current = 'failed';
      setPhase('failed');
      setAnnouncement('Challenge failed. You stopped typing for too long.');
      persistSession();
    },
  });
  const { state, formattedRemaining } = timer;

  // Mirror phase into a ref so event callbacks always see the latest value.
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const startAttempt = useCallback(() => {
    attemptStartRef.current = Date.now();
    phaseRef.current = 'running';
    timer.start();
    setPhase('running');
    setAnnouncement('Challenge started.');
  }, [timer]);

  /**
   * Central activity handler. Starts the run lazily on first input and keeps
   * the countdown alive afterwards.
   */
  const handleActivity = useCallback(() => {
    if (phaseRef.current === 'ready') startAttempt();
    else if (phaseRef.current === 'running') timer.activity();
  }, [startAttempt, timer]);

  // Window-level safety net: while running, ANY interaction anywhere counts
  // (covers soft keyboards and IMEs that bypass editor events entirely).
  useEffect(() => {
    if (phase !== 'running') return;

    const events = ['keydown', 'pointerdown', 'touchstart', 'paste', 'input'] as const;
    const onNet = () => timer.activity();
    events.forEach((evt) => window.addEventListener(evt, onNet, { passive: true }));
    return () => events.forEach((evt) => window.removeEventListener(evt, onNet));
  }, [phase, timer]);

  // Urgency announcements — only at meaningful thresholds, not every second.
  const remainingSec = Number(formattedRemaining);
  const announcedRef = useRef<number>(0);
  useEffect(() => {
    if (phase !== 'running') return;
    if ((remainingSec === 10 || remainingSec === 5) && announcedRef.current !== remainingSec) {
      announcedRef.current = remainingSec;
      setAnnouncement(`${remainingSec} seconds left. Keep typing.`);
    }
  }, [remainingSec, phase]);

  // Move focus into the failure dialog when it opens (a11y).
  const tryAgainButtonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (phase === 'failed') tryAgainButtonRef.current?.focus();
  }, [phase]);

  const handleChange = useCallback(
    (html: string) => {
      contentRef.current = html;
      setWords(countWords(html));
      persistSession();
      debouncedSaveRef.current();
    },
    [persistSession]
  );

  const tryAgain = useCallback(() => {
    // Bank the failed attempt's time, then restart the countdown.
    if (attemptStartRef.current > 0) {
      baseElapsedRef.current += Date.now() - attemptStartRef.current;
    }
    announcedRef.current = 0;
    timer.reset();
    startAttempt();
  }, [timer, startAttempt]);

  const mode = getChallengeMode(session?.mode ?? 'focus');
  const thresholdMs = mode.inactivityThresholdMs;
  const remainingMs = Math.max(0, state.remainingMs);
  const urgencyFraction = thresholdMs > 0 ? remainingMs / thresholdMs : 1;

  const urgency =
    phase !== 'running'
      ? 'calm'
      : urgencyFraction <= 0.25
        ? 'critical'
        : urgencyFraction <= 0.55
          ? 'warning'
          : 'calm';

  const countdownColor =
    urgency === 'critical' ? 'text-accent' : urgency === 'warning' ? 'text-warn' : 'text-ink';
  const barColor =
    urgency === 'critical' ? 'bg-accent' : urgency === 'warning' ? 'bg-warn' : 'bg-ink';

  if (phase === 'loading') {
    return (
      <main id="main-content" className="grid min-h-screen place-items-center px-6">
        <div className="flex items-center gap-3 text-sm text-ink-muted">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-ink" aria-hidden="true" />
          Loading your challenge…
        </div>
      </main>
    );
  }

  if (phase === 'missing' || !session) {
    return (
      <main id="main-content" className="grid min-h-screen place-items-center px-6">
        <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-8 text-center">
          <h1 className="font-serif text-2xl">No active challenge</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            Set up a topic and pressure level to begin writing.
          </p>
          <Link
            href="/write/setup"
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-ink px-6 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
          >
            Start a new challenge
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="truncate text-sm font-medium">{session.topic}</span>
            <span
              className="shrink-0 rounded-full border border-line-strong px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-ink-muted"
            >
              {mode.label}
            </span>
          </div>
          <button
            type="button"
            onClick={() => finalizeAndNavigate('completed')}
            className="shrink-0 rounded-lg border border-line-strong bg-surface px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-ink-faint"
          >
            Finish
          </button>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-6 sm:px-6 sm:pb-10">
        {/* Countdown */}
        <section aria-label="Inactivity countdown" className="mb-6">
          <div className="flex items-baseline justify-center gap-2">
            <span
              role="timer"
              aria-label={`${formattedRemaining} seconds of inactivity allowed`}
              className={`font-mono text-6xl font-semibold tabular-nums tracking-tight transition-colors sm:text-7xl ${countdownColor} ${
                urgency === 'critical' && phase === 'running' ? 'animate-pulse-urgent' : ''
              }`}
            >
              {formattedRemaining}
            </span>
            <span className="text-sm text-ink-faint">s</span>
          </div>
          <p className="mt-1 text-center text-sm capitalize text-ink-muted" aria-live="polite">
            {phase === 'running'
              ? `${mode.label.toLowerCase()} · keep typing to reset`
              : phase === 'ready'
                ? 'start typing to begin'
                : 'challenge ended'}
          </p>
          <div
            className="mx-auto mt-4 h-1 max-w-xs overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={thresholdMs}
            aria-valuenow={Math.round(remainingMs)}
            aria-label="Time remaining before failure"
          >
            <div
              className={`h-full rounded-full transition-[width] duration-100 ease-linear ${barColor}`}
              style={{ width: `${urgencyFraction * 100}%` }}
            />
          </div>
        </section>

        {/* Editor */}
        <section aria-label="Writing area" className="rounded-xl border border-line bg-surface shadow-sm">
          <TipTapEditor
            initialContent={session.content ?? ''}
            onChange={handleChange}
            onActivity={handleActivity}
            locked={false}
            placeholder="Start typing to begin the timer…"
          />
        </section>

        {/* Stats */}
        <dl className="mt-5 flex items-center justify-between rounded-lg border border-line bg-surface px-5 py-3 text-sm">
          <div className="flex items-baseline gap-1.5">
            <dt className="text-ink-muted">Words</dt>
            <dd className="font-mono tabular-nums" aria-live="polite">
              {words}
            </dd>
          </div>
          <div className="hidden items-baseline gap-1.5 sm:flex">
            <dt className="text-ink-muted">WPM</dt>
            <dd className="font-mono tabular-nums">{wpm}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-ink-muted">Time</dt>
            <dd className="font-mono tabular-nums">{formatElapsed(totalElapsedMs)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-center text-xs text-ink-faint">
          Publishing requires {publishConfig.minWordCount}+ words — optional, always your choice.
        </p>

        {/* Desktop finish */}
        <div className="mt-8 hidden justify-end sm:flex">
          <button
            type="button"
            onClick={() => finalizeAndNavigate('completed')}
            className="inline-flex h-12 items-center justify-center rounded-lg bg-ink px-8 text-base font-medium text-paper transition-colors hover:bg-ink-soft"
          >
            Finish &amp; see results
          </button>
        </div>
      </main>

      {/* Mobile sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/95 p-4 backdrop-blur sm:hidden">
        <button
          type="button"
          onClick={() => finalizeAndNavigate('completed')}
          className="h-12 w-full rounded-lg bg-ink text-base font-medium text-paper transition-colors hover:bg-ink-soft"
        >
          Finish &amp; see results
        </button>
      </div>

      {/* Screen reader announcements */}
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>

      {/* Failure dialog */}
      {phase === 'failed' && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-ink/45 p-4 backdrop-blur-sm">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="fail-title"
            aria-describedby="fail-desc"
            className="animate-shake w-full max-w-md rounded-xl border border-line bg-surface p-8 shadow-xl"
          >
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Failed</p>
            <h2 id="fail-title" className="mt-2 font-serif text-3xl tracking-tight">
              The countdown won.
            </h2>
            <p id="fail-desc" className="mt-3 text-sm leading-relaxed text-ink-muted">
              You paused for more than{' '}
              <span className="font-mono tabular-nums">{Math.round(thresholdMs / 1000)}s</span>{' '}
              in {mode.label.toLowerCase()} mode. Your writing is safe — nothing is deleted,
              ever.
            </p>
            <dl className="mt-6 grid grid-cols-3 gap-3 rounded-lg border border-line bg-paper px-4 py-3 text-center">
              <div>
                <dt className="text-xs text-ink-muted">Words</dt>
                <dd className="font-mono text-lg tabular-nums">{words}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Time</dt>
                <dd className="font-mono text-lg tabular-nums">
                  {formatElapsed(totalElapsedMs)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Mode</dt>
                <dd className="text-lg">{mode.label}</dd>
              </div>
            </dl>
            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row-reverse">
              <button
                ref={tryAgainButtonRef}
                type="button"
                onClick={tryAgain}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-ink px-5 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => finalizeAndNavigate('failed')}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-line-strong bg-surface px-5 text-sm font-medium transition-colors hover:border-ink-faint"
              >
                Save &amp; see results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
