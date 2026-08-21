'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getChallengeMode, type ChallengeModeKey } from '@/lib/config/challengeModes';
import { formatElapsed } from '@/lib/timer/inactivityTimer';
import { categories } from '@/lib/config/categories';

interface ChallengeResult {
  words: number;
  time: number;
  wpm: number;
  longestStreak: number;
  mode: ChallengeModeKey;
  status: 'completed' | 'failed' | 'stopped';
  topic: string;
  content: string;
  category?: string;
}

export default function ResultsPage() {
  const router = useRouter();
  const [session, setSession] = useState<ChallengeResult | null>(null);
  const [showPublishOptions, setShowPublishOptions] = useState(false);
  const [isUnderMin, setIsUnderMin] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  // Load session from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('writing-session');
    if (saved) {
      const savedSession = JSON.parse(saved);
      const words = savedSession.content?.trim().split(/\s+/).filter(Boolean).length || 0;
      const minutes = savedSession.time / 60000;
      const wpm = minutes > 0 ? Math.round(words / minutes) : 0;
      const longestStreak = savedSession.time; // Simple implementation: total time as streak

      const sessionData: ChallengeResult = {
        words,
        time: savedSession.time || 0,
        wpm,
        longestStreak,
        mode: savedSession.mode,
        status: 'completed',
        topic: savedSession.topic,
        content: savedSession.content,
        category: savedSession.category || 'thoughts',
      };
      setSession(sessionData);
    }
  }, []);

  // Update stats when content changes
  useEffect(() => {
    if (session?.content) {
      const words = session.content.trim().split(/\s+/).filter(Boolean).length;
      const minutes = session.time / 60000;
      const wpm = minutes > 0 ? Math.round(words / minutes) : 0;
      const longestStreak = session.time; // Simple implementation: total time as streak

      setSession({
        ...session,
        words,
        time: session.time,
        wpm,
        longestStreak,
      });
    }
  }, [session?.content, session?.time]);

  const mode = getChallengeMode(session?.mode || 'focus');

  const handleContinue = () => {
    router.push('/write/setup');
  };

  const handleKeepPrivate = () => {
    setShowPublishOptions(false);
    router.push('/write/setup');
  };

  const handlePublish = async () => {
    if (!session) return;

    setIsPublishing(true);
    setPublishError(null);

    try {
      const response = await fetch('/api/writings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: session.content,
          wordCount: session.words,
          category: session.category,
          challengeMode: session.mode,
          challengeDuration: session.time,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish');
      }

      // Mark as published in sessionStorage
      const updatedSession = {
        ...session,
        status: 'published' as const,
        publishedAt: new Date().toISOString(),
        publishedId: data.id,
      };
      sessionStorage.setItem('writing-session', JSON.stringify(updatedSession));

      // Update local state
      setSession(updatedSession);
      setPublishedUrl(data.url);

    } catch (error) {
      setPublishError(error instanceof Error ? error.message : 'Failed to publish');
    } finally {
      setIsPublishing(false);
    }
  };

  const publishConfig = {
    minWordCount: 200,
  };

  const checkPublishConditions = () => {
    if (session?.words && session.words < publishConfig.minWordCount) {
      setIsUnderMin(true);
      return false;
    }
    setIsUnderMin(false);
    return true;
  };

  const handleShowPublishOptions = () => {
    setShowPublishOptions(true);
    checkPublishConditions();
  };

  return (
    <main className="min-h-screen flex flex-col px-6 py-12 bg-white text-gray-900">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900">
          {session?.status === 'completed' ? 'Challenge Complete 🎉' :
           session?.status === 'stopped' ? 'Challenge Stopped' :
           'Challenge Failed'}
        </h1>
        <p className="text-gray-600 mt-2">
          {session?.topic || 'Your writing session'}
        </p>
      </div>

      {/* Stats block */}
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="bg-gray-100 rounded-lg p-8 border border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-gray-500 text-sm">Words</p>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">
                {session?.words || 0}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Time</p>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">
                {formatElapsed(session?.time || 0)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">WPM</p>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">
                {session?.wpm || 0}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Longest Streak</p>
              <p className="text-3xl font-bold text-gray-900 tabular-nums">
                {session?.longestStreak || 0}s
              </p>
            </div>
          </div>
        </div>

        {/* Mode info */}
        <div className="bg-gray-100 rounded-lg p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Challenge Mode</p>
              <p className="text-xl font-semibold text-gray-900">{mode.label}</p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: mode.color }}
              />
              <span className="text-gray-600 text-sm">
                {session?.status === 'completed' ? 'Completed' :
                 session?.status === 'stopped' ? 'Stopped' :
                 'Failed'}
              </span>
            </div>
          </div>
        </div>

        {/* Content preview */}
        <div className="bg-gray-100 rounded-lg p-6 border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Your writing:</p>
          <div className="text-gray-700 text-sm leading-relaxed">
            {session?.content?.length ? (
              session.content.length > 200
                ? session.content.substring(0, 200) + '...'
                : session.content
            ) : 'No content written'}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-4 mt-12 max-w-2xl mx-auto w-full">
        <button
          onClick={handleContinue}
          className="flex-1 px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 transition-colors rounded-none"
        >
          Continue Writing
        </button>
        <button
          onClick={handleShowPublishOptions}
          className="flex-1 px-6 py-3 text-white bg-gray-600 hover:bg-gray-700 transition-colors rounded-none"
        >
          Share
        </button>
      </div>

      {/* Publish options */}
      {showPublishOptions && (
        <div className="mt-8 max-w-2xl mx-auto w-full">
          {isUnderMin ? (
            <div className="bg-gray-100 rounded-lg p-6 border border-gray-200">
              <p className="text-gray-900 text-lg mb-4">
                Your writing is currently {session?.words} words.
              </p>
              <p className="text-gray-600 text-sm mb-6">
                Public writings must be at least {publishConfig.minWordCount} words.
                {publishConfig.minWordCount - (session?.words || 0)} more words to publish.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleContinue}
                  className="flex-1 px-6 py-3 text-white bg-gray-600 hover:bg-gray-700 transition-colors rounded-none"
                >
                  Continue Writing
                </button>
                <button
                  onClick={handleKeepPrivate}
                  className="flex-1 px-6 py-3 text-white bg-gray-600 hover:bg-gray-700 transition-colors rounded-none"
                >
                  Keep Private
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg p-6 border border-gray-200">
              <p className="text-gray-900 text-lg mb-4">
                ✅ Challenge completed
                <br />
                ✓ {session?.words} words
                <br />
                ✓ Minimum length reached
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleKeepPrivate}
                  className="flex-1 px-6 py-3 text-white bg-gray-600 hover:bg-gray-700 transition-colors rounded-none"
                >
                  Keep Private
                </button>
                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className={`flex-1 px-6 py-3 text-white bg-green-600 hover:bg-green-700 transition-colors rounded-none ${
                    isPublishing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isPublishing ? 'Publishing...' : 'Publish Anonymously'}
                </button>
              </div>

              {/* Error message */}
              {publishError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{publishError}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Success confirmation */}
      {publishedUrl && (
        <div className="mt-8 max-w-2xl mx-auto w-full">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="text-center">
              <div className="text-4xl mb-4">✓</div>
              <h2 className="text-xl font-semibold text-green-900 mb-2">
                Published Successfully!
              </h2>
              <p className="text-green-700 mb-4">
                Your writing is now live and anonymous.
              </p>
              <div className="space-y-2">
                <a
                  href={publishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-2 bg-green-600 text-white hover:bg-green-700 transition-colors rounded-none"
                >
                  View Your Writing
                </a>
                <div className="text-sm text-green-600">
                  {publishedUrl}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Publishing spinner */}
      {isPublishing && (
        <div className="fixed inset-0 bg-gray-900/70 flex items-center justify-center z-50">
          <div className="text-center p-8 bg-white border-2 border-green-600 rounded-lg">
            <div className="animate-pulse">
              <div className="text-4xl mb-4">✓</div>
              <p className="text-gray-900 text-lg">Publishing your writing...</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}