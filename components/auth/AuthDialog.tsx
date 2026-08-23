'use client';

/**
 * Modal dialog for creating a user id or signing in.
 *
 * Used in two places:
 *  - The navbar "Sign in" button (AuthButton).
 *  - The publish gate on the results page (writing is free; publishing
 *    requires an account). After a successful auth it calls onSuccess so the
 *    interrupted action can resume automatically.
 *
 * State resets between openings for free: the body only mounts while open.
 */

import { useEffect, useRef, useState } from 'react';

type Tab = 'signin' | 'signup';

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (username: string) => void;
  /** Headline override for context-specific flows (e.g. publishing). */
  title?: string;
  description?: string;
}

export function AuthDialog({ open, onClose, onSuccess, title, description }: AuthDialogProps) {
  if (!open) return null;
  return (
    <AuthDialogBody onClose={onClose} onSuccess={onSuccess} title={title} description={description} />
  );
}

function AuthDialogBody({
  onClose,
  onSuccess,
  title,
  description,
}: Omit<AuthDialogProps, 'open'>) {
  const [tab, setTab] = useState<Tab>('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  // Move focus into the dialog on open (a11y).
  useEffect(() => {
    const raf = requestAnimationFrame(() => firstFieldRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, []);

  // Escape closes.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const submit = async () => {
    if (submitting) return;
    setError(null);

    const trimmed = username.trim().toLowerCase();
    if (!trimmed || !password) {
      setError('Enter your user id and password.');
      return;
    }
    if (tab === 'signup' && !/^[a-z0-9_]{3,24}$/.test(trimmed)) {
      setError('User id: 3–24 letters, numbers or underscores.');
      return;
    }
    if (tab === 'signup' && password.length < 8) {
      setError('Password needs at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/auth/${tab === 'signup' ? 'signup' : 'signin'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }
      onSuccess(data.user?.username ?? trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-ink/45 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        className="animate-fade-up w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-xl sm:p-8"
      >
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Account</p>
        <h2 id="auth-dialog-title" className="mt-2 font-serif text-2xl tracking-tight">
          {title ?? (tab === 'signin' ? 'Welcome back' : 'Create your user id')}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {description ??
            'Writing is free — an account only gates publishing. Your posts stay anonymous either way.'}
        </p>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Sign in or create account"
          className="mt-5 flex rounded-lg border border-line-strong bg-paper p-0.5"
        >
          {(['signin', 'signup'] as Tab[]).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={tab === option}
              onClick={() => {
                setTab(option);
                setError(null);
              }}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === option ? 'bg-ink text-paper' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {option === 'signin' ? 'Sign in' : 'Create user id'}
            </button>
          ))}
        </div>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div>
            <label htmlFor="auth-username" className="text-sm font-medium">
              User id
            </label>
            <input
              ref={firstFieldRef}
              id="auth-username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. quiet_writer"
              className="mt-1.5 h-11 w-full rounded-lg border border-line-strong bg-paper px-3.5 text-sm outline-none transition-colors focus:border-ink"
            />
            {tab === 'signup' && (
              <p className="mt-1 text-xs text-ink-faint">3–24 characters · letters, numbers, underscores.</p>
            )}
          </div>

          <div>
            <label htmlFor="auth-password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={tab === 'signup' ? 'At least 8 characters' : 'Your password'}
              className="mt-1.5 h-11 w-full rounded-lg border border-line-strong bg-paper px-3.5 text-sm outline-none transition-colors focus:border-ink"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-sm text-accent">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2.5 pt-1 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-ink px-5 text-sm font-medium text-paper transition-colors hover:bg-ink-soft disabled:opacity-50"
            >
              {submitting && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-paper/40 border-t-paper" aria-hidden="true" />
              )}
              {tab === 'signin' ? 'Sign in' : 'Create & continue'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-line-strong bg-surface px-5 text-sm font-medium transition-colors hover:border-ink-faint sm:flex-none sm:px-6"
            >
              Cancel
            </button>
          </div>
        </form>

        {tab === 'signin' && (
          <p className="mt-4 text-center text-xs text-ink-muted">
            New here?{' '}
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                setError(null);
              }}
              className="font-medium text-ink underline underline-offset-2 hover:text-accent"
            >
              Create a user id
            </button>{' '}
            — takes seconds, no email needed.
          </p>
        )}
      </div>
    </div>
  );
}
