"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriviaQuestionService = void 0;
const common_1 = require("@nestjs/common");
const trivia_constants_1 = require("./trivia.constants");
let TriviaQuestionService = class TriviaQuestionService {
    constructor() { }
    decodeHtml(html) {
        return html
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&apos;/g, "'")
            .replace(/&nbsp;/g, ' ');
    }
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    async getQuestions(count, category, difficulty) {
        try {
            const params = new URLSearchParams();
            params.append('amount', count.toString());
            params.append('type', 'multiple');
            if (category && category !== 'mixed' && trivia_constants_1.CATEGORIES[category]?.apiId) {
                params.append('category', trivia_constants_1.CATEGORIES[category].apiId.toString());
            }
            if (difficulty && difficulty !== 'mixed') {
                params.append('difficulty', difficulty);
            }
            const url = `${trivia_constants_1.OPENTDB_API_BASE}?${params.toString()}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.response_code !== 0) {
                throw new Error(`Open Trivia DB API error: response_code ${data.response_code}`);
            }
            const questions = data.results.map((q, index) => {
                const decodedQuestion = this.decodeHtml(q.question);
                const decodedCorrect = this.decodeHtml(q.correct_answer);
                const decodedIncorrect = q.incorrect_answers.map(a => this.decodeHtml(a));
                const allAnswers = this.shuffle([decodedCorrect, ...decodedIncorrect]);
                let mappedCategory = 'general';
                for (const [key, value] of Object.entries(trivia_constants_1.CATEGORIES)) {
                    if (q.category.includes(value.name) || value.name.includes(q.category)) {
                        mappedCategory = key;
                        break;
                    }
                }
                const difficultyKey = q.difficulty;
                const timeLimit = trivia_constants_1.DIFFICULTY_CONFIG[difficultyKey]?.timeLimit || 20;
                return {
                    id: `opentdb_${Date.now()}_${index}`,
                    category: mappedCategory,
                    difficulty: difficultyKey,
                    question: decodedQuestion,
                    correctAnswer: decodedCorrect,
                    incorrectAnswers: decodedIncorrect,
                    allAnswers,
                    timeLimit,
                };
            });
            return questions;
        }
        catch (error) {
            console.error('Error fetching questions from Open Trivia DB:', error.message);
            return this.getFallbackQuestions(count);
        }
    }
    getFallbackQuestions(count) {
        const fallbackQuestions = [
            {
                id: 'fallback_1',
                category: 'general',
                difficulty: 'easy',
                question: 'What is the capital of France?',
                correctAnswer: 'Paris',
                incorrectAnswers: ['London', 'Berlin', 'Madrid'],
                allAnswers: ['Paris', 'London', 'Berlin', 'Madrid'],
                timeLimit: 20,
            },
            {
                id: 'fallback_2',
                category: 'general',
                difficulty: 'medium',
                question: 'In what year did World War II end?',
                correctAnswer: '1945',
                incorrectAnswers: ['1944', '1946', '1943'],
                allAnswers: ['1945', '1944', '1946', '1943'],
                timeLimit: 25,
            },
            {
                id: 'fallback_3',
                category: 'science',
                difficulty: 'easy',
                question: 'What is the chemical symbol for water?',
                correctAnswer: 'H2O',
                incorrectAnswers: ['CO2', 'O2', 'NaCl'],
                allAnswers: ['H2O', 'CO2', 'O2', 'NaCl'],
                timeLimit: 20,
            },
            {
                id: 'fallback_4',
                category: 'geography',
                difficulty: 'medium',
                question: 'Which is the largest ocean on Earth?',
                correctAnswer: 'Pacific Ocean',
                incorrectAnswers: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'],
                allAnswers: ['Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'],
                timeLimit: 25,
            },
            {
                id: 'fallback_5',
                category: 'entertainment',
                difficulty: 'easy',
                question: 'Which Disney movie features the song "Let It Go"?',
                correctAnswer: 'Frozen',
                incorrectAnswers: ['Tangled', 'Moana', 'Encanto'],
                allAnswers: ['Frozen', 'Tangled', 'Moana', 'Encanto'],
                timeLimit: 20,
            },
        ];
        const shuffled = this.shuffle([...fallbackQuestions]);
        return shuffled.slice(0, Math.min(count, fallbackQuestions.length));
    }
    shuffleAnswers(question) {
        return {
            ...question,
            allAnswers: this.shuffle([
                question.correctAnswer,
                ...question.incorrectAnswers,
            ]),
        };
    }
};
exports.TriviaQuestionService = TriviaQuestionService;
exports.TriviaQuestionService = TriviaQuestionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], TriviaQuestionService);
//# sourceMappingURL=trivia.question.service.js.map