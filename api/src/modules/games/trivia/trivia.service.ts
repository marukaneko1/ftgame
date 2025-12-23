import { Injectable } from "@nestjs/common";
import { TriviaState, TriviaQuestion, TriviaConfig, TriviaAnswer, TriviaPlayer, TriviaTheme } from "./trivia.types";

// Trivia questions organized by theme
const QUESTIONS_BY_THEME: Record<string, TriviaQuestion[]> = {
  geography: [
    { question: "What is the capital of France?", allAnswers: ["London", "Berlin", "Paris", "Madrid"], correctAnswer: "Paris", category: "geography" },
    { question: "Which ocean is the largest?", allAnswers: ["Atlantic", "Indian", "Arctic", "Pacific"], correctAnswer: "Pacific", category: "geography" },
    { question: "How many continents are there?", allAnswers: ["5", "6", "7", "8"], correctAnswer: "7", category: "geography" },
    { question: "What is the longest river in the world?", allAnswers: ["Amazon", "Nile", "Mississippi", "Yangtze"], correctAnswer: "Nile", category: "geography" },
    { question: "Which country is known as the Land of the Rising Sun?", allAnswers: ["China", "South Korea", "Japan", "Thailand"], correctAnswer: "Japan", category: "geography" },
    { question: "What is the smallest country in the world?", allAnswers: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"], correctAnswer: "Vatican City", category: "geography" },
    { question: "Which mountain is the tallest in the world?", allAnswers: ["K2", "Mount Everest", "Kangchenjunga", "Lhotse"], correctAnswer: "Mount Everest", category: "geography" },
    { question: "What is the capital of Australia?", allAnswers: ["Sydney", "Melbourne", "Canberra", "Brisbane"], correctAnswer: "Canberra", category: "geography" },
    { question: "Which desert is the largest in the world?", allAnswers: ["Gobi", "Sahara", "Arabian", "Antarctic"], correctAnswer: "Antarctic", category: "geography" },
    { question: "What is the capital of Brazil?", allAnswers: ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador"], correctAnswer: "Brasília", category: "geography" },
    { question: "Which country has the most time zones?", allAnswers: ["Russia", "United States", "France", "China"], correctAnswer: "France", category: "geography" },
    { question: "What is the deepest ocean trench?", allAnswers: ["Puerto Rico Trench", "Mariana Trench", "Tonga Trench", "Kuril-Kamchatka Trench"], correctAnswer: "Mariana Trench", category: "geography" },
    { question: "Which city is known as the Big Apple?", allAnswers: ["Chicago", "Los Angeles", "New York", "Boston"], correctAnswer: "New York", category: "geography" },
    { question: "What is the capital of Canada?", allAnswers: ["Toronto", "Vancouver", "Ottawa", "Montreal"], correctAnswer: "Ottawa", category: "geography" },
    { question: "Which country is shaped like a boot?", allAnswers: ["Greece", "Italy", "Spain", "Portugal"], correctAnswer: "Italy", category: "geography" }
  ],
  science: [
    { question: "Which planet is known as the Red Planet?", allAnswers: ["Venus", "Mars", "Jupiter", "Saturn"], correctAnswer: "Mars", category: "science" },
    { question: "What is the chemical symbol for gold?", allAnswers: ["Go", "Gd", "Au", "Ag"], correctAnswer: "Au", category: "science" },
    { question: "What is the speed of light in vacuum?", allAnswers: ["300,000 km/s", "150,000 km/s", "450,000 km/s", "600,000 km/s"], correctAnswer: "300,000 km/s", category: "science" },
    { question: "How many bones are in the human body?", allAnswers: ["196", "206", "216", "226"], correctAnswer: "206", category: "science" },
    { question: "What is the hardest natural substance on Earth?", allAnswers: ["Gold", "Iron", "Diamond", "Platinum"], correctAnswer: "Diamond", category: "science" },
    { question: "What gas do plants absorb from the atmosphere?", allAnswers: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], correctAnswer: "Carbon Dioxide", category: "science" },
    { question: "What is the smallest unit of matter?", allAnswers: ["Molecule", "Atom", "Electron", "Proton"], correctAnswer: "Atom", category: "science" },
    { question: "How many planets are in our solar system?", allAnswers: ["7", "8", "9", "10"], correctAnswer: "8", category: "science" },
    { question: "What is the most abundant gas in Earth's atmosphere?", allAnswers: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Argon"], correctAnswer: "Nitrogen", category: "science" },
    { question: "What is the freezing point of water in Celsius?", allAnswers: ["-32", "0", "32", "100"], correctAnswer: "0", category: "science" },
    { question: "What is the largest organ in the human body?", allAnswers: ["Liver", "Lungs", "Skin", "Intestines"], correctAnswer: "Skin", category: "science" },
    { question: "How many chromosomes do humans have?", allAnswers: ["42", "44", "46", "48"], correctAnswer: "46", category: "science" },
    { question: "What is the chemical formula for water?", allAnswers: ["H2O", "CO2", "O2", "NaCl"], correctAnswer: "H2O", category: "science" },
    { question: "What is the closest star to Earth?", allAnswers: ["Alpha Centauri", "The Sun", "Sirius", "Proxima Centauri"], correctAnswer: "The Sun", category: "science" },
    { question: "What is the pH of pure water?", allAnswers: ["6", "7", "8", "9"], correctAnswer: "7", category: "science" }
  ],
  history: [
    { question: "What year did World War II end?", allAnswers: ["1943", "1944", "1945", "1946"], correctAnswer: "1945", category: "history" },
    { question: "Who was the first President of the United States?", allAnswers: ["Thomas Jefferson", "John Adams", "George Washington", "Benjamin Franklin"], correctAnswer: "George Washington", category: "history" },
    { question: "In which year did the Berlin Wall fall?", allAnswers: ["1987", "1988", "1989", "1990"], correctAnswer: "1989", category: "history" },
    { question: "Which ancient civilization built the pyramids?", allAnswers: ["Greeks", "Romans", "Egyptians", "Mayans"], correctAnswer: "Egyptians", category: "history" },
    { question: "What year did the Titanic sink?", allAnswers: ["1910", "1911", "1912", "1913"], correctAnswer: "1912", category: "history" },
    { question: "Who painted the Mona Lisa?", allAnswers: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"], correctAnswer: "Leonardo da Vinci", category: "history" },
    { question: "In which year did the American Civil War end?", allAnswers: ["1863", "1864", "1865", "1866"], correctAnswer: "1865", category: "history" },
    { question: "Who was known as the Iron Lady?", allAnswers: ["Angela Merkel", "Margaret Thatcher", "Indira Gandhi", "Golda Meir"], correctAnswer: "Margaret Thatcher", category: "history" },
    { question: "What year did the first moon landing occur?", allAnswers: ["1967", "1968", "1969", "1970"], correctAnswer: "1969", category: "history" },
    { question: "Which empire was ruled by Julius Caesar?", allAnswers: ["Greek", "Roman", "Byzantine", "Ottoman"], correctAnswer: "Roman", category: "history" },
    { question: "What year did the French Revolution begin?", allAnswers: ["1787", "1788", "1789", "1790"], correctAnswer: "1789", category: "history" },
    { question: "Who wrote the Declaration of Independence?", allAnswers: ["George Washington", "Benjamin Franklin", "Thomas Jefferson", "John Adams"], correctAnswer: "Thomas Jefferson", category: "history" },
    { question: "In which year did World War I begin?", allAnswers: ["1912", "1913", "1914", "1915"], correctAnswer: "1914", category: "history" },
    { question: "Which pharaoh's tomb was discovered in 1922?", allAnswers: ["Cleopatra", "Ramesses II", "Tutankhamun", "Nefertiti"], correctAnswer: "Tutankhamun", category: "history" },
    { question: "What year did the Cold War end?", allAnswers: ["1989", "1990", "1991", "1992"], correctAnswer: "1991", category: "history" }
  ],
  sports: [
    { question: "How many players are on a basketball team on the court?", allAnswers: ["4", "5", "6", "7"], correctAnswer: "5", category: "sports" },
    { question: "Which sport is played at Wimbledon?", allAnswers: ["Golf", "Tennis", "Cricket", "Rugby"], correctAnswer: "Tennis", category: "sports" },
    { question: "How many innings are in a standard baseball game?", allAnswers: ["7", "8", "9", "10"], correctAnswer: "9", category: "sports" },
    { question: "Which country won the 2018 FIFA World Cup?", allAnswers: ["Brazil", "Germany", "France", "Argentina"], correctAnswer: "France", category: "sports" },
    { question: "What is the maximum score in a single frame of bowling?", allAnswers: ["20", "25", "30", "10"], correctAnswer: "30", category: "sports" },
    { question: "How many holes are in a standard golf course?", allAnswers: ["16", "17", "18", "19"], correctAnswer: "18", category: "sports" },
    { question: "Which sport uses a shuttlecock?", allAnswers: ["Tennis", "Badminton", "Volleyball", "Squash"], correctAnswer: "Badminton", category: "sports" },
    { question: "How many players are on a soccer team on the field?", allAnswers: ["10", "11", "12", "13"], correctAnswer: "11", category: "sports" },
    { question: "What is the distance of a marathon in miles?", allAnswers: ["24.2", "25.2", "26.2", "27.2"], correctAnswer: "26.2", category: "sports" },
    { question: "Which sport is known as 'the beautiful game'?", allAnswers: ["Basketball", "Soccer", "Tennis", "Golf"], correctAnswer: "Soccer", category: "sports" },
    { question: "How many rings are in the Olympic symbol?", allAnswers: ["4", "5", "6", "7"], correctAnswer: "5", category: "sports" },
    { question: "Which country hosted the 2016 Summer Olympics?", allAnswers: ["China", "Brazil", "Russia", "Japan"], correctAnswer: "Brazil", category: "sports" },
    { question: "What is the highest score possible in a single dart throw?", allAnswers: ["50", "60", "100", "180"], correctAnswer: "180", category: "sports" },
    { question: "How many players are on an ice hockey team on the ice?", allAnswers: ["5", "6", "7", "8"], correctAnswer: "6", category: "sports" },
    { question: "Which sport uses a net and a ball but no racket?", allAnswers: ["Tennis", "Volleyball", "Badminton", "Squash"], correctAnswer: "Volleyball", category: "sports" }
  ],
  entertainment: [
    { question: "Who wrote 'Romeo and Juliet'?", allAnswers: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"], correctAnswer: "William Shakespeare", category: "entertainment" },
    { question: "Which movie won the Academy Award for Best Picture in 2020?", allAnswers: ["1917", "Joker", "Parasite", "Once Upon a Time in Hollywood"], correctAnswer: "Parasite", category: "entertainment" },
    { question: "What is the highest-grossing film of all time?", allAnswers: ["Avatar", "Avengers: Endgame", "Titanic", "Star Wars: The Force Awakens"], correctAnswer: "Avatar", category: "entertainment" },
    { question: "Which band sang 'Bohemian Rhapsody'?", allAnswers: ["The Beatles", "Queen", "Led Zeppelin", "Pink Floyd"], correctAnswer: "Queen", category: "entertainment" },
    { question: "How many Harry Potter books are there?", allAnswers: ["6", "7", "8", "9"], correctAnswer: "7", category: "entertainment" },
    { question: "Which TV show features the character Walter White?", allAnswers: ["The Sopranos", "Breaking Bad", "Game of Thrones", "The Wire"], correctAnswer: "Breaking Bad", category: "entertainment" },
    { question: "Who directed the movie 'Inception'?", allAnswers: ["Steven Spielberg", "Christopher Nolan", "Martin Scorsese", "Quentin Tarantino"], correctAnswer: "Christopher Nolan", category: "entertainment" },
    { question: "Which musical instrument has 88 keys?", allAnswers: ["Organ", "Piano", "Harpsichord", "Accordion"], correctAnswer: "Piano", category: "entertainment" },
    { question: "What is the name of the fictional country in 'The Princess Bride'?", allAnswers: ["Florin", "Guilder", "Genovia", "Aldovia"], correctAnswer: "Florin", category: "entertainment" },
    { question: "Which actor played Jack in 'Titanic'?", allAnswers: ["Brad Pitt", "Leonardo DiCaprio", "Matt Damon", "Tom Cruise"], correctAnswer: "Leonardo DiCaprio", category: "entertainment" },
    { question: "How many seasons does 'Friends' have?", allAnswers: ["8", "9", "10", "11"], correctAnswer: "10", category: "entertainment" },
    { question: "Which video game features the character Mario?", allAnswers: ["Sonic the Hedgehog", "Super Mario Bros", "Donkey Kong", "Zelda"], correctAnswer: "Super Mario Bros", category: "entertainment" },
    { question: "Who painted 'Starry Night'?", allAnswers: ["Pablo Picasso", "Vincent van Gogh", "Claude Monet", "Salvador Dalí"], correctAnswer: "Vincent van Gogh", category: "entertainment" },
    { question: "Which movie features the quote 'May the Force be with you'?", allAnswers: ["Star Trek", "Star Wars", "Guardians of the Galaxy", "The Matrix"], correctAnswer: "Star Wars", category: "entertainment" },
    { question: "What is the name of the coffee shop in 'Friends'?", allAnswers: ["Central Perk", "Central Park", "Coffee Bean", "Starbucks"], correctAnswer: "Central Perk", category: "entertainment" }
  ]
};

const DEFAULT_CONFIG: TriviaConfig = {
  totalQuestions: 10,
  timePerQuestion: 10, // Changed from 30 to 10 seconds
  pointsPerQuestion: {
    correct: 10, // Base points
    speedBonus: 10 // Max speed bonus (so max total is 20 per question)
  }
};

@Injectable()
export class TriviaService {
  private gameStates = new Map<string, TriviaState>();
  private themeSelections = new Map<string, Map<string, string>>(); // gameId -> Map<userId, theme>

  /**
   * Initialize trivia game state with theme selection phase
   */
  initializeState(
    playerIds: string[],
    config?: Partial<TriviaConfig>
  ): TriviaState {
    const finalConfig: TriviaConfig = {
      ...DEFAULT_CONFIG,
      ...config,
      pointsPerQuestion: {
        ...DEFAULT_CONFIG.pointsPerQuestion,
        ...config?.pointsPerQuestion,
      },
    };

    // Initialize players
    const players: TriviaPlayer[] = playerIds.map((id, index) => ({
      odUserId: id,
      displayName: `Player ${index + 1}`, // Will be updated with actual display names
      score: 0
    }));

    const state: TriviaState = {
      phase: "themeSelection",
      currentQuestionIndex: 0,
      questions: [], // Will be populated after theme selection
      players,
      currentAnswers: [],
      playerCount: players.length,
      themeSelections: new Map()
    };

    return state;
  }

  /**
   * Select theme for a player
   */
  selectTheme(gameId: string, userId: string, theme: TriviaTheme): {
    state: TriviaState;
    allPlayersSelected: boolean;
    selectedTheme?: string;
  } {
    const state = this.gameStates.get(gameId);
    if (!state) {
      throw new Error("Game state not found");
    }

    if (state.phase !== "themeSelection") {
      throw new Error("Not in theme selection phase");
    }

    // Store theme selection
    if (!this.themeSelections.has(gameId)) {
      this.themeSelections.set(gameId, new Map());
    }
    this.themeSelections.get(gameId)!.set(userId, theme);

    // Check if all players have selected
    const selections = this.themeSelections.get(gameId)!;
    const allSelected = selections.size >= state.playerCount;

    let finalTheme: string | undefined;
    if (allSelected) {
      // Determine final theme
      const themes = Array.from(selections.values());
      if (themes[0] === themes[1]) {
        // Both selected the same theme
        finalTheme = themes[0];
      } else {
        // Different themes - randomly select one
        finalTheme = themes[Math.floor(Math.random() * themes.length)];
      }

      // Load questions for selected theme
      let questions: TriviaQuestion[] = [];
      if (finalTheme === "mixed") {
        // Mix questions from all themes
        const allQuestions = Object.values(QUESTIONS_BY_THEME).flat();
        questions = this.shuffleArray(allQuestions);
      } else {
        questions = [...(QUESTIONS_BY_THEME[finalTheme] || [])];
      }

      // Shuffle and take the required number
      questions = this.shuffleArray(questions).slice(0, DEFAULT_CONFIG.totalQuestions);

      // Update state with questions and move to countdown
      const updatedState: TriviaState = {
        ...state,
        phase: "countdown",
        questions,
        selectedTheme: finalTheme
      };

      this.gameStates.set(gameId, updatedState);
      return { state: updatedState, allPlayersSelected: true, selectedTheme: finalTheme };
    }

    // Not all players selected yet
    const updatedState: TriviaState = {
      ...state,
      themeSelections: selections
    };
    this.gameStates.set(gameId, updatedState);
    return { state: updatedState, allPlayersSelected: false };
  }

  /**
   * Get theme selections for a game
   */
  getThemeSelections(gameId: string): Map<string, string> | undefined {
    return this.themeSelections.get(gameId);
  }

  /**
   * Start the game (move from countdown to question phase)
   */
  startGame(gameId: string, state?: TriviaState): TriviaState {
    const gameState = state || this.gameStates.get(gameId);
    if (!gameState) {
      throw new Error("Game state not found");
    }

    const startedState: TriviaState = {
      ...gameState,
      phase: "question",
      currentQuestionIndex: 0,
      currentAnswers: []
    };

    this.gameStates.set(gameId, startedState);
    return startedState;
  }

  /**
   * Get current question
   */
  getCurrentQuestion(state: TriviaState): TriviaQuestion | null {
    if (state.currentQuestionIndex >= state.questions.length) {
      return null;
    }
    return state.questions[state.currentQuestionIndex];
  }

  /**
   * Submit an answer
   */
  submitAnswer(
    gameId: string,
    odUserId: string,
    odUserDisplayName: string,
    questionIndex: number,
    answerIndex: number,
    timeToAnswer: number
  ): { state: TriviaState; isNewAnswer: boolean } {
    const state = this.gameStates.get(gameId);
    if (!state) {
      throw new Error("Game state not found");
    }

    // Check if we're in question phase
    if (state.phase !== "question") {
      throw new Error(`Cannot submit answer - game is in ${state.phase} phase`);
    }

    // Allow slight mismatch in question index (in case of race condition)
    // But ensure we're answering the current question
    if (questionIndex !== state.currentQuestionIndex) {
      // If the submitted index is close to current, use current index
      if (Math.abs(questionIndex - state.currentQuestionIndex) <= 1) {
        questionIndex = state.currentQuestionIndex;
      } else {
        throw new Error(`Question index mismatch: submitted ${questionIndex}, current is ${state.currentQuestionIndex}`);
      }
    }

    const question = this.getCurrentQuestion(state);
    if (!question) {
      throw new Error("No current question");
    }

    // Check if user already answered - do this check AFTER getting fresh state
    const existingAnswer = state.currentAnswers.find(a => a.odUserId === odUserId);
    if (existingAnswer) {
      // Return the current state (not the old one)
      return { state, isNewAnswer: false };
    }

    const selectedAnswer = question.allAnswers[answerIndex];
    const isCorrect = selectedAnswer === question.correctAnswer;
    
    // Calculate points: 10 base + speed bonus (max 10) = max 20 per question
    // Wrong answer = 0 points automatically
    let pointsEarned = 0;
    if (isCorrect) {
      const maxTime = 10; // 10 seconds
      const speedMultiplier = Math.max(0, 1 - (timeToAnswer / maxTime));
      const basePoints = 10;
      const speedBonus = Math.floor(10 * speedMultiplier); // Max 10 bonus points
      pointsEarned = basePoints + speedBonus; // Max 20 total
    }

    const answer: TriviaAnswer = {
      odUserId,
      odUserDisplayName,
      selectedAnswer,
      selectedAnswerIndex: answerIndex,
      isCorrect,
      pointsEarned,
      timeToAnswer
    };

    // Update player score
    const updatedPlayers = state.players.map(p => 
      p.odUserId === odUserId
        ? { ...p, score: p.score + pointsEarned }
        : p
    );

    const updatedState: TriviaState = {
      ...state,
      currentAnswers: [...state.currentAnswers, answer],
      players: updatedPlayers
    };

    this.gameStates.set(gameId, updatedState);
    return { state: updatedState, isNewAnswer: true };
  }

  /**
   * Check if all players have answered
   */
  allPlayersAnswered(state: TriviaState): boolean {
    return state.currentAnswers.length >= state.playerCount;
  }

  /**
   * End current question (move to result phase)
   */
  endQuestion(state: TriviaState): TriviaState {
    return {
      ...state,
      phase: "result"
    };
  }

  /**
   * Advance to next question
   */
  advanceToNextQuestion(state: TriviaState): TriviaState {
    const nextIndex = state.currentQuestionIndex + 1;
    
    if (nextIndex >= state.questions.length) {
      // Game over
      return this.endGame(state);
    }

    return {
      ...state,
      phase: "question",
      currentQuestionIndex: nextIndex,
      currentAnswers: []
    };
  }

  /**
   * End the game
   */
  endGame(state: TriviaState): TriviaState {
    return {
      ...state,
      phase: "gameEnd"
    };
  }

  /**
   * Get game end result
   */
  getGameEndResult(state: TriviaState): {
    winnerId: string | null;
    winnerIds: string[];
    isDraw: boolean;
    finalScores: Array<{ odUserId: string; displayName: string; score: number }>;
  } {
    const scores = state.players.map(p => p.score);
    const maxScore = Math.max(...scores);
    const winners = state.players.filter(p => p.score === maxScore);
    const isDraw = winners.length > 1;

    return {
      winnerId: isDraw ? null : winners[0]?.odUserId || null,
      winnerIds: winners.map(w => w.odUserId),
      isDraw,
      finalScores: state.players.map(p => ({
        odUserId: p.odUserId,
        displayName: p.displayName,
        score: p.score
      }))
    };
  }

  /**
   * Get state by game ID
   */
  getState(gameId: string): TriviaState | undefined {
    return this.gameStates.get(gameId);
  }

  /**
   * Set state by game ID
   */
  setState(gameId: string, state: TriviaState): void {
    this.gameStates.set(gameId, state);
  }

  /**
   * Delete state by game ID
   */
  deleteState(gameId: string): void {
    this.gameStates.delete(gameId);
    this.themeSelections.delete(gameId);
  }

  /**
   * Helper: Shuffle array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
