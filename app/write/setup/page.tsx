'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  challengeModeOrder,
  getChallengeMode,
  type ChallengeModeKey,
} from '@/lib/config/challengeModes';
import { categories, categoryOrder, type CategoryKey } from '@/lib/config/categories';
import { publishConfig } from '@/lib/config/publishConfig';
import { saveSessionToStorage, type WritingSession } from '@/lib/storage/draftStorage';

const WRITING_PRESETS = [
  "Something I've been putting off",
  'College assignment',
  'Story',
  'Journal entry',
  'Blog post',
  'Research',
  'Personal thoughts',
] as const;

export default function WritingSetupPage() {
  const router = useRouter();
  const [presetTopic, setPresetTopic] = useState<string>('');
  const [customTopic, setCustomTopic] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ChallengeModeKey>('focus');
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>('thoughts');
  const [submitting, setSubmitting] = useState(false);

  const finalTopic = isCustom ? customTopic.trim() : presetTopic;
  const canStart = finalTopic.length > 0 && !submitting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canStart) return;

    setSubmitting(true);
    const session: WritingSession = {
      topic: finalTopic,
      mode: selectedMode,
      category: selectedCategory,
      startedAt: Date.now(),
      elapsedMs: 0,
      content: '',
      wordCount: 0,
      longestStreakMs: 0,
      status: 'writing',
    };
    saveSessionToStorage(session);
    router.push('/write/challenge');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10.5 3 5.5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </Link>
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-ink-faint">
            New challenge
          </span>
        </div>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 md:py-16">
        <h1 className="font-serif text-4xl tracking-tight md:text-5xl">What are you writing?</h1>
        <p className="mt-3 text-ink-muted">
          Pick a starting point or write your own — then choose your pressure.
        </p>

        <form onSubmit={handleSubmit} className="mt-12 space-y-12">
          {/* Topic */}
          <fieldset>
            <legend className="text-sm font-medium text-ink">Topic</legend>
            <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Writing topic presets">
              {WRITING_PRESETS.map((preset) => {
                const selected = !isCustom && presetTopic === preset;
                return (
                  <label
                    key={preset}
                    className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors ${
                      selected
                        ? 'border-ink bg-ink text-paper'
                        : 'border-line-strong bg-surface text-ink-muted hover:border-ink-faint hover:text-ink'
                    }`}
                  >
                    <input
                      type="radio"
                      name="topic"
                      value={preset}
                      checked={selected}
                      onChange={() => {
                        setPresetTopic(preset);
                        setIsCustom(false);
                      }}
                      className="sr-only"
                    />
                    {preset}
                  </label>
                );
              })}
            </div>
            <div className="mt-3">
              <label htmlFor="custom-topic" className="sr-only">
                Custom topic
              </label>
              <input
                id="custom-topic"
                type="text"
                value={isCustom ? customTopic : ''}
                onFocus={() => setIsCustom(true)}
                onChange={(e) => {
                  setIsCustom(true);
                  setCustomTopic(e.target.value);
                }}
                placeholder="Or type your own topic…"
                maxLength={140}
                className={`h-11 w-full rounded-lg border bg-surface px-4 text-base transition-colors placeholder:text-ink-faint ${
                  isCustom ? 'border-ink' : 'border-line-strong'
                }`}
              />
            </div>
          </fieldset>

          {/* Category */}
          <fieldset>
            <legend className="text-sm font-medium text-ink">Category</legend>
            <p className="mt-1 text-sm text-ink-muted">
              Shown publicly if you publish. Nothing is attached to you.
            </p>
            <div
              className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"
              role="radiogroup"
              aria-label="Writing category"
            >
              {categoryOrder.map((key) => {
                const selected = selectedCategory === key;
                return (
                  <label
                    key={key}
                    className={`cursor-pointer rounded-lg border px-4 py-3 text-sm transition-colors ${
                      selected
                        ? 'border-ink bg-surface font-medium text-ink'
                        : 'border-line-strong bg-surface text-ink-muted hover:border-ink-faint hover:text-ink'
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={key}
                      checked={selected}
                      onChange={() => setSelectedCategory(key)}
                      className="sr-only"
                    />
                    {categories[key].label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Mode */}
          <fieldset>
            <legend className="text-sm font-medium text-ink">Pressure</legend>
            <div
              className="mt-3 grid gap-2 sm:grid-cols-3"
              role="radiogroup"
              aria-label="Challenge mode"
            >
              {challengeModeOrder.map((key) => {
                const m = getChallengeMode(key);
                const selected = selectedMode === key;
                return (
                  <label
                    key={key}
                    className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                      selected
                        ? 'border-ink bg-surface'
                        : 'border-line-strong bg-surface hover:border-ink-faint'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      value={key}
                      checked={selected}
                      onChange={() => setSelectedMode(key)}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${selected ? 'text-ink' : 'text-ink-muted'}`}>
                        {m.label}
                      </span>
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: m.color }}
                      />
                    </div>
                    <span className="mt-1 block font-mono text-xs tabular-nums text-ink-faint">
                      {Math.round(m.inactivityThresholdMs / 1000)}s inactivity limit
                    </span>
                  </label>
                );
              })}
            </div>
            <p
              className="mt-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm leading-relaxed text-ink-muted"
              role="note"
            >
              {getChallengeMode(selectedMode).description}.
            </p>
          </fieldset>

          <div className="space-y-3 border-t border-line pt-8">
            <button
              type="submit"
              disabled={!canStart}
              className="inline-flex h-13 w-full items-center justify-center rounded-lg bg-ink px-8 py-3.5 text-base font-medium text-paper transition-colors hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start writing
            </button>
            <p className="text-center text-xs text-ink-faint">
              The timer starts on your first keystroke. Publishing needs{' '}
              {publishConfig.minWordCount}+ words — but only if you choose to.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}

