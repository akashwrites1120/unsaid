'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useInactivityTimer } from '@/lib/timer/useInactivityTimer';
import { getChallengeMode, type ChallengeModeKey } from '@/lib/config/challengeModes';
import { TipTapEditor } from '@/components/editor/TipTapEditor';
import { formatElapsed } from '@/lib/timer/inactivityTimer';
import { saveDraft, saveSessionToStorage, type SessionData } from '@/lib/storage/draftStorage';

interface ChallengeSession {
  topic: string;
  mode: ChallengeModeKey;
  category: string;
  startTime: number;
  content: string;
  status: 'idle' | 'running' | 'failed' | 'stopped';
  inactivityThresholdMs: number;
}

export default function WritingChallengePage() {
  const router = useRouter();
  const [session, setSession] = useState<ChallengeSession | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [wpm, setWpm] = useState(0);
  const contentRef = useRef<string>('');
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const debouncedSaveRef = useRef<() => void>(() => {});

  // Load session from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('writing-session');
    if (saved) {
      const savedSession = JSON.parse(saved);
      setSession({
        topic: savedSession.topic,
        mode: savedSession.mode,
        category: savedSession.category || 'thoughts',
        startTime: savedSession.startTime,
        content: savedSession.content,
        status: 'idle',
        inactivityThresholdMs: getChallengeMode(savedSession.mode).inactivityThresholdMs,
      });
      contentRef.current = savedSession.content;
      startTimeRef.current = savedSession.startTime;
    }
  }, []);

  // Create debounced save function
  useEffect(() => {
    debouncedSaveRef.current = createDebouncedSave(() => {
      if (!session) return null;
      return {
        id: `draft-${session.topic}-${session.mode}`,
        topic: session.topic,
        content: contentRef.current,
        mode: session.mode,
        wordCount,
        elapsedTime: totalTime,
        status: isFailed ? 'failed' : (isStopped ? 'completed' : 'draft'),
      };
    });
  }, [session, wordCount, totalTime, isFailed, isStopped]);

  // Auto-save content when it changes
  useEffect(() => {
    if (session && contentRef.current) {
      debouncedSaveRef.current();
      saveSessionToStorage({
        topic: session.topic,
        mode: session.mode,
        startTime: startTimeRef.current,
        content: contentRef.current,
      });
    }
  }, [contentRef.current, session]);

  // Calculate word count
  useEffect(() => {
    if (contentRef.current) {
      const words = contentRef.current.trim().split(/\s+/).filter(Boolean).length;
      setWordCount(words);
    }
  }, [contentRef.current]);

  // Timer for elapsed time
  useEffect(() => {
    if (isTimerActive) {
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setTotalTime(elapsed);
        const minutes = elapsed / 60000;
        const words = contentRef.current.trim().split(/\s+/).filter(Boolean).length;
        setWpm(minutes > 0 ? Math.round(words / minutes) : 0);
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerActive, contentRef.current]);

  const timer = useInactivityTimer({
    thresholdMs: session?.inactivityThresholdMs || 0,
    onFail: () => {
      setIsFailed(true);
      setIsTimerActive(false);
    },
    onStatusChange: (status) => {
      if (status === 'failed') {
        setIsFailed(true);
        setIsTimerActive(false);
      } else if (status === 'stopped') {
        setIsStopped(true);
        setIsTimerActive(false);
      }
    },
  });

  const { state, formattedRemaining } = timer;

  const mode = getChallengeMode(session?.mode || 'focus');

  const handleActivity = useCallback(() => {
    if (session && !isTimerActive) {
      setSession({
        ...session,
        status: 'running',
      });
      setIsTimerActive(true);
      startTimeRef.current = Date.now();
    }
    timer.activity();
  }, [session, isTimerActive, timer]);

  const handleStop = useCallback(() => {
    if (session) {
      setSession({
        ...session,
        status: 'stopped',
        content: contentRef.current,
      });
      setIsStopped(true);
      setIsTimerActive(false);
    }
  }, [session]);

  const handleReset = useCallback(() => {
    if (session) {
      const savedContent = contentRef.current;
      setSession({
        ...session,
        status: 'idle',
        content: savedContent,
      });
      contentRef.current = savedContent;
      setIsTimerActive(false);
      setIsFailed(false);
      setIsStopped(false);
      startTimeRef.current = Date.now();
    }
  }, [session]);

  const handleContinue = useCallback(() => {
    if (session) {
      const savedContent = contentRef.current;
      setSession({
        ...session,
        content: savedContent,
        startTime: Date.now(),
        status: 'idle',
      });
      contentRef.current = savedContent;
      startTimeRef.current = Date.now();
      router.push('/write/setup');
    }
  }, [session, router]);

  const handleComplete = useCallback(() => {
    if (session) {
      const savedContent = contentRef.current;
      setSession({
        ...session,
        content: savedContent,
        status: 'stopped',
      });
      contentRef.current = savedContent;
      router.push('/write/results');
    }
  }, [session, router]);

  const getFailureMessage = useCallback(() => {
    if (mode.key === 'hard') {
      return 'Time\'s up! You lost the challenge.';
    }
    return 'You lost the challenge due to inactivity.';
  }, [mode]);

  return (
    <main className="min-h-screen flex flex-col px-6 py-12 bg-white text-gray-900">
      {/* Header with mode label */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {mode.label} Mode
        </h1>
        <p className="text-gray-600 mt-1">Keep writing...</p>
      </div>

      {/* Countdown display */}
      <div className="text-center mb-8">
        <div className="text-6xl font-mono tabular-nums animate-pulse-urgent">
          {formattedRemaining}
        </div>
        <p className="text-gray-500 text-sm mt-2">seconds remaining</p>
      </div>

      {/* Editor */}
      <div className="flex-1 max-w-4xl mx-auto w-full">
        <TipTapEditor
          content={contentRef.current}
          onChange={(content) => {
            contentRef.current = content;
            setSession((prev) => prev ? { ...prev, content } : prev);
          }}
          onActivity={handleActivity}
          placeholder="Start typing to begin the timer..."
          disabled={isTimerActive && !isStopped}
        />
      </div>

      {/* Footer with stats */}
      <div className="flex justify-between items-center max-w-4xl mx-auto w-full mt-8">
        <div className="text-gray-600">
          <span className="text-lg font-mono tabular-nums">{wordCount}</span> words
        </div>
        <div className="text-gray-600">
          <span className="font-mono tabular-nums">{formatElapsed(totalTime)}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4 mt-8 max-w-4xl mx-auto w-full">
        {isFailed && (
          <button
            onClick={handleReset}
            className="flex-1 px-6 py-3 text-white bg-red-600 hover:bg-red-700 transition-colors rounded-none"
          >
            Try Again
          </button>
        )}
        {isStopped && (
          <button
            onClick={handleContinue}
            className="flex-1 px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 transition-colors rounded-none"
          >
            Continue Writing
          </button>
        )}
        <button
          onClick={handleComplete}
          className="flex-1 px-6 py-3 text-white bg-green-600 hover:bg-green-700 transition-colors rounded-none"
        >
          Finish
        </button>
      </div>

      {/* Failure state overlay */}
      {isFailed && (
        <div className="fixed inset-0 bg-gray-900/90 flex items-center justify-center z-50 animate-shake">
          <div className="text-center p-8 bg-white border-2 border-gray-900 rounded-lg">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Challenge Failed</h2>
            <p className="text-gray-700 text-lg mb-6">{getFailureMessage()}</p>
            <p className="text-gray-500 text-sm mb-6">
              You wrote {wordCount} words in {formatElapsed(totalTime)}.
            </p>
            <button
              onClick={handleReset}
              className="px-8 py-3 text-white bg-gray-900 hover:bg-gray-800 transition-colors rounded-none"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// Helper function for debounced save
function createDebouncedSave(
  getDraftData: () => { id: string; topic: string; content: string; mode: string; wordCount: number; elapsedTime: number; status: 'draft' | 'published' | 'failed' | 'completed' } | null,
  delayMs: number = 2000
): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(async () => {
      const draftData = getDraftData();
      if (draftData) {
        try {
          await saveDraft(draftData);
        } catch (error) {
          console.error('Failed to save draft:', error);
        }
      }
    }, delayMs);
  };
}