import { Category, Difficulty, TriviaConfig } from './trivia.types';

// Category mapping to Open Trivia DB API
export const CATEGORIES: Record<Category, { name: string; icon: string; apiId?: number }> = {
  general: { name: 'General Knowledge', icon: '🎯', apiId: 9 },
  science: { name: 'Science & Nature', icon: '🔬', apiId: 17 },
  history: { name: 'History', icon: '📜', apiId: 23 },
  geography: { name: 'Geography', icon: '🌍', apiId: 22 },
  entertainment: { name: 'Entertainment', icon: '🎬', apiId: 11 },
  sports: { name: 'Sports', icon: '⚽', apiId: 21 },
  art: { name: 'Art', icon: '🎨', apiId: 25 },
  music: { name: 'Music', icon: '🎵', apiId: 12 },
  movies: { name: 'Film', icon: '🎥', apiId: 11 },
  technology: { name: 'Computers', icon: '💻', apiId: 18 },
};

// Difficulty configuration
export const DIFFICULTY_CONFIG: Record<Difficulty, { stars: number; basePoints: number; timeLimit: number }> = {
  easy: { stars: 1, basePoints: 100, timeLimit: 20 },
  medium: { stars: 2, basePoints: 200, timeLimit: 25 },
  hard: { stars: 3, basePoints: 300, timeLimit: 30 },
};

// Default game configuration
export const DEFAULT_CONFIG: TriviaConfig = {
  questionCount: 10,
  timePerQuestion: 20,
  difficulty: 'mixed',
  category: 'mixed',
  pointsPerQuestion: {
    easy: 100,
    medium: 200,
    hard: 300,
  },
  speedBonusEnabled: true,
  maxSpeedBonus: 50,
};

// Allowed question counts
export const ALLOWED_QUESTION_COUNTS = [5, 10, 15, 20];

// Allowed time limits
export const ALLOWED_TIME_LIMITS = [15, 20, 30];

// Base points multipliers
export const BASE_POINTS = {
  easy: 100,
  medium: 200,
  hard: 300,
};

// Open Trivia DB API base URL
export const OPENTDB_API_BASE = 'https://opentdb.com/api.php';

