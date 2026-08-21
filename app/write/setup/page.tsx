'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { challengeModeOrder, getChallengeMode, type ChallengeModeKey } from '@/lib/config/challengeModes';

const WRITING_PRESETS = [
  'College assignment',
  'Story',
  'Journal',
  'Blog',
  'Research',
  'Personal thoughts',
  'Something I\'ve been procrastinating',
] as const;

export default function WritingSetupPage() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [selectedMode, setSelectedMode] = useState<ChallengeModeKey>('focus');
  const [isCustom, setIsCustom] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTopic = isCustom ? customTopic.trim() : topic;
    if (!finalTopic) return;

    // Store in sessionStorage for the challenge screen
    sessionStorage.setItem('writing-session', JSON.stringify({
      topic: finalTopic,
      mode: selectedMode,
      startTime: Date.now(),
      content: '',
    }));

    router.push('/write/challenge');
  };

  const mode = getChallengeMode(selectedMode);

  return (
    <main className="min-h-screen flex flex-col px-6 py-12 bg-white text-gray-900">
      {/* Back link */}
      <Link
        href="/"
        className="self-start text-gray-500 hover:text-gray-900 transition-colors mb-8 text-sm font-mono"
      >
        ← Back
      </Link>

      <div className="max-w-2xl mx-auto w-full space-y-10 flex-1 flex flex-col justify-center">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            What are you writing?
          </h1>
          <p className="text-gray-600 text-lg">
            Pick a preset or write your own. Then choose your pressure level.
          </p>
        </div>

        {/* Topic Selection */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-gray-700 mb-2 block">
              Topic
            </legend>

            {/* Preset chips */}
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Writing topic presets">
              {WRITING_PRESETS.map((preset) => (
                <label
                  key={preset}
                  className={`px-4 py-2 rounded-none border transition-all ${
                    topic === preset && !isCustom
                      ? 'border-gray-900 bg-gray-100 text-gray-900'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900'
                  }`}
                >
                  <input
                    type="radio"
                    name="topic"
                    value={preset}
                    checked={topic === preset && !isCustom}
                    onChange={() => {
                      setTopic(preset);
                      setIsCustom(false);
                      setCustomTopic('');
                    }}
                    className="sr-only"
                    aria-label={preset}
                  />
                  {preset}
                </label>
              ))}
            </div>

            {/* Custom input */}
            <label className="block">
              <input
                type="radio"
                name="topic"
                checked={isCustom}
                onChange={() => setIsCustom(true)}
                className="sr-only"
                aria-label="Custom topic"
              />
              <div className="flex gap-2">
                <span className={`px-4 py-2 rounded-none border transition-all flex-1 ${
                  isCustom
                    ? 'border-gray-900 bg-gray-100'
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    placeholder="Custom topic..."
                    className="bg-transparent border-none outline-none text-gray-900 placeholder:text-gray-400 w-full text-base"
                    disabled={!isCustom}
                    aria-label="Custom writing topic"
                  />
                </span>
              </div>
            </label>
          </fieldset>

          {/* Mode Selector */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-gray-700 mb-2 block">
              Challenge Mode
            </legend>
            <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Challenge mode">
              {challengeModeOrder.map((modeKey) => {
                const m = getChallengeMode(modeKey);
                return (
                  <label
                    key={modeKey}
                    className={`relative p-4 rounded-none border transition-all cursor-pointer ${
                      selectedMode === modeKey
                        ? 'border-gray-900 bg-gray-100 text-gray-900'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      value={modeKey}
                      checked={selectedMode === modeKey}
                      onChange={() => setSelectedMode(modeKey)}
                      className="sr-only"
                      aria-label={m.label}
                    />
                    <div className="text-center">
                      <div className="font-semibold text-lg">{m.label}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {Math.round(m.inactivityThresholdMs / 1000)}s inactivity limit
                      </div>
                    </div>
                    {selectedMode === modeKey && (
                      <div
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gray-900"
                      />
                    )}
                  </label>
                );
              })}
            </div>

            {/* Mode description */}
            <div className="p-4 rounded-none border border-gray-200 bg-gray-50 min-h-[80px] transition-all">
              <p className="text-gray-700 text-sm">{mode.description}</p>
            </div>
          </fieldset>

          {/* Start Button */}
          <button
            type="submit"
            disabled={!topic && !isCustom && !customTopic.trim()}
            className="w-full px-8 py-4 text-lg font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-colors rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Writing
          </button>
        </form>
      </div>
    </main>
  );
}