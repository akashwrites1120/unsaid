'use client';

/**
 * Public reading view for one published writing.
 */

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { categories } from '@/lib/config/categories';
import { getChallengeMode, type ChallengeModeKey } from '@/lib/config/challengeModes';
import { formatDistanceToNow } from 'date-fns';
import { AuthDialog } from '@/components/auth/AuthDialog';

interface Writing {
  id: string;
  content: string;
  wordCount: number;
  category: keyof typeof categories;
  challengeMode: ChallengeModeKey;
  challengeDuration: number;
  createdAt: string;
  authorUsername?: string | null;
}

type ReactionType = 'heart' | 'clap' | 'mind_blown' | 'relate';

type Counts = Record<ReactionType | 'total', number>;

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'heart', emoji: '❤️', label: 'Heart' },
  { type: 'clap', emoji: '👏', label: 'Clap' },
  { type: 'mind_blown', emoji: '🤯', label: 'Mind blown' },
  { type: 'relate', emoji: '🤝', label: 'Relate' },
];

export default function WritingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [writing, setWriting] = useState<Writing | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [counts, setCounts] = useState<Counts | null>(null);
  /** The signed-in user's single reaction on this writing (or null). */
  const [myReaction, setMyReaction] = useState<ReactionType | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const pendingReactionRef = useRef<ReactionType | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setNotFound(false);
      setError(null);

      try {
        const response = await fetch(`/api/writings/${id}`);
        if (response.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!response.ok) throw new Error('Failed to load this writing.');

        const data = await response.json();
        if (cancelled) return;
        setWriting(data);

        // Reactions + session in parallel.
        const [reactionsResponse, meResponse] = await Promise.all([
          fetch(`/api/writings/${id}/reactions`),
          fetch('/api/auth/me'),
        ]);
        if (!cancelled && reactionsResponse.ok) {
          const reactionsData = await reactionsResponse.json();
          setCounts(reactionsData.counts);
          setMyReaction(reactionsData.myReaction ?? null);
        }
        if (!cancelled && meResponse.ok) {
          const meData = await meResponse.json().catch(() => null);
          setSignedIn(Boolean(meData?.user));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const react = useCallback(
    async (type: ReactionType) => {
      if (!counts) return;

      // Sign-in gate — remember what the user wanted and open the dialog.
      if (!signedIn && !myReaction) {
        pendingReactionRef.current = type;
        setAuthDialogOpen(true);
        return;
      }

      const isToggleOff = myReaction === type;
      const previousCounts = counts;
      const previousReaction = myReaction;

      let optimistic: Counts;
      if (isToggleOff) {
        optimistic = {
          ...counts,
          [type]: Math.max(0, counts[type] - 1),
          total: Math.max(0, counts.total - 1),
        };
      } else if (myReaction) {
        // Switching emoji — total stays the same.
        optimistic = {
          ...counts,
          [type]: counts[type] + 1,
          [myReaction]: Math.max(0, counts[myReaction] - 1),
        };
      } else {
        optimistic = {
          ...counts,
          [type]: counts[type] + 1,
          total: counts.total + 1,
        };
      }

      setMyReaction(isToggleOff ? null : type);
      setCounts(optimistic);

      try {
        const response = await fetch(`/api/writings/${id}/reactions`, {
          method: isToggleOff ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reactionType: type }),
        });
        if (!response.ok) throw new Error('Request failed');
        const data = await response.json();
        setCounts(data.counts);
        setMyReaction(data.myReaction ?? null);
      } catch {
        setMyReaction(previousReaction);
        setCounts(previousCounts);
      }
    },
    [counts, id, myReaction, signedIn]
  );

  if (loading) {
    return (
      <main id="main-content" className="grid min-h-screen place-items-center px-6">
        <div className="flex items-center gap-3 text-sm text-ink-muted">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-ink" aria-hidden="true" />
          Loading…
        </div>
      </main>
    );
  }

  if (notFound || error || !writing) {
    return (
      <main id="main-content" className="grid min-h-screen place-items-center px-6">
        <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-8 text-center">
          <h1 className="font-serif text-2xl">
            {notFound ? 'Writing not found' : 'Couldn’t load this writing'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {error ?? 'It may have never existed — or the link is off.'}
          </p>
          <Link
            href="/feed"
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-ink px-6 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
          >
            Back to the feed
          </Link>
        </div>
      </main>
    );
  }

  const category = categories[writing.category];
  const mode = getChallengeMode(writing.challengeMode);
  const minutes = Math.max(1, Math.round(writing.challengeDuration / 60_000));
  const authorName = writing.authorUsername
    ? `@${writing.authorUsername}`
    : 'Unknown writer';

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/feed"
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10.5 3 5.5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Feed
          </Link>
          <Link
            href="/write/setup"
            className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
          >
            Write something
          </Link>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 animate-fade-up px-4 py-12 sm:px-6 md:py-16">
        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-muted sm:text-sm">
          <span className="rounded-full bg-surface px-3 py-1 font-medium text-ink-soft ring-1 ring-line">
            {category?.label ?? 'Other'}
          </span>
          <time dateTime={writing.createdAt} suppressHydrationWarning>
            Published {formatDistanceToNow(new Date(writing.createdAt), { addSuffix: true })}
          </time>
          <span aria-hidden="true">·</span>
          <span>{mode?.label ?? writing.challengeMode} mode</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{writing.wordCount} words in ~{minutes} min</span>
        </div>

        {/* Byline */}
        <h1 className="mt-6 flex items-center gap-3 text-lg">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft font-mono text-sm font-semibold text-accent ring-1 ring-line"
          >
            {(writing.authorUsername ?? '?').charAt(0).toUpperCase()}
          </span>
          <span>
            {authorName}
            <span className="block text-xs font-normal text-ink-faint">
              Wrote under pressure. Chose to share.
            </span>
          </span>
        </h1>

        {/* Body */}
        <article className="prose-reading mt-10 text-ink">
          {writing.content}
        </article>

        {/* Reactions */}
        {counts && (
          <section aria-label="Reactions" className="mt-14 border-t border-line pt-8">
            <p className="text-sm text-ink-muted">How did this land for you?</p>
            {!signedIn && !myReaction && (
              <p className="mt-1.5 text-xs text-ink-faint">
                Sign in to leave a reaction — one per person.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {REACTIONS.map(({ type, emoji, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => react(type)}
                  aria-pressed={myReaction === type}
                  aria-label={`${label} (${counts[type]})`}
                  title={label}
                  className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 transition-colors ${
                    myReaction === type
                      ? 'border-ink bg-ink text-paper'
                      : 'border-line-strong bg-surface text-ink-muted hover:border-ink-faint hover:text-ink'
                  }`}
                >
                  <span aria-hidden="true">{emoji}</span>
                  <span className="font-mono text-xs tabular-nums opacity-80">
                    {counts[type]}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Footer CTA */}
        <footer className="mt-16 rounded-xl border border-dashed border-line-strong px-6 py-8 text-center">
          <p className="font-serif text-xl">Everyone has something unsaid.</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
            Write yours under pressure — then decide if the world gets to read it.
          </p>
          <Link
            href="/write/setup"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-ink px-6 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
          >
            Start your own
          </Link>
        </footer>
      </main>

      {/* Sign-in gate for reactions — resumes the click after auth */}
      <AuthDialog
        open={authDialogOpen}
        onClose={() => {
          setAuthDialogOpen(false);
          pendingReactionRef.current = null;
        }}
        onSuccess={() => {
          setSignedIn(true);
          setAuthDialogOpen(false);
          const pending = pendingReactionRef.current;
          pendingReactionRef.current = null;
          if (pending) react(pending);
        }}
        title="Sign in to react"
        description="Reactions are tied to accounts so everyone gets exactly one. It takes seconds."
      />
    </div>
  );
}
