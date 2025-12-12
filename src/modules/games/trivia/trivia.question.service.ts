import { Injectable } from '@nestjs/common';
import { TriviaQuestion, Category, Difficulty } from './trivia.types';
import { CATEGORIES, OPENTDB_API_BASE, DIFFICULTY_CONFIG } from './trivia.constants';

interface OpenTDBResult {
  response_code: number;
  results: {
    category: string;
    type: 'multiple' | 'boolean';
    difficulty: 'easy' | 'medium' | 'hard';
    question: string;
    correct_answer: string;
    incorrect_answers: string[];
  }[];
}

@Injectable()
export class TriviaQuestionService {
  constructor() {}

  /**
   * Decode HTML entities from API responses
   */
  private decodeHtml(html: string): string {
    return html
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get questions from Open Trivia DB API
   */
  async getQuestions(
    count: number,
    category?: Category | 'mixed',
    difficulty?: Difficulty | 'mixed'
  ): Promise<TriviaQuestion[]> {
    try {
      // Build API URL
      const params = new URLSearchParams();
      params.append('amount', count.toString());
      params.append('type', 'multiple'); // Always multiple choice

      if (category && category !== 'mixed' && CATEGORIES[category as Category]?.apiId) {
        params.append('category', CATEGORIES[category as Category].apiId!.toString());
      }

      if (difficulty && difficulty !== 'mixed') {
        params.append('difficulty', difficulty as Difficulty);
      }

      const url = `${OPENTDB_API_BASE}?${params.toString()}`;
      
      // Fetch from API using native fetch
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: OpenTDBResult = await response.json();
      
      if (data.response_code !== 0) {
        throw new Error(`Open Trivia DB API error: response_code ${data.response_code}`);
      }

      // Convert to TriviaQuestion format
      const questions: TriviaQuestion[] = data.results.map((q, index) => {
        // Decode HTML entities
        const decodedQuestion = this.decodeHtml(q.question);
        const decodedCorrect = this.decodeHtml(q.correct_answer);
        const decodedIncorrect = q.incorrect_answers.map(a => this.decodeHtml(a));

        // Combine and shuffle answers
        const allAnswers = this.shuffle([decodedCorrect, ...decodedIncorrect]);

        // Map category string to our Category type
        let mappedCategory: Category = 'general';
        for (const [key, value] of Object.entries(CATEGORIES)) {
          if (q.category.includes(value.name) || value.name.includes(q.category)) {
            mappedCategory = key as Category;
            break;
          }
        }

        // Get time limit based on difficulty
        const difficultyKey = q.difficulty as Difficulty;
        const timeLimit = DIFFICULTY_CONFIG[difficultyKey]?.timeLimit || 20;

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
    } catch (error: any) {
      console.error('Error fetching questions from Open Trivia DB:', error.message);
      
      // Fallback: return some default questions if API fails
      return this.getFallbackQuestions(count);
    }
  }

  /**
   * Fallback questions if API is unavailable
   */
  private getFallbackQuestions(count: number): TriviaQuestion[] {
    const fallbackQuestions: TriviaQuestion[] = [
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

    // Return requested count (repeat if needed)
    const shuffled = this.shuffle([...fallbackQuestions]);
    return shuffled.slice(0, Math.min(count, fallbackQuestions.length));
  }

  /**
   * Shuffle answers for a question (ensures correct answer position is random)
   */
  shuffleAnswers(question: TriviaQuestion): TriviaQuestion {
    return {
      ...question,
      allAnswers: this.shuffle([
        question.correctAnswer,
        ...question.incorrectAnswers,
      ]),
    };
  }
}

