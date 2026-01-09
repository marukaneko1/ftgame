// Poker game types - Texas Hold'em

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type PlayerStatus = 'active' | 'folded' | 'all-in' | 'out';
export type BettingRound = 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';
export type PokerAction = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

export interface PlayerState {
  userId: string;
  chips: number; // Current chips in hand
  betThisRound: number; // Amount bet in current betting round
  totalBetThisHand: number; // Total bet in current hand
  status: PlayerStatus;
  holeCards: Card[]; // 2 cards for Texas Hold'em
  handRank?: HandRank; // Evaluated hand rank (only revealed at showdown)
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  lastAction?: PokerAction;
}

export interface HandRank {
  name: string; // e.g., "Pair", "Two Pair", "Flush"
  rank: number; // Numeric rank for comparison (higher is better)
  cards: Card[]; // The 5 cards that make up the hand
  kickers?: Card[]; // Kicker cards for tie-breaking
}

export interface PokerState {
  players: PlayerState[];
  communityCards: Card[];
  deck: Card[];
  currentBettingRound: BettingRound;
  pot: number; // Main pot
  sidePots: SidePot[]; // Side pots for all-in scenarios
  currentPlayerIndex: number; // Index of player whose turn it is
  dealerIndex: number;
  smallBlind: number;
  bigBlind: number;
  minimumBet: number; // Current minimum bet/raise amount
  lastRaiseAmount?: number; // The amount of the last raise (for min-raise calculations)
  handNumber: number;
  startedAt: number;
  actionHistory: PokerActionRecord[];
  isHandComplete: boolean;
  winnerIds?: string[]; // Winners of the current hand
  showdownRevealed?: boolean; // Whether cards have been revealed
  lastWinnings?: { [userId: string]: number }; // Track winnings per player for this hand
}

export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[]; // Players eligible for this pot
}

export interface PokerActionRecord {
  userId: string;
  action: PokerAction;
  amount?: number; // Only for bet/raise/call/all-in actions
  timestamp: number;
  bettingRound: BettingRound;
}

export interface PokerActionRequest {
  gameId: string;
  userId: string;
  action: PokerAction;
  amount?: number; // Required for bet/raise
}

export interface PokerActionResult {
  success: boolean;
  error?: string;
  state?: PokerState;
  handComplete?: boolean;
  winners?: { userId: string; amount: number; handRank: HandRank }[];
  nextAction?: {
    currentPlayerId: string;
    bettingRound: BettingRound;
    minimumBet: number;
  };
}

export interface PokerGameEndResult {
  winnerId: string;
  finalChips: number;
  reason: 'all-opponents-folded' | 'showdown';
  handRank?: HandRank;
}

// Hand ranking constants (higher number = better hand)
export const HAND_RANKINGS = {
  HIGH_CARD: 1,
  PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_A_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9,
  ROYAL_FLUSH: 10,
} as const;

