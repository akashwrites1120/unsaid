/**
 * Category Configuration
 * Single source of truth for writing categories.
 * Add new categories here without touching feed logic.
 */

export type CategoryKey =
  | 'thoughts'
  | 'stories'
  | 'journal'
  | 'academic'
  | 'confession'
  | 'ideas'
  | 'other';

export interface CategoryConfig {
  key: CategoryKey;
  label: string;
  emoji: string;
  description: string;
}

export const categories: Record<CategoryKey, CategoryConfig> = {
  thoughts: {
    key: 'thoughts',
    label: 'Thoughts',
    emoji: '💭',
    description: 'Personal reflections and musings',
  },
  stories: {
    key: 'stories',
    label: 'Stories',
    emoji: '📖',
    description: 'Fiction, narratives, creative writing',
  },
  journal: {
    key: 'journal',
    label: 'Journal',
    emoji: '📝',
    description: 'Daily entries, personal logs',
  },
  academic: {
    key: 'academic',
    label: 'Academic',
    emoji: '🎓',
    description: 'Assignments, research, papers',
  },
  confession: {
    key: 'confession',
    label: 'Confession',
    emoji: '❤️',
    description: 'Things you\'ve been holding back',
  },
  ideas: {
    key: 'ideas',
    label: 'Ideas',
    emoji: '💡',
    description: 'Sparks, concepts, brainstorms',
  },
  other: {
    key: 'other',
    label: 'Other',
    emoji: '🗣️',
    description: 'Anything that doesn\'t fit above',
  },
};

export const categoryOrder: CategoryKey[] = [
  'thoughts',
  'stories',
  'journal',
  'academic',
  'confession',
  'ideas',
  'other',
];

export function getCategory(key: CategoryKey): CategoryConfig {
  return categories[key];
}

export function getDefaultCategory(): CategoryConfig {
  return categories.thoughts;
}