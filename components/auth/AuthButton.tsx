'use client';

/**
 * Navbar auth widget: "Sign in" button when signed out (always visible),
 * username + sign-out when signed in.
 */

import { useCallback, useEffect, useState } from 'react';
import { AuthDialog } from './AuthDialog';

interface AuthButtonProps {
  /** Compact variant for tight headers. */
  compact?: boolean;
}

export function AuthButton({ compact = false }: AuthButtonProps) {
  const [username, setUsername] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Load session once on mount. Deferred so setState never runs in the
  // effect body synchronously.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setUsername(data.user?.username ?? null);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch('/api/auth/signout', { method: 'POST' });
    } finally {
      setUsername(null);
      setSigningOut(false);
    }
  }, [signingOut]);

  if (!loaded) return <span className="inline-block h-9 w-16" aria-hidden="true" />;

  if (username) {
    return (
      <span className="flex items-center gap-2.5">
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-xs font-medium text-ink-muted ${
            compact ? '' : 'max-w-[10rem]'
          }`}
          title={`Signed in as ${username}`}
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ok" aria-hidden="true" />
          <span className="truncate">{username}</span>
        </span>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="text-sm text-ink-muted transition-colors hover:text-ink disabled:opacity-50"
        >
          {signingOut ? '…' : 'Sign out'}
        </button>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        className="text-sm text-ink-muted transition-colors hover:text-ink"
      >
        Sign in
      </button>
      <AuthDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSuccess={(name) => { setUsername(name); setDialogOpen(false); }} />
    </>
  );
}
