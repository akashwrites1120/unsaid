import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main-content" className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm text-center">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-faint">404</p>
        <h1 className="mt-3 font-serif text-3xl tracking-tight">This page went unwritten</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          The page you’re looking for doesn’t exist — but your next challenge could.
        </p>
        <div className="mt-7 flex flex-col gap-2.5">
          <Link
            href="/write/setup"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-ink px-6 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
          >
            Start writing
          </Link>
          <Link
            href="/feed"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-line-strong bg-surface px-6 text-sm font-medium transition-colors hover:border-ink-faint"
          >
            Browse the feed
          </Link>
        </div>
      </div>
    </main>
  );
}
