"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPENTDB_API_BASE = exports.BASE_POINTS = exports.ALLOWED_TIME_LIMITS = exports.ALLOWED_QUESTION_COUNTS = exports.DEFAULT_CONFIG = exports.DIFFICULTY_CONFIG = exports.CATEGORIES = void 0;
exports.CATEGORIES = {
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
exports.DIFFICULTY_CONFIG = {
    easy: { stars: 1, basePoints: 100, timeLimit: 20 },
    medium: { stars: 2, basePoints: 200, timeLimit: 25 },
    hard: { stars: 3, basePoints: 300, timeLimit: 30 },
};
exports.DEFAULT_CONFIG = {
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
exports.ALLOWED_QUESTION_COUNTS = [5, 10, 15, 20];
exports.ALLOWED_TIME_LIMITS = [15, 20, 30];
exports.BASE_POINTS = {
    easy: 100,
    medium: 200,
    hard: 300,
};
exports.OPENTDB_API_BASE = 'https://opentdb.com/api.php';
//# sourceMappingURL=trivia.constants.js.map