/**
 * Publishing Configuration
 * Single source of truth for publish gates and thresholds.
 */

export const publishConfig = {
  /** Minimum word count required to publish */
  minWordCount: 200,

  /** Whether publishing is enabled (can be toggled for maintenance) */
  enabled: true,
} as const;

export type PublishConfig = typeof publishConfig;