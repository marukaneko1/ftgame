// Poker utility functions using pokersolver library
// @ts-ignore - pokersolver doesn't have type definitions
import { Hand } from 'pokersolver';
import { Card, HandRank, Suit, Rank, HAND_RANKINGS } from './poker.types';

/**
 * Convert our Card format to pokersolver format
 */
function cardToPokerSolver(card: Card): string {
  if (!card || !card.rank || !card.suit) {
    throw new Error(`Invalid card object: ${JSON.stringify(card)}`);
  }
  
  const rankMap: Record<Rank, string> = {
    '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
    '8': '8', '9': '9', '10': 'T', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'
  };
  const suitMap: Record<Suit, string> = {
    'hearts': 'h',
    'diamonds': 'd',
    'clubs': 'c',
    'spades': 's'
  };
  
  const rankStr = rankMap[card.rank];
  const suitStr = suitMap[card.suit];
  
  if (!rankStr || !suitStr) {
    throw new Error(`Invalid card rank or suit: ${card.rank}, ${card.suit}`);
  }
  
  return `${rankStr}${suitStr}`;
}

/**
 * Convert pokersolver format back to our Card format
 * Handles both string format ('Ah') and object format ({ value: 'A', suit: 'h' })
 */
function pokerSolverToCard(cardInput: string | { value?: string; suit?: string; toString?: () => string }): Card {
  let cardStr: string;
  
  // Handle different input types
  if (typeof cardInput === 'string') {
    cardStr = cardInput;
  } else if (cardInput && typeof cardInput === 'object') {
    if (typeof cardInput.toString === 'function') {
      cardStr = cardInput.toString();
    } else if (cardInput.value && cardInput.suit) {
      cardStr = `${cardInput.value}${cardInput.suit}`;
    } else {
      throw new Error(`Invalid card object format: ${JSON.stringify(cardInput)}`);
    }
  } else {
    throw new Error(`Invalid card input type: ${typeof cardInput}`);
  }
  
  // Validate string length
  if (cardStr.length !== 2) {
    throw new Error(`Invalid card string length: ${cardStr}`);
  }
  
  const rankMap: Record<string, Rank> = {
    '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
    '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'
  };
  const suitMap: Record<string, Suit> = {
    'h': 'hearts',
    'd': 'diamonds',
    'c': 'clubs',
    's': 'spades'
  };
  
  const rank = rankMap[cardStr[0].toUpperCase()];
  const suit = suitMap[cardStr[1].toLowerCase()];
  
  if (!rank || !suit) {
    throw new Error(`Invalid card string: ${cardStr}`);
  }
  
  return { rank, suit };
}

/**
 * Evaluate the best 5-card hand from hole cards and community cards
 */
export function evaluateHand(holeCards: Card[], communityCards: Card[]): HandRank {
  // Validate inputs
  if (!holeCards || !Array.isArray(holeCards)) {
    throw new Error('Hole cards must be an array');
  }
  
  if (holeCards.length !== 2) {
    throw new Error(`Must have exactly 2 hole cards, got ${holeCards.length}`);
  }
  
  if (!communityCards || !Array.isArray(communityCards)) {
    throw new Error('Community cards must be an array');
  }
  
  if (communityCards.length < 3 || communityCards.length > 5) {
    throw new Error(`Must have 3-5 community cards, got ${communityCards.length}`);
  }
  
  // Validate all cards have required properties
  const allCards = [...holeCards, ...communityCards];
  for (let i = 0; i < allCards.length; i++) {
    const card = allCards[i];
    if (!card || !card.rank || !card.suit) {
      throw new Error(`Invalid card at index ${i}: ${JSON.stringify(card)}`);
    }
  }
  
  // Convert all cards to pokersolver format
  const pokerSolverCards = allCards.map(cardToPokerSolver);
  
  // Check for duplicate cards (shouldn't happen in a valid game)
  const uniqueCards = new Set(pokerSolverCards);
  if (uniqueCards.size !== pokerSolverCards.length) {
    console.warn('Duplicate cards detected in hand evaluation');
  }
  
  // Use pokersolver to find the best hand
  // @ts-ignore - pokersolver doesn't have type definitions
  const hand = Hand.solve(pokerSolverCards);
  
  if (!hand || !hand.cards) {
    throw new Error('Pokersolver failed to evaluate hand');
  }
  
  // Extract the 5 cards that make up the hand
  const handCards: Card[] = [];
  for (const card of hand.cards) {
    try {
      handCards.push(pokerSolverToCard(card));
    } catch (error) {
      // If card conversion fails, use a fallback approach
      console.error('Failed to convert card:', card, error);
    }
  }
  
  // Ensure we have exactly 5 cards
  while (handCards.length < 5 && holeCards.length > 0) {
    // If conversion failed, fall back to hole cards
    handCards.push(holeCards[handCards.length % holeCards.length]);
  }
  
  // Map pokersolver hand name to our format
  const handName = hand.name || 'High Card';
  const rank = getHandRankFromName(handName);
  
  return {
    name: handName,
    rank,
    cards: handCards.slice(0, 5),
  };
}

/**
 * Compare two hands to determine winner
 * Returns: 1 if hand1 wins, -1 if hand2 wins, 0 if tie
 */
export function compareHands(hand1: HandRank, hand2: HandRank): number {
  // Handle null/undefined cases
  if (!hand1 && !hand2) return 0;
  if (!hand1) return -1;
  if (!hand2) return 1;
  
  // First compare by rank
  if (hand1.rank > hand2.rank) return 1;
  if (hand1.rank < hand2.rank) return -1;
  
  // If same rank and we have cards, compare using pokersolver
  if (hand1.cards?.length >= 5 && hand2.cards?.length >= 5) {
    try {
      const h1Cards = hand1.cards.map(cardToPokerSolver);
      const h2Cards = hand2.cards.map(cardToPokerSolver);
      
      const h1 = Hand.solve(h1Cards);
      const h2 = Hand.solve(h2Cards);
      
      // @ts-ignore - pokersolver doesn't have type definitions
      const winners = Hand.winners([h1, h2]);
      if (!winners || winners.length === 0) return 0;
      if (winners.length === 2) return 0; // Tie
      return winners[0] === h1 ? 1 : -1;
    } catch (error) {
      // Fallback: just compare by rank if pokersolver fails
      console.error('Error comparing hands:', error);
      return 0;
    }
  }
  
  // If we can't compare cards, it's a tie
  return 0;
}

/**
 * Map pokersolver hand name to numeric rank
 */
function getHandRankFromName(name: string): number {
  if (!name) return HAND_RANKINGS.HIGH_CARD;
  
  const nameLower = name.toLowerCase();
  
  // Check in order of highest rank to lowest
  if (nameLower.includes('royal flush')) return HAND_RANKINGS.ROYAL_FLUSH;
  if (nameLower.includes('straight flush')) return HAND_RANKINGS.STRAIGHT_FLUSH;
  if (nameLower.includes('four of a kind') || nameLower.includes('quads')) return HAND_RANKINGS.FOUR_OF_A_KIND;
  if (nameLower.includes('full house') || nameLower.includes('boat')) return HAND_RANKINGS.FULL_HOUSE;
  if (nameLower.includes('flush')) return HAND_RANKINGS.FLUSH;
  if (nameLower.includes('straight')) return HAND_RANKINGS.STRAIGHT;
  if (nameLower.includes('three of a kind') || nameLower.includes('trips') || nameLower.includes('set')) return HAND_RANKINGS.THREE_OF_A_KIND;
  if (nameLower.includes('two pair')) return HAND_RANKINGS.TWO_PAIR;
  if (nameLower.includes('pair')) return HAND_RANKINGS.PAIR;
  
  return HAND_RANKINGS.HIGH_CARD;
}

/**
 * Create a standard 52-card deck
 */
export function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  
  // Verify deck integrity
  if (deck.length !== 52) {
    throw new Error(`Invalid deck size: ${deck.length}`);
  }
  
  return deck;
}

/**
 * Shuffle a deck of cards using Fisher-Yates algorithm
 * Uses crypto-random when available for better randomness
 */
export function shuffleDeck(deck: Card[]): Card[] {
  if (!deck || deck.length === 0) {
    throw new Error('Cannot shuffle empty deck');
  }
  
  const shuffled = [...deck];
  
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Use crypto.getRandomValues if available for better randomness
    let j: number;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const randomBuffer = new Uint32Array(1);
      crypto.getRandomValues(randomBuffer);
      j = randomBuffer[0] % (i + 1);
    } else {
      j = Math.floor(Math.random() * (i + 1));
    }
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Deal cards from deck
 */
export function dealCards(deck: Card[], count: number): { cards: Card[]; remainingDeck: Card[] } {
  if (!deck || !Array.isArray(deck)) {
    throw new Error('Invalid deck');
  }
  
  if (count < 0) {
    throw new Error('Count must be non-negative');
  }
  
  if (deck.length < count) {
    throw new Error(`Not enough cards in deck. Need ${count}, have ${deck.length}`);
  }
  
  const cards = deck.slice(0, count);
  const remainingDeck = deck.slice(count);
  
  return { cards, remainingDeck };
}

/**
 * Validate a deck of cards
 */
export function validateDeck(deck: Card[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!deck || !Array.isArray(deck)) {
    return { valid: false, errors: ['Deck is not an array'] };
  }
  
  // Check for 52 cards
  if (deck.length !== 52) {
    errors.push(`Deck has ${deck.length} cards instead of 52`);
  }
  
  // Check for valid cards
  const suits = new Set(['hearts', 'diamonds', 'clubs', 'spades']);
  const ranks = new Set(['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']);
  
  const seenCards = new Set<string>();
  
  for (let i = 0; i < deck.length; i++) {
    const card = deck[i];
    
    if (!card) {
      errors.push(`Card at index ${i} is null/undefined`);
      continue;
    }
    
    if (!suits.has(card.suit)) {
      errors.push(`Invalid suit at index ${i}: ${card.suit}`);
    }
    
    if (!ranks.has(card.rank)) {
      errors.push(`Invalid rank at index ${i}: ${card.rank}`);
    }
    
    const cardKey = `${card.rank}-${card.suit}`;
    if (seenCards.has(cardKey)) {
      errors.push(`Duplicate card: ${cardKey}`);
    }
    seenCards.add(cardKey);
  }
  
  return { valid: errors.length === 0, errors };
}
