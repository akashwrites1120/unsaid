'use client';

/**
 * Public feed of anonymously published writings.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { categories, categoryOrder } from '@/lib/config/categories';
import { getChallengeMode, type ChallengeModeKey } from '@/lib/config/challengeModes';
import { formatDistanceToNow } from 'date-fns';
import { AuthButton } from '@/components/auth/AuthButton';

interface FeedWriting {
  id: string;
  excerpt: string;
  wordCount: number;
  category: keyof typeof categories;
  challengeMode: ChallengeModeKey;
  challengeDuration: number;
  createdAt: string;
  reactionCount: number;
}

interface Pagination {
  page: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

type Sort = 'recent' | 'popular';

export default function FeedPage() {
  const [writings, setWritings] = useState<FeedWriting[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('recent');
  const [category, setCategory] = useState<string | null>(null);

  const pageRef = useRef(1);
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (page: number, append: boolean) => {
      const requestId = ++requestIdRef.current;

      try {
        const params = new URLSearchParams({ page: String(page), limit: '12', sort });
        if (category) params.set('category', category);

        const response = await fetch(`/api/writings?${params.toString()}`);
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load writings.');
        }

        // Everything below runs after an await boundary.
        if (requestId !== requestIdRef.current) return; // stale response

        const data = await response.json();
        setWritings((prev) => (append ? [...prev, ...data.writings] : data.writings));
        setPagination(data.pagination);
        setError(null);
        setLoading(false);
        setLoadingMore(false);
        pageRef.current = page;
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load writings.');
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [sort, category]
  );

  useEffect(() => {
    // Initial + filter-driven fetch; setStates inside `load` happen after the
    // await boundary, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(1, false);
  }, [load]);

  /** Filter/sort switches start from click handlers (event context). */
  const changeSort = (next: Sort) => {
    if (next === sort) return;
    setLoading(true);
    setWritings([]);
    setSort(next);
  };

  const changeCategory = (next: string | null) => {
    if (next === category) return;
    setLoading(true);
    setWritings([]);
    setCategory(next);
  };

  const hasAnyContent = writings.length > 0;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-3">
            <Link href="/" className="font-mono text-sm font-semibold tracking-[0.18em]">
              WRITE<span className="text-accent">·</span>OR<span className="text-accent">·</span>LOSE
            </Link>
            <div className="flex shrink-0 items-center gap-4 sm:gap-5">
              <AuthButton />
              <Link
                href="/write/setup"
                className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
              >
                Write something
              </Link>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between gap-3 pb-3">
            <div role="tablist" aria-label="Sort writings" className="flex rounded-lg border border-line-strong bg-surface p-0.5">
              {(['recent', 'popular'] as Sort[]).map((option) => (
                <button
                  key={option}
                  role="tab"
                  aria-selected={sort === option}
                  onClick={() => changeSort(option)}
                  className={`rounded-md px-3.5 py-1.5 text-sm capitalize transition-colors ${
                    sort === option
                      ? 'bg-ink text-paper'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {pagination && (
              <p className="shrink-0 text-xs text-ink-faint tabular-nums" aria-live="polite">
                {pagination.total} {pagination.total === 1 ? 'writing' : 'writings'}
              </p>
            )}
          </div>

          {/* Categories */}
          <nav aria-label="Filter by category" className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6">
            <div className="flex w-max gap-2">
              <CategoryChip label="All" active={category === null} onClick={() => changeCategory(null)} />
              {categoryOrder.map((key) => (
                <CategoryChip
                  key={key}
                  label={categories[key].label}
                  active={category === key}
                  onClick={() => changeCategory(key)}
                />
              ))}
            </div>
          </nav>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        {loading ? (
          <FeedSkeleton />
        ) : error ? (
          <div className="rounded-xl border border-line bg-surface px-6 py-16 text-center">
            <h2 className="font-serif text-2xl">Couldn’t load the feed</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">{error}</p>
            <button
              type="button"
              onClick={() => load(1, false)}
              className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-ink px-6 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
            >
              Try again
            </button>
          </div>
        ) : !hasAnyContent ? (
          <div className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-16 text-center">
            <h2 className="font-serif text-2xl">Nothing here yet</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
              {category
                ? `No published writings in ${categories[category as keyof typeof categories]?.label ?? 'this category'} yet.`
                : 'Be the first to finish a challenge and share it with the world.'}
            </p>
            <Link
              href="/write/setup"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-ink px-6 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
            >
              Start writing
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-4" aria-label="Published writings">
              {writings.map((writing) => (
                <FeedCard key={writing.id} writing={writing} showReactions={sort === 'popular'} />
              ))}
            </ul>

            {pagination?.hasMore && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => load(pageRef.current + 1, true)}
                  disabled={loadingMore}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface px-6 text-sm font-medium transition-colors hover:border-ink-faint disabled:opacity-50"
                >
                  {loadingMore && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line-strong border-t-ink" aria-hidden="true" />
                  )}
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 text-center text-xs text-ink-muted sm:px-6 sm:text-left">
          Every piece was written under pressure and shared anonymously by choice.
        </div>
      </footer>
    </div>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
        active
          ? 'border-ink bg-ink text-paper'
          : 'border-line-strong bg-surface text-ink-muted hover:border-ink-faint hover:text-ink'
      }`}
    >
      {label}
    </button>
  );
}

function FeedCard({ writing, showReactions }: { writing: FeedWriting; showReactions: boolean }) {
  const category = categories[writing.category];
  const mode = getChallengeMode(writing.challengeMode);

  return (
    <li>
      <Link
        href={`/feed/${writing.id}`}
        className="block rounded-xl border border-line bg-surface p-5 transition-colors hover:border-ink-faint sm:p-6"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          <span className="rounded-full bg-paper px-2.5 py-0.5 font-medium text-ink-soft ring-1 ring-line">
            {category?.label ?? 'Other'}
          </span>
          <time dateTime={writing.createdAt}>
            {formatDistanceToNow(new Date(writing.createdAt), { addSuffix: true })}
          </time>
          <span aria-hidden="true">·</span>
          <span>{mode?.label ?? writing.challengeMode} mode</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{writing.wordCount} words</span>
          {showReactions && writing.reactionCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{writing.reactionCount} reactions</span>
            </>
          )}
        </div>
        <p className="prose-reading mt-3 line-clamp-3 text-base text-ink-soft">
          {writing.excerpt}
        </p>
        <span className="mt-3 inline-block text-sm font-medium text-ink-muted transition-colors group-hover:text-ink">
          Read →
        </span>
      </Link>
    </li>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true" role="presentation">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-line bg-surface p-6">
          <div className="flex gap-2">
            <div className="h-4 w-16 rounded-full bg-line" />
            <div className="h-4 w-24 rounded-full bg-line" />
          </div>
          <div className="mt-4 space-y-2.5">
            <div className="h-3.5 w-full rounded-full bg-line" />
            <div className="h-3.5 w-11/12 rounded-full bg-line" />
            <div className="h-3.5 w-2/3 rounded-full bg-line" />
          </div>
        </div>
      ))}
    </div>
  );
}
