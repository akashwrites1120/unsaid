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
  excerpt: string;
  reactionCount?: number;
}

type SortOption = 'recent' | 'popular';

export default function FeedPage() {
  const [writings, setWritings] = useState<Writing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null);
  const [sort, setSort] = useState<SortOption>('recent');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchWritings();
  }, [selectedCategory, sort, currentPage]);

  const fetchWritings = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        sort,
      });

      if (selectedCategory) {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`/api/writings?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch writings');
      }

      const data = await response.json();
      setWritings(data.writings);
    } catch (error) {
      console.error('Error fetching writings:', error);
    } finally {
      setLoading(false);
    }
  };

  const categoryCount = (category: CategoryKey) => {
    return writings.filter(w => w.category === category).length;
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Recent Writings</h1>
            <Link
              href="/write/setup"
              className="px-4 py-2 text-white bg-gray-900 hover:bg-gray-800 transition-colors rounded-none"
            >
              Write Something
            </Link>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === null
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {Object.entries(categories).map(([key, category]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key as CategoryKey)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  selectedCategory === key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{category.emoji}</span>
                <span>{category.label}</span>
                {categoryCount(key as CategoryKey) > 0 && (
                  <span className="text-xs opacity-75">
                    ({categoryCount(key as CategoryKey)})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : writings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No writings yet
            </h2>
            <p className="text-gray-600 mb-6">
              Be the first to share your thoughts with the world.
            </p>
            <Link
              href="/write/setup"
              className="px-6 py-3 text-white bg-gray-900 hover:bg-gray-800 transition-colors rounded-none"
            >
              Start Writing
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {writings.map((writing) => {
              const category = categories[writing.category];
              const mode = writing.challengeMode.charAt(0).toUpperCase() + writing.challengeMode.slice(1);

              return (
                <Link
                  key={writing.id}
                  href={`/feed/${writing.id}`}
                  className="block bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors p-6"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{category.emoji}</span>
                      <div>
                        <div className="font-medium text-gray-900">
                          {category.label}
                        </div>
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
                        {mode} Mode
                      </div>
                    </div>
                  </div>

                  {/* Excerpt */}
                  <div className="text-gray-700 leading-relaxed">
                    {writing.excerpt}
                  </div>

                  {/* Footer */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {Math.round(writing.challengeDuration / 60000)}m challenge
                    </div>
                    <div className="text-sm text-gray-500">
                      Read more →
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}