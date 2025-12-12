import { TriviaQuestion, Category, Difficulty } from './trivia.types';
export declare class TriviaQuestionService {
    constructor();
    private decodeHtml;
    private shuffle;
    getQuestions(count: number, category?: Category | 'mixed', difficulty?: Difficulty | 'mixed'): Promise<TriviaQuestion[]>;
    private getFallbackQuestions;
    shuffleAnswers(question: TriviaQuestion): TriviaQuestion;
}
//# sourceMappingURL=trivia.question.service.d.ts.map