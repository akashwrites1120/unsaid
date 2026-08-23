import Link from 'next/link';
import { challengeModeOrder, getChallengeMode } from '@/lib/config/challengeModes';
import { AuthButton } from '@/components/auth/AuthButton';
import { GitHubLink } from '@/components/GitHubLink';

const MODE_ICONS: Record<string, React.ReactNode> = {
  soft: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6.5V10l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  focus: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="3.75" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="1" fill="currentColor" />
    </svg>
  ),
  hard: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2.5 17.5 16h-15L10 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M10 8v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="13.75" r="0.9" fill="currentColor" />
    </svg>
  ),
};

const STEPS = [
  {
    n: '01',
    title: 'Pick a topic',
    text: 'Choose a prompt or type your own. Something you have been meaning to say.',
  },
  {
    n: '02',
    title: 'Choose your pressure',
    text: 'Soft, focus, or hard — each one sets how long you can go silent before it all ends.',
  },
  {
    n: '03',
    title: 'Don’t stop typing',
    text: 'The countdown resets with every keystroke. Stop too long and the run is over.',
  },
];

const PRINCIPLES = [
  { title: 'Never deleted', text: 'Lose the challenge, keep every word. Your writing is always saved.' },
  { title: 'Published as you', text: 'Posts appear under your user id — a small identity you create in seconds.' },
  { title: 'Take it with you', text: 'Download any finished piece as a file. Your words belong to you, online or off.' },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="font-mono text-sm font-semibold tracking-[0.18em] text-ink"
          >
            UNSAID
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-5 text-sm sm:gap-6">
            <Link href="/feed" className="text-ink-muted transition-colors hover:text-ink">
              Read writings
            </Link>
            <AuthButton />
            <Link
              href="/write/setup"
              className="inline-flex h-9 items-center rounded-lg bg-ink px-4 font-medium text-paper transition-colors hover:bg-ink-soft"
            >
              Start writing
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content" className="flex flex-1 flex-col">
        {/* Hero */}
        <section className="hero-glow relative overflow-hidden">
          <div className="bg-dot-grid pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-6 pb-16 pt-12 text-center sm:pb-20 sm:pt-14 md:pb-28 md:pt-16">
            <p className="animate-fade-up mb-8 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-1.5 font-mono text-xs uppercase tracking-[0.22em] text-ink-muted">
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              A writing challenge
            </p>

            <h1 className="animate-fade-up delay-1 font-serif text-5xl leading-[1.06] tracking-tight text-balance md:text-7xl">
              Stop procrastinating.
              <br />
              <span className="relative inline-block">
                <em className="not-italic">Start writing.</em>
                <svg
                  className="animate-accent-underline absolute -bottom-1 left-0 w-full text-accent"
                  viewBox="0 0 300 12"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path d="M3 9C60 3.5 180 2.5 297 7.5" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p className="animate-fade-up delay-2 mt-8 max-w-xl text-lg leading-relaxed text-ink-muted">
              Pick a topic. Choose your pressure. Then keep typing — because the
              moment you stop, the countdown wins. Your words are never deleted,
              even when you lose.
            </p>

            <div className="animate-fade-up delay-3 mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/write/setup"
                className="card-lift inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-ink px-8 text-base font-medium text-paper hover:bg-ink-soft"
              >
                Start writing — it’s free
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

            {/* Product demo mock */}
            <div className="animate-fade-up delay-4 mt-16 w-full max-w-xl">
              <div
                className="rounded-xl border border-line bg-surface p-5 text-left shadow-[0_24px_60px_-32px_rgba(28,25,23,0.35)] sm:p-6"
                aria-hidden="true"
              >
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-soft font-mono text-xs font-semibold text-accent">
                      ?
                    </span>
                    <div>
                      <p className="text-sm font-medium leading-tight">Things I never said out loud</p>
                      <p className="font-mono text-[11px] uppercase tracking-wider text-ink-faint">Focus mode</p>
                    </div>
                  </div>
                  <div className="animate-timer-breathe inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-warn/70 font-mono text-sm font-semibold tabular-nums text-warn">
                    14
                  </div>
                </div>
                <div className="prose-reading pt-4 text-base text-ink-soft">
                  <p className="animate-demo-type">There is a version of this conversation where I finally say</p>
                  <p>
                    what I actually mean<span className="animate-caret ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[3px] bg-accent" />
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
                  <span>Keep typing…</span>
                  <span className="tabular-nums">47 words</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Modes */}
        <section aria-labelledby="modes-heading" className="mx-auto w-full max-w-6xl px-6 py-20 md:py-24">
          <div className="mb-10 max-w-lg">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">Choose your pressure</p>
            <h2 id="modes-heading" className="mt-3 font-serif text-3xl tracking-tight md:text-4xl">
              Three ways to lose
            </h2>
            <p className="mt-3 text-ink-muted">
              Stop typing for longer than your limit and the run is over.
              Everything you wrote is saved — always.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {challengeModeOrder.map((key) => {
              const mode = getChallengeMode(key);
              return (
                <div key={key} className="card-lift group rounded-xl border border-line bg-surface p-6">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-paper text-ink-muted ring-1 ring-line transition-colors group-hover:text-accent">
                      {MODE_ICONS[key]}
                    </span>
                    <span
                      className="rounded-full bg-paper px-2.5 py-1 font-mono text-xs tabular-nums text-ink-muted ring-1 ring-line"
                      aria-label={`${Math.round(mode.inactivityThresholdMs / 1000)} second limit`}
                    >
                      {Math.round(mode.inactivityThresholdMs / 1000)}s
                    </span>
                  </div>
                  <h3 className="mt-5 font-medium">{mode.label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{mode.description}.</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section aria-labelledby="how-heading" className="border-y border-line bg-surface/60">
          <div className="mx-auto w-full max-w-6xl px-6 py-20 md:py-24">
            <div className="mb-12 max-w-lg">
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">How it works</p>
              <h2 id="how-heading" className="mt-3 font-serif text-3xl tracking-tight md:text-4xl">
                From blank page to published
              </h2>
            </div>
            <ol className="grid gap-10 sm:grid-cols-3 sm:gap-6">
              {STEPS.map((step) => (
                <li key={step.n} className="relative">
                  <span className="font-mono text-sm text-accent" aria-hidden="true">
                    {step.n}
                  </span>
                  <h3 className="mt-2 font-serif text-xl">{step.title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Principles */}
        <section aria-labelledby="promise-heading" className="mx-auto w-full max-w-6xl px-6 py-20 md:py-24">
          <div className="mb-12 max-w-lg">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">The promise</p>
            <h2 id="promise-heading" className="mt-3 font-serif text-3xl tracking-tight md:text-4xl">
              Built to be safe to fail in
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {PRINCIPLES.map((item) => (
              <div key={item.title} className="rounded-xl border border-line bg-surface p-6">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-ok">
                  <path d="m4.5 10.5 3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h3 className="mt-4 font-medium">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-24">
          <div className="hero-glow relative overflow-hidden rounded-2xl border border-line bg-surface px-6 py-16 text-center md:py-20">
            <div className="bg-dot-grid pointer-events-none absolute inset-0 rotate-180" aria-hidden="true" />
            <div className="relative">
              <h2 className="mx-auto max-w-xl font-serif text-3xl leading-tight tracking-tight text-balance md:text-5xl">
                The page is waiting.
                <br />
                It won’t wait forever.
              </h2>
              <Link
                href="/write/setup"
                className="card-lift mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-ink px-8 text-base font-medium text-paper hover:bg-ink-soft"
              >
                Take the challenge
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M2 8h11M9 3.5 13.5 8 9 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <p className="mt-4 text-sm text-ink-faint">Free to write. No mercy from the timer.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-ink-muted sm:flex-row">
          <span className="font-mono text-xs font-semibold tracking-[0.18em]">
            UNSAID
          </span>
          <span>Writing is free. Publishing needs a user id — posts show it proudly.</span>
          <GitHubLink />
        </div>
      </footer>
    </div>
  );
}
