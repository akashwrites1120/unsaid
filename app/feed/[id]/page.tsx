'use client';

/**
 * Public reading view for one anonymously published writing.
 */

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { categories } from '@/lib/config/categories';
import { getChallengeMode, type ChallengeModeKey } from '@/lib/config/challengeModes';
import { formatDistanceToNow } from 'date-fns';

interface Writing {
  id: string;
  content: string;
  wordCount: number;
  category: keyof typeof categories;
  challengeMode: ChallengeModeKey;
  challengeDuration: number;
  createdAt: string;
}

type ReactionType = 'heart' | 'clap' | 'mind_blown' | 'relate';

type Counts = Record<ReactionType | 'total', number>;

const REACTIONS: { type: ReactionType; label: string }[] = [
  { type: 'heart', label: 'Heart' },
  { type: 'clap', label: 'Clap' },
  { type: 'mind_blown', label: 'Mind blown' },
  { type: 'relate', label: 'Relate' },
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
  // This browser's active reactions (mirrored by a session fingerprint server-side).
  const [reacted, setReacted] = useState<Set<ReactionType>>(new Set());

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

        const reactionsResponse = await fetch(`/api/writings/${id}/reactions`);
        if (reactionsResponse.ok && !cancelled) {
          const reactionsData = await reactionsResponse.json();
          setCounts(reactionsData.counts);
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

      const hadReacted = reacted.has(type);
      const previousCounts = counts;
      const previousReacted = reacted;
      const nextReacted = new Set(reacted);

      let optimistic: Counts;
      if (hadReacted) {
        nextReacted.delete(type);
        optimistic = {
          ...counts,
          [type]: Math.max(0, counts[type] - 1),
          total: Math.max(0, counts.total - 1),
        };
      } else {
        nextReacted.add(type);
        optimistic = {
          ...counts,
          [type]: counts[type] + 1,
          total: counts.total + 1,
        };
      }

      setReacted(nextReacted);
      setCounts(optimistic);

      try {
        const response = await fetch(`/api/writings/${id}/reactions`, {
          method: hadReacted ? 'DELETE' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reactionType: type }),
        });
        if (response.ok) {
          const data = await response.json();
          setCounts(data.counts);
        } else {
          throw new Error('Request failed');
        }
      } catch {
        setReacted(previousReacted);
        setCounts(previousCounts);
      }
    },
    [counts, id, reacted]
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
          <time dateTime={writing.createdAt}>
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
            className="flex h-9 w-9 items-center justify-center rounded-full bg-paper font-mono text-sm text-ink-muted ring-1 ring-line"
          >
            ?
          </span>
          <span>
            Anonymous writer
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
            <div className="mt-4 flex flex-wrap gap-2">
              {REACTIONS.map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => react(type)}
                  aria-pressed={reacted.has(type)}
                  className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors ${
                    reacted.has(type)
                      ? 'border-ink bg-ink text-paper'
                      : 'border-line-strong bg-surface text-ink-muted hover:border-ink-faint hover:text-ink'
                  }`}
                >
                  {label}
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
    </div>
  );
}
