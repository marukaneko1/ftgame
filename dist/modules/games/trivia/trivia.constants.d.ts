import { Category, Difficulty, TriviaConfig } from './trivia.types';
export declare const CATEGORIES: Record<Category, {
    name: string;
    icon: string;
    apiId?: number;
}>;
export declare const DIFFICULTY_CONFIG: Record<Difficulty, {
    stars: number;
    basePoints: number;
    timeLimit: number;
}>;
export declare const DEFAULT_CONFIG: TriviaConfig;
export declare const ALLOWED_QUESTION_COUNTS: number[];
export declare const ALLOWED_TIME_LIMITS: number[];
export declare const BASE_POINTS: {
    easy: number;
    medium: number;
    hard: number;
};
export declare const OPENTDB_API_BASE = "https://opentdb.com/api.php";
//# sourceMappingURL=trivia.constants.d.ts.map