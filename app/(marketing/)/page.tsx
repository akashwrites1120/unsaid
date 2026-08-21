import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="max-w-2xl text-center space-y-8">
        {/* Logo/Mark */}
        <div className="flex items-center justify-center gap-3">
          <span className="text-4xl font-mono font-bold text-red-500 tabular-nums">
            WRITE
          </span>
          <span className="text-4xl font-mono font-bold text-white/50 tabular-nums">
            OR
          </span>
          <span className="text-4xl font-mono font-bold text-red-500 tabular-nums">
            LOSE
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
          Stop Procrastinating.
          <br />
          <span className="text-red-500">Start Writing.</span>
        </h1>

        {/* Subtext */}
        <p className="text-lg md:text-xl text-white/70 max-w-xl mx-auto leading-relaxed">
          Whatever you&apos;ve been putting off, write it now. The only rule is simple: keep
          writing.
        </p>

        {/* CTA */}
        <Link
          href="/write/setup"
          className="inline-flex items-center gap-2 px-8 py-4 text-lg font-semibold text-black bg-white hover:bg-white/90 transition-colors rounded-none"
        >
          Start Writing
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 8l4 4m0 0l-4 4m4-4H3"
            />
          </svg>
        </Link>

        {/* Modes hint */}
        <p className="text-sm text-white/40 mt-4">
          Choose your pressure: Soft · Focus · Hard
        </p>
      </div>
    </main>
  );
}