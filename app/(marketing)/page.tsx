import Link from 'next/link';
import { challengeModeOrder, getChallengeMode } from '@/lib/config/challengeModes';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="font-mono text-sm font-semibold tracking-[0.18em] text-ink"
          >
            WRITE<span className="text-accent">·</span>OR<span className="text-accent">·</span>LOSE
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-6 text-sm">
            <Link href="/feed" className="text-ink-muted transition-colors hover:text-ink">
              Read writings
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main id="main-content" className="flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center md:py-32">
          <p className="mb-6 font-mono text-xs uppercase tracking-[0.25em] text-ink-faint">
            A writing challenge
          </p>
          <h1 className="font-serif text-5xl leading-[1.08] tracking-tight text-balance md:text-7xl">
            Stop procrastinating.
            <br />
            Start writing.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-muted">
            Pick a topic. Choose your pressure. Then keep typing — because the
            moment you stop, the countdown wins. Your words are never deleted,
            even when you lose.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/write/setup"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-ink px-8 text-base font-medium text-paper transition-colors hover:bg-ink-soft"
            >
              Start writing
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2 8h11M9 3.5 13.5 8 9 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              href="/feed"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-line-strong bg-surface px-8 text-base font-medium text-ink transition-colors hover:border-ink-faint"
            >
              Read recent writings
            </Link>
          </div>
        </section>

        {/* Modes */}
        <section aria-labelledby="modes-heading" className="mx-auto w-full max-w-5xl px-6 pb-24">
          <h2 id="modes-heading" className="sr-only">
            Challenge modes
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {challengeModeOrder.map((key) => {
              const mode = getChallengeMode(key);
              return (
                <div key={key} className="rounded-xl border border-line bg-surface p-6">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{mode.label}</span>
                    <span
                      className="font-mono text-sm tabular-nums text-ink-muted"
                      aria-hidden="true"
                    >
                      {Math.round(mode.inactivityThresholdMs / 1000)}s
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {mode.description}.
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-10 text-center text-sm text-ink-muted">
            Stop typing for longer than your limit and the run is over.
            Everything you wrote is saved — always.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-6 py-6 text-sm text-ink-muted sm:flex-row">
          <span>Write or Lose</span>
          <span>Publishing is anonymous by design. No accounts, ever.</span>
        </div>
      </footer>
    </div>
  );
}
