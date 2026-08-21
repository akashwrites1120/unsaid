'use client';

import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-8 text-center">
        <h1 className="font-serif text-2xl">Something broke</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          An unexpected error occurred. Your local drafts are safe — nothing was deleted.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-ink-faint">Ref: {error.digest}</p>
        )}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-ink px-6 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-line-strong bg-surface px-6 text-sm font-medium transition-colors hover:border-ink-faint"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
