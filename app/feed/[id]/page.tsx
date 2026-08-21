'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { categories, type CategoryKey } from '@/lib/config/categories';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Writing {
  id: string;
  content: string;
  wordCount: number;
  category: CategoryKey;
  challengeMode: string;
  challengeDuration: number;
  createdAt: string;
}

export default function WritingDetailPage({ params }: { params: { id: string } }) {
  const [writing, setWriting] = useState<Writing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWriting();
  }, [params.id]);

  const fetchWriting = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/writings/${params.id}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Writing not found');
        } else {
          throw new Error('Failed to fetch writing');
        }
        return;
      }

      const data = await response.json();
      setWriting(data);
    } catch (error) {
      console.error('Error fetching writing:', error);
      setError('Failed to load writing');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  if (error || !writing) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Writing not found'}
          </h1>
          <Link
            href="/feed"
            className="inline-block px-6 py-3 text-white bg-gray-900 hover:bg-gray-800 transition-colors rounded-none"
          >
            Back to Feed
          </Link>
        </div>
      </main>
    );
  }

  const category = categories[writing.category];
  const mode = writing.challengeMode.charAt(0).toUpperCase() + writing.challengeMode.slice(1);
  const minutes = Math.round(writing.challengeDuration / 60000);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/feed"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span>←</span>
              <span>Back to Feed</span>
            </Link>
            <Link
              href="/write/setup"
              className="px-4 py-2 text-white bg-gray-900 hover:bg-gray-800 transition-colors rounded-none"
            >
              Write Something
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Writing header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{category.emoji}</span>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {category.label}
                </h1>
                <div className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(writing.createdAt), {
                    addSuffix: true,
                    locale: zhCN,
                  })}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {writing.wordCount} words
              </div>
              <div className="text-xs text-gray-500">
                {mode} · {minutes}m challenge
              </div>
            </div>
          </div>
        </div>

        {/* Writing content */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6">
          <div className="prose prose-gray max-w-none">
            <div className="text-gray-900 leading-relaxed whitespace-pre-wrap">
              {writing.content}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>
            This writing was shared anonymously as part of a writing challenge.
          </p>
          <p className="mt-2">
            Want to share your own story?{' '}
            <Link
              href="/write/setup"
              className="text-gray-900 hover:underline font-medium"
            >
              Start writing
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}