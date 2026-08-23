'use client';

/**
 * Results + publishing flow.
 *
 * Publish decision is a deliberate three-step path (FR-6.1 – FR-6.5):
 *   Share → explicit privacy warning → confirmation checklist → publish.
 * Equal-weight choices at every step; nothing publishes implicitly.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getChallengeMode } from '@/lib/config/challengeModes';
import { formatElapsed } from '@/lib/timer/inactivityTimer';
import { categories } from '@/lib/config/categories';
import { publishConfig } from '@/lib/config/publishConfig';
import { loadSessionFromStorage, saveSessionToStorage, type WritingSession } from '@/lib/storage/draftStorage';
import { countWords, htmlToPlainText } from '@/lib/utils/text';
import { AuthDialog } from '@/components/auth/AuthDialog';

type PublishStep = 'idle' | 'privacy' | 'confirm' | 'publishing' | 'done';

const STATUS_COPY: Record<WritingSession['status'], { label: string; tone: string; blurb: string }> = {
  completed: {
    label: 'Challenge complete',
    tone: 'text-ok',
    blurb: 'You finished the run and kept typing past every countdown.',
  },
  failed: {
    label: 'Challenge failed',
    tone: 'text-accent',
    blurb: 'The countdown caught you — but everything you wrote is saved below.',
  },
  writing: {
    label: 'Session ended',
    tone: 'text-ink',
    blurb: 'You stepped away mid-run. Your words are safe.',
  },
};

export default function ResultsPage() {
  const router = useRouter();

  const [session, setSession] = useState<WritingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [publishStep, setPublishStep] = useState<PublishStep>('idle');
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);

  // Publishing requires an account; the dialog resumes the publish on success.
  const [username, setUsername] = useState<string | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setUsername(data.user?.username ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- storage read is
       intentionally post-mount; sessionStorage doesn't exist during SSR,
       so this can't be a lazy initializer without breaking hydration. */
    const saved = loadSessionFromStorage();
    if (!saved || !saved.topic) {
      setLoadError('No finished session found on this device.');
    } else {
      // Normalize stats in case the challenge page didn't finalize.
      const normalized: WritingSession = {
        ...saved,
        wordCount: saved.wordCount || countWords(saved.content ?? ''),
        status: saved.status === 'writing' ? 'completed' : saved.status,
      };
      saveSessionToStorage(normalized);
      setSession(normalized);
    }
    setLoading(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  if (loading) {
    return (
      <main id="main-content" className="grid min-h-screen place-items-center px-6">
        <div className="flex items-center gap-3 text-sm text-ink-muted">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-ink" aria-hidden="true" />
          Loading results…
        </div>
      </main>
    );
  }

  if (loadError || !session) {
    return (
      <main id="main-content" className="grid min-h-screen place-items-center px-6">
        <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-8 text-center">
          <h1 className="font-serif text-2xl">Nothing to show yet</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{loadError}</p>
          <Link
            href="/write/setup"
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-ink px-6 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
          >
            Start a new challenge
          </Link>
        </div>
      </main>
    );
  }

  const mode = getChallengeMode(session.mode);
  const category = categories[session.category];
  const status = STATUS_COPY[session.status] ?? STATUS_COPY.writing;
  const minutes = session.elapsedMs / 60_000;
  const wpm = minutes > 0 && session.wordCount > 0 ? Math.round(session.wordCount / minutes) : 0;
  const streakSeconds = Math.round((session.longestStreakMs ?? 0) / 1000);
  const plainPreview = htmlToPlainText(session.content ?? '');
  const underMin = session.wordCount < publishConfig.minWordCount;
  const remaining = publishConfig.minWordCount - session.wordCount;

  const handlePublish = async () => {
    if (!session) return;
    setPublishStep('publishing');
    setPublishError(null);

    try {
      const response = await fetch('/api/writings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: session.content,
          category: session.category,
          challengeMode: session.mode,
          challengeDuration: session.elapsedMs,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        // Session expired mid-flow — reopen the account gate instead of dead-ending.
        if (data.code === 'AUTH_REQUIRED') {
          setPublishStep('confirm');
          setUsername(null);
          setAuthDialogOpen(true);
          return;
        }
        throw new Error(data.error || 'Publishing failed. Please try again.');
      }

      const updated = { ...session, status: 'completed' as const };
      saveSessionToStorage(updated);
      setPublishedId(data.id);
      setPublishStep('done');
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Publishing failed.');
      setPublishStep('confirm');
    }
  };

  /** Publish attempt — opens the account dialog when signed out. */
  const attemptPublish = () => {
    if (!username) {
      setAuthDialogOpen(true);
      return;
    }
    handlePublish();
  };

  /** Save the finished piece locally as a .txt file. */
  const downloadWriting = () => {
    if (!session) return;
    const header = [
      session.topic || 'Untitled',
      `${mode.label} mode · ${category?.label ?? ''} · ${session.wordCount} words · ${formatElapsed(session.elapsedMs)}`,
      `Written on Write or Lose · ${new Date().toLocaleDateString()}`,
    ].join('\n');

    const blob = new Blob([`${header}\n\n${plainPreview}\n`], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(session.topic || 'writing').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'writing'}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="font-mono text-sm font-semibold tracking-[0.18em]">
            WRITE<span className="text-accent">·</span>OR<span className="text-accent">·</span>LOSE
          </Link>
          <span
            className={`rounded-full border border-line-strong px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide ${status.tone}`}
          >
            {status.label}
          </span>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-3xl flex-1 animate-fade-up px-4 py-12 sm:px-6 md:py-16">
        {/* Heading */}
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink-faint">Results</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight md:text-5xl">
          “{session.topic}”
        </h1>
        <p className="mt-3 max-w-xl leading-relaxed text-ink-muted">
          {status.blurb} Written in{' '}
          <span className="text-ink">{mode.label.toLowerCase()}</span> mode ·{' '}
          <span className="capitalize text-ink">{category?.label.toLowerCase()}</span>.
        </p>

        {/* Stats */}
        <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
          <Stat label="Words" value={String(session.wordCount)} emphasis />
          <Stat label="Time" value={formatElapsed(session.elapsedMs)} />
          <Stat label="WPM" value={wpm > 0 ? String(wpm) : '—'} />
          <Stat label="Longest streak" value={streakSeconds > 0 ? `${streakSeconds}s` : '—'} />
        </dl>

        {/* Preview */}
        <section aria-label="Your writing" className="mt-8 rounded-xl border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <div>
              <h2 className="text-sm font-medium">Your writing</h2>
              <p className="text-xs text-ink-faint">
                Saved privately on this device — readable only by you unless published.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadWriting}
              title="Download as .txt"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-line-strong bg-paper px-3 text-sm font-medium transition-colors hover:border-ink-faint"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 2v8m0 0 3-3m-3 3L5 7M2.5 12.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Download
            </button>
          </div>
          <div className="prose-reading max-h-96 overflow-y-auto px-6 py-6 text-ink-soft">
            {plainPreview || 'No words this time — it happens.'}
          </div>
        </section>

        {/* Actions */}
        {publishStep === 'idle' && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row-reverse">
            <button
              type="button"
              onClick={() => setPublishStep('privacy')}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-lg bg-ink px-6 text-base font-medium text-paper transition-colors hover:bg-ink-soft sm:flex-none sm:px-8"
            >
              Share anonymously
            </button>
            <button
              type="button"
              onClick={() => router.push('/write/setup')}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-lg border border-line-strong bg-surface px-6 text-base font-medium transition-colors hover:border-ink-faint sm:flex-none sm:px-8"
            >
              New challenge
            </button>
          </div>
        )}

        {/* Publish flow panel */}
        {publishStep !== 'idle' && (
          <section aria-live="polite" className="mt-8 rounded-xl border border-line bg-surface p-6 sm:p-8">
            {underMin && publishStep === 'privacy' && (
              <>
                <h2 className="font-serif text-2xl">Almost there</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  Public writings need at least{' '}
                  <span className="font-mono tabular-nums text-ink">{publishConfig.minWordCount}</span>{' '}
                  words. Yours has{' '}
                  <span className="font-mono tabular-nums text-ink">{session.wordCount}</span> —{' '}
                  <span className="font-mono tabular-nums text-ink">{remaining}</span> to go.
                  You can keep writing or keep this one private.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => router.push('/write/challenge')}
                    className="h-11 flex-1 rounded-lg bg-ink px-5 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
                  >
                    Keep writing ({remaining} more)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishStep('idle')}
                    className="h-11 flex-1 rounded-lg border border-line-strong bg-surface px-5 text-sm font-medium transition-colors hover:border-ink-faint"
                  >
                    Keep private
                  </button>
                </div>
              </>
            )}

            {!underMin && publishStep === 'privacy' && (
              <>
                <h2 className="font-serif text-2xl">Before you publish</h2>
                <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-ink-muted">
                  <li className="flex gap-2.5">
                    <Dot /> This will be posted publicly for anyone to read, forever.
                  </li>
                  <li className="flex gap-2.5">
                    <Dot /> It will be published under your user id{username ? ` @${username}` : ''}.
                  </li>
                  <li className="flex gap-2.5">
                    <Dot /> Once public, you cannot edit or delete it in V1.
                  </li>
                </ul>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setPublishStep('confirm')}
                    className="h-11 flex-1 rounded-lg border border-ink bg-surface px-5 text-sm font-medium transition-colors hover:bg-paper"
                  >
                    Continue
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishStep('idle')}
                    className="h-11 flex-1 rounded-lg bg-ink px-5 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
                  >
                    Keep private instead
                  </button>
                </div>
              </>
            )}

            {!underMin && publishStep === 'confirm' && (
              <>
                <h2 className="font-serif text-2xl">Ready to publish?</h2>
                <ul className="mt-4 space-y-2 text-sm text-ink-muted">
                  <Checklist ok>Challenge run recorded ({mode.label.toLowerCase()} mode)</Checklist>
                  <Checklist ok>{session.wordCount} words written</Checklist>
                  <Checklist ok>
                    Minimum length reached ({publishConfig.minWordCount}+)
                  </Checklist>
                </ul>
                {publishError && (
                  <p role="alert" className="mt-4 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
                    {publishError}
                  </p>
                )}
                {!username && (
                  <p className="mt-4 rounded-lg border border-line bg-paper px-4 py-3 text-sm text-ink-muted">
                    Publishing needs a user id — you&apos;ll be asked to{' '}
                    <span className="font-medium text-ink">sign in or create one</span> in the
                    next step. Your post will appear under it.
                  </p>
                )}
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={attemptPublish}
                    className="h-11 flex-1 rounded-lg bg-accent px-5 text-sm font-medium text-white transition-colors hover:bg-red-800"
                  >
                    Publish anonymously
                  </button>
                  <button
                    type="button"
                    onClick={() => setPublishStep('idle')}
                    className="h-11 flex-1 rounded-lg border border-line-strong bg-surface px-5 text-sm font-medium transition-colors hover:border-ink-faint"
                  >
                    Keep private
                  </button>
                </div>
              </>
            )}

            {publishStep === 'publishing' && (
              <div className="flex items-center gap-3 py-2 text-sm text-ink-muted">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-ink" aria-hidden="true" />
                Publishing your writing…
              </div>
            )}

            {publishStep === 'done' && (
              <>
                <h2 className="font-serif text-2xl">Published</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                  Your writing is now live under{' '}
                  <span className="font-medium text-ink">@{username}</span> — go share some
                  reactions.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/feed/${publishedId}`}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-ink px-5 text-sm font-medium text-paper transition-colors hover:bg-ink-soft"
                  >
                    View it live
                  </Link>
                  <Link
                    href="/feed"
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-line-strong bg-surface px-5 text-sm font-medium transition-colors hover:border-ink-faint"
                  >
                    Browse the feed
                  </Link>
                </div>
              </>
            )}
          </section>
        )}
      </main>

      {/* Account gate for publishing — resumes the publish after auth */}
      <AuthDialog
        open={authDialogOpen}
        onClose={() => setAuthDialogOpen(false)}
        onSuccess={(name) => {
          setUsername(name);
          setAuthDialogOpen(false);
          handlePublish();
        }}
        title="One last step"
        description="Publishing needs a user id — create one in seconds or sign in. Your writing will appear under it."
      />
    </div>
  );
}

function Stat({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="bg-surface px-5 py-4 text-center sm:text-left">
      <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd
        className={`mt-1 font-mono tabular-nums ${emphasis ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'} text-ink`}
      >
        {value}
      </dd>
    </div>
  );
}

function Dot() {
  return <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-faint" />;
}

function Checklist({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className={`flex h-4.5 w-4.5 items-center justify-center rounded-full text-[11px] ${
          ok ? 'bg-ok/10 text-ok' : 'bg-line text-ink-muted'
        }`}
      >
        ✓
      </span>
      {children}
    </li>
  );
}
