/**
 * Challenge Mode Configuration
 * Single source of truth for all challenge modes.
 * Add new modes here without touching challenge logic.
 */

export type ChallengeModeKey = 'soft' | 'focus' | 'hard';

export interface ChallengeModeConfig {
  key: ChallengeModeKey;
  label: string;
  description: string;
  inactivityThresholdMs: number;
  color: string; // for UI theming
}

export const challengeModes: Record<ChallengeModeKey, ChallengeModeConfig> = {
  soft: {
    key: 'soft',
    label: 'Soft',
    description: 'Generous inactivity limit — great for getting started',
    inactivityThresholdMs: 30_000, // 30 seconds
    color: '#22c55e', // green-500
  },
  focus: {
    key: 'focus',
    label: 'Focus',
    description: 'Moderate inactivity limit — balanced pressure',
    inactivityThresholdMs: 15_000, // 15 seconds
    color: '#f59e0b', // amber-500
  },
  hard: {
    key: 'hard',
    label: 'Hard',
    description: '5 second inactivity limit — no room to pause',
    inactivityThresholdMs: 5_000, // 5 seconds
    color: '#ef4444', // red-500
  },
};

export const challengeModeOrder: ChallengeModeKey[] = ['soft', 'focus', 'hard'];

export function getChallengeMode(key: ChallengeModeKey): ChallengeModeConfig {
  return challengeModes[key];
}

export function getDefaultChallengeMode(): ChallengeModeConfig {
  return challengeModes.focus;
}