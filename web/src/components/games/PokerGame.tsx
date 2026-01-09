"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

// Types matching the backend
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
type PokerAction = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';
type BettingRound = 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';
type PlayerStatus = 'active' | 'folded' | 'all-in' | 'out';

interface Card {
  suit: Suit;
  rank: Rank;
}

interface PlayerState {
  userId: string;
  chips: number;
  betThisRound: number;
  totalBetThisHand: number;
  status: PlayerStatus;
  holeCards: Card[];
  handRank?: {
    name: string;
    rank: number;
    cards: Card[];
  };
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  lastAction?: PokerAction;
}

interface PokerState {
  players: PlayerState[];
  communityCards: Card[];
  currentBettingRound: BettingRound;
  pot: number;
  currentPlayerIndex: number;
  minimumBet: number;
  isHandComplete: boolean;
  winnerIds?: string[];
  showdownRevealed?: boolean;
  lastWinnings?: { [userId: string]: number };
  actionHistory?: { userId: string; action: PokerAction; amount?: number }[];
}

interface PokerGameProps {
  gameState: PokerState;
  odUserId: string;
  onAction: (action: PokerAction, amount?: number) => void;
  onStartNewHand: () => void;
}

// Confirmation Modal Component
function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  confirmText, 
  onConfirm, 
  onCancel,
  variant = 'default'
}: { 
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger';
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-xl p-6 max-w-sm mx-4 shadow-2xl border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-300 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              variant === 'danger' 
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-purple-600 hover:bg-purple-500 text-white'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Card component with proper size scaling
function CardComponent({ card, hidden = false, size = 'normal' }: { card?: Card; hidden?: boolean; size?: 'small' | 'normal' | 'large' }) {
  if (!card) return null;

  const sizeClasses = {
    small: 'w-8 h-11 text-xs',
    normal: 'w-12 h-16 text-sm',
    large: 'w-16 h-24 text-base'
  };

  const suitSizeClasses = {
    small: 'text-sm',
    normal: 'text-xl',
    large: 'text-2xl'
  };

  const suitSymbols: Record<Suit, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };

  const suitColors: Record<Suit, string> = {
    hearts: 'text-red-600',
    diamonds: 'text-red-600',
    clubs: 'text-gray-900',
    spades: 'text-gray-900'
  };

  if (hidden) {
    return (
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-800 to-blue-950 border-2 border-blue-600 rounded-lg flex items-center justify-center shadow-lg`}>
        <div className="text-blue-400 text-lg font-bold">?</div>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} bg-white border-2 border-gray-200 rounded-lg shadow-md flex flex-col items-center justify-center p-1`}>
      <div className={`font-bold ${suitColors[card.suit]}`}>{card.rank}</div>
      <div className={`${suitSizeClasses[size]} ${suitColors[card.suit]}`}>{suitSymbols[card.suit]}</div>
    </div>
  );
}

// Action badge component
function ActionBadge({ action }: { action?: PokerAction }) {
  if (!action) return null;

  const actionConfig: Record<PokerAction, { text: string; color: string }> = {
    'fold': { text: 'Folded', color: 'bg-red-500' },
    'check': { text: 'Check', color: 'bg-blue-500' },
    'call': { text: 'Call', color: 'bg-yellow-500' },
    'bet': { text: 'Bet', color: 'bg-green-500' },
    'raise': { text: 'Raise', color: 'bg-orange-500' },
    'all-in': { text: 'ALL-IN', color: 'bg-purple-500' },
  };

  const config = actionConfig[action];
  return (
    <span className={`${config.color} text-white text-xs px-2 py-0.5 rounded-full font-medium`}>
      {config.text}
    </span>
  );
}

// Loading spinner
function LoadingSpinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

export default function PokerGame({ gameState, odUserId, onAction, onStartNewHand }: PokerGameProps) {
  const [betAmount, setBetAmount] = useState(0);
  const [showBetInput, setShowBetInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAllInConfirm, setShowAllInConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  
  // Track the last action count to detect state changes
  const [lastActionCount, setLastActionCount] = useState(0);

  // Reset states when hand completes or bet input closes
  useEffect(() => {
    if (gameState?.isHandComplete || !showBetInput) {
      setBetAmount(0);
    }
  }, [gameState?.isHandComplete, showBetInput]);

  // Clear processing state when we receive a new state (action count changed)
  // This is more reliable than checking turn - always reset when state changes
  useEffect(() => {
    const currentPlayerIndex = gameState?.currentPlayerIndex;
    const playerAtCurrentIndex = currentPlayerIndex !== undefined && 
      currentPlayerIndex >= 0 && 
      currentPlayerIndex < (gameState?.players?.length || 0) 
        ? gameState?.players[currentPlayerIndex] 
        : null;
    const playerAtTurn = playerAtCurrentIndex?.userId === odUserId;
    
    // Calculate a state fingerprint based on pot and action history length
    // This helps detect when the state has actually changed
    const currentActionCount = gameState?.actionHistory?.length || 0;
    
    console.log('[PokerGame] ===== STATE UPDATE =====');
    console.log('[PokerGame] My userId:', odUserId?.slice(-6));
    console.log('[PokerGame] currentPlayerIndex:', currentPlayerIndex);
    console.log('[PokerGame] Player at index:', playerAtCurrentIndex?.userId?.slice(-6), '- status:', playerAtCurrentIndex?.status);
    console.log('[PokerGame] Is it my turn?:', playerAtTurn);
    console.log('[PokerGame] isProcessing:', isProcessing);
    console.log('[PokerGame] isHandComplete:', gameState?.isHandComplete);
    console.log('[PokerGame] actionCount:', currentActionCount, 'lastActionCount:', lastActionCount);
    console.log('[PokerGame] Players:', gameState?.players?.map((p, i) => `[${i}] ${p.userId.slice(-6)} (${p.status}, bet=${p.betThisRound})`).join(' | '));
    
    // If action count changed, state was updated - always reset processing
    if (currentActionCount !== lastActionCount) {
      console.log('[PokerGame] Action count changed - resetting isProcessing');
      setIsProcessing(false);
      setLastActionCount(currentActionCount);
    } else if (isProcessing && !playerAtTurn) {
      // Fallback: if turn changed but action count didn't (shouldn't happen normally)
      console.log('[PokerGame] Turn changed - resetting isProcessing');
      setIsProcessing(false);
    }
  }, [gameState, odUserId, isProcessing, lastActionCount]);

  // Timeout fallback for processing state (reduced to 3 seconds for better UX)
  useEffect(() => {
    if (isProcessing) {
      const timeout = setTimeout(() => {
        console.warn('[PokerGame] Processing timeout - resetting isProcessing state');
        setIsProcessing(false);
      }, 3000); // 3 second timeout (reduced from 5)
      return () => clearTimeout(timeout);
    }
  }, [isProcessing]);

  // Clear error after timeout
  useEffect(() => {
    if (actionError) {
      const timer = setTimeout(() => setActionError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [actionError]);

  // Add null check
  if (!gameState || !gameState.players || gameState.players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-green-900 p-4 rounded-xl">
        <div className="text-white text-lg">Loading poker game...</div>
      </div>
    );
  }

  // Find current player (me)
  const currentPlayer = gameState.players.find(p => p.userId === odUserId);
  
  // Safe calculation of max bet
  const currentBet = useMemo(() => {
    if (!gameState.players || gameState.players.length === 0) return 0;
    const bets = gameState.players.map(p => p.betThisRound ?? 0);
    return Math.max(...bets, 0);
  }, [gameState.players]);

  // Determine if it's the current player's turn
  const currentPlayerIndex = gameState.currentPlayerIndex;
  const isMyTurn = !gameState.isHandComplete && 
    currentPlayerIndex !== undefined &&
    currentPlayerIndex >= 0 &&
    currentPlayerIndex < gameState.players.length &&
    gameState.players[currentPlayerIndex]?.userId === odUserId &&
    currentPlayer &&
    currentPlayer.status === 'active';
  
  // Calculate actions available (for validation, but buttons will always show)
  const myBet = currentPlayer?.betThisRound || 0;
  const toCall = currentBet - myBet;
  const myChips = currentPlayer?.chips || 0;
  
  // Determine if actions are valid (for enabling/disabling)
  const canCheck = toCall === 0;
  const canCall = toCall > 0;
  const canBet = toCall === 0 && myChips >= gameState.minimumBet;
  const canRaise = toCall > 0 && myChips > toCall;
  const canFold = true; // Always allowed
  const canAllIn = myChips > 0;

  // Get other player
  const otherPlayer = gameState.players.find(p => p.userId !== odUserId);

  // Calculate winnings to display
  const myWinnings = gameState.lastWinnings?.[odUserId] || 0;
  const didIWin = gameState.winnerIds?.includes(odUserId) || false;

  const handleAction = useCallback((action: PokerAction, actionAmount?: number) => {
    if (isProcessing) {
      console.log('[PokerGame] Action already processing, ignoring');
      return;
    }
    
    console.log('[PokerGame] Handling action:', action, actionAmount);
    setIsProcessing(true);
    setActionError(null);
    
    try {
      if ((action === 'bet' || action === 'raise') && !actionAmount) {
        if (betAmount > 0) {
          console.log('[PokerGame] Calling onAction with bet amount:', betAmount);
          onAction(action, betAmount);
          setBetAmount(0);
          setShowBetInput(false);
        } else {
          setActionError('Please enter a bet amount');
          setIsProcessing(false);
        }
      } else if (actionAmount !== undefined) {
        console.log('[PokerGame] Calling onAction with actionAmount:', actionAmount);
        onAction(action, actionAmount);
      } else {
        console.log('[PokerGame] Calling onAction without amount');
        onAction(action);
      }
    } catch (error) {
      console.error('[PokerGame] Error in handleAction:', error);
      setActionError('Failed to send action');
      setIsProcessing(false);
    }
  }, [betAmount, isProcessing, onAction]);

  const handleAllInConfirm = useCallback(() => {
    setShowAllInConfirm(false);
    handleAction('all-in');
  }, [handleAction]);

  const currentAction = showBetInput ? (canRaise ? 'raise' : 'bet') : null;

  const handleBetChange = (value: number) => {
    const maxBet = myChips;
    const minBet = gameState.minimumBet;
    setBetAmount(Math.max(minBet, Math.min(maxBet, value)));
  };

  // Initialize bet amount when opening bet input
  const openBetInput = () => {
    setBetAmount(gameState.minimumBet);
    setShowBetInput(true);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isMyTurn || isProcessing || showBetInput || showAllInConfirm) return;
      
      switch (e.key.toLowerCase()) {
        case 'f':
          if (canFold) handleAction('fold');
          break;
        case 'c':
          if (canCall) handleAction('call');
          else if (canCheck) handleAction('check');
          break;
        case 'b':
          if (canBet) openBetInput();
          break;
        case 'r':
          if (canRaise) openBetInput();
          break;
        case 'a':
          if (canAllIn) setShowAllInConfirm(true);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMyTurn, isProcessing, showBetInput, showAllInConfirm, canFold, canCall, canCheck, canBet, canRaise, canAllIn, handleAction]);

  return (
    <div className="flex flex-col bg-gradient-to-b from-green-800 to-green-950 p-4 w-full rounded-xl min-h-[500px]">
      {/* All-In Confirmation Modal */}
      <ConfirmModal
        isOpen={showAllInConfirm}
        title="Go All-In?"
        message={`Are you sure you want to go all-in with ${myChips} chips?`}
        confirmText={`All-In (${myChips})`}
        onConfirm={handleAllInConfirm}
        onCancel={() => setShowAllInConfirm(false)}
        variant="danger"
      />

      <div className="w-full max-w-4xl mx-auto">
        {/* Error Toast */}
        {actionError && (
          <div className="bg-red-600 text-white px-4 py-2 rounded-lg mb-4 text-center animate-pulse">
            {actionError}
          </div>
        )}

        {/* Game Header */}
        <div className="bg-gray-900/80 text-white p-3 rounded-lg mb-4 backdrop-blur">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold">Texas Hold'em</h2>
              <p className="text-sm text-gray-300">
                {gameState.currentBettingRound.replace('-', ' ').toUpperCase()} • Pot: <span className="text-yellow-400 font-bold">{gameState.pot}</span>
              </p>
            </div>
            {gameState.isHandComplete && (
              <button
                onClick={onStartNewHand}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                New Hand
              </button>
            )}
          </div>
        </div>

        {/* Game Table */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Opponent */}
          <div className={`bg-gray-900/70 rounded-lg p-3 ${
            !gameState.isHandComplete && gameState.players[currentPlayerIndex]?.userId === otherPlayer?.userId 
              ? 'ring-2 ring-yellow-400' 
              : ''
          }`}>
            <div className="text-white text-center mb-3">
              <h3 className="font-bold text-sm">Opponent</h3>
              <p className="text-xs text-gray-400">
                <span className="text-yellow-400">{otherPlayer?.chips || 0}</span> chips
              </p>
              {(otherPlayer?.betThisRound || 0) > 0 && (
                <p className="text-xs text-orange-400">Bet: {otherPlayer?.betThisRound}</p>
              )}
              <div className="flex gap-1 justify-center mt-1 flex-wrap">
                {otherPlayer?.isDealer && <span className="bg-yellow-500 text-black text-xs px-1 rounded">D</span>}
                {otherPlayer?.isSmallBlind && <span className="bg-blue-500 text-white text-xs px-1 rounded">SB</span>}
                {otherPlayer?.isBigBlind && <span className="bg-red-500 text-white text-xs px-1 rounded">BB</span>}
                {otherPlayer?.lastAction && <ActionBadge action={otherPlayer.lastAction} />}
              </div>
            </div>
            
            {/* Opponent's cards */}
            <div className="flex gap-1 justify-center min-h-[44px]">
              {otherPlayer?.status === 'folded' ? (
                <div className="text-red-400 font-bold text-sm flex items-center">FOLDED</div>
              ) : otherPlayer?.holeCards && otherPlayer.holeCards.length > 0 ? (
                otherPlayer.holeCards.map((card, idx) => (
                  <CardComponent
                    key={idx}
                    card={card}
                    hidden={!gameState.showdownRevealed}
                    size="small"
                  />
                ))
              ) : (
                <>
                  <CardComponent card={{ suit: 'spades', rank: 'A' }} hidden size="small" />
                  <CardComponent card={{ suit: 'spades', rank: 'A' }} hidden size="small" />
                </>
              )}
            </div>
            
            {otherPlayer?.handRank && gameState.showdownRevealed && (
              <div className="text-center mt-2">
                <p className="text-xs font-bold text-green-400">{otherPlayer.handRank.name}</p>
              </div>
            )}
            
            {otherPlayer?.status === 'all-in' && (
              <div className="text-center mt-1 text-yellow-400 font-bold text-xs animate-pulse">ALL-IN</div>
            )}
          </div>

          {/* Community Cards */}
          <div className="bg-gray-900/50 rounded-lg p-3">
            <div className="text-white text-center mb-2">
              <h3 className="font-bold text-sm">Board</h3>
            </div>
            <div className="flex gap-1 justify-center flex-wrap min-h-[50px] items-center">
              {gameState.communityCards.length > 0 ? (
                gameState.communityCards.map((card, idx) => (
                  <CardComponent key={idx} card={card} size="small" />
                ))
              ) : (
                <div className="text-gray-500 text-xs">Waiting...</div>
              )}
            </div>
          </div>

          {/* You */}
          <div className={`bg-gray-900/70 rounded-lg p-3 ${isMyTurn ? 'ring-2 ring-green-400' : ''}`}>
            <div className="text-white text-center mb-3">
              <h3 className="font-bold text-sm">You</h3>
              <p className="text-xs text-gray-400">
                <span className="text-yellow-400">{myChips}</span> chips
              </p>
              {myBet > 0 && (
                <p className="text-xs text-orange-400">Bet: {myBet}</p>
              )}
              <div className="flex gap-1 justify-center mt-1 flex-wrap">
                {currentPlayer?.isDealer && <span className="bg-yellow-500 text-black text-xs px-1 rounded">D</span>}
                {currentPlayer?.isSmallBlind && <span className="bg-blue-500 text-white text-xs px-1 rounded">SB</span>}
                {currentPlayer?.isBigBlind && <span className="bg-red-500 text-white text-xs px-1 rounded">BB</span>}
                {currentPlayer?.lastAction && <ActionBadge action={currentPlayer.lastAction} />}
              </div>
            </div>
            
            {/* Your cards */}
            <div className="flex gap-1 justify-center">
              {currentPlayer?.holeCards && currentPlayer.holeCards.length > 0 ? (
                currentPlayer.holeCards.map((card, idx) => (
                  <CardComponent key={idx} card={card} size="small" />
                ))
              ) : (
                <div className="text-gray-500 text-xs">Dealing...</div>
              )}
            </div>
            
            {currentPlayer?.handRank && gameState.showdownRevealed && (
              <div className="text-center mt-2">
                <p className="text-xs font-bold text-green-400">{currentPlayer.handRank.name}</p>
              </div>
            )}

            {currentPlayer?.status === 'all-in' && (
              <div className="text-center mt-1 text-yellow-400 font-bold text-xs animate-pulse">ALL-IN</div>
            )}
          </div>
        </div>

        {/* Action Panel */}
        {!gameState.isHandComplete && (
          <div className="bg-gray-900/80 rounded-lg p-4 backdrop-blur">
            <div className="text-white text-center mb-3">
              {isMyTurn ? (
                <>
                  <h3 className="font-bold text-green-400 flex items-center justify-center gap-2">
                    Your Turn
                    {isProcessing && <LoadingSpinner />}
                  </h3>
                  {toCall > 0 && (
                    <p className="text-sm text-gray-300">To call: <span className="text-yellow-400">{Math.min(toCall, myChips)}</span></p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Shortcuts: F=Fold, C=Call/Check, B=Bet, R=Raise, A=All-In
                  </p>
                </>
              ) : currentPlayer?.status === 'all-in' ? (
                <h3 className="font-bold text-yellow-400">You're All-In - Waiting...</h3>
              ) : (
                <h3 className="font-bold text-gray-400">Waiting for opponent...</h3>
              )}
            </div>
            
            {/* Always show action buttons, but disabled when not your turn */}
            {showBetInput && isMyTurn ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-white text-sm block mb-2">
                        {currentAction === 'raise' ? 'Raise Amount' : 'Bet Amount'}
                      </label>
                      <input
                        type="number"
                        min={gameState.minimumBet}
                        max={myChips}
                        value={betAmount}
                        onChange={(e) => handleBetChange(Number(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && betAmount > 0) {
                            handleAction(currentAction!);
                          } else if (e.key === 'Escape') {
                            setShowBetInput(false);
                            setBetAmount(0);
                          }
                        }}
                        className="w-full px-4 py-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-green-500 focus:outline-none"
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleBetChange(gameState.minimumBet)}
                          className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors"
                        >
                          Min
                        </button>
                        <button
                          onClick={() => handleBetChange(Math.floor(gameState.pot / 2))}
                          className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors"
                        >
                          ½ Pot
                        </button>
                        <button
                          onClick={() => handleBetChange(gameState.pot)}
                          className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors"
                        >
                          Pot
                        </button>
                        <button
                          onClick={() => handleBetChange(myChips)}
                          className="flex-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs transition-colors"
                        >
                          Max
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(currentAction!)}
                        disabled={isProcessing || betAmount <= 0}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {isProcessing && <LoadingSpinner />}
                        {currentAction === 'raise' ? 'Raise' : 'Bet'} {betAmount}
                      </button>
                      <button
                        onClick={() => {
                          setShowBetInput(false);
                          setBetAmount(0);
                        }}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap justify-center">
                    {/* Check button - show if no bet to call */}
                    <button
                      onClick={() => handleAction('check')}
                      disabled={!isMyTurn || isProcessing || !canCheck}
                      className={`${isMyTurn && canCheck ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 opacity-50 cursor-not-allowed'} text-white px-5 py-2 rounded font-medium transition-colors flex items-center gap-2`}
                    >
                      {isProcessing && <LoadingSpinner />}
                      Check
                    </button>
                    
                    {/* Call button - show if there's a bet to call */}
                    <button
                      onClick={() => handleAction('call')}
                      disabled={!isMyTurn || isProcessing || !canCall}
                      className={`${isMyTurn && canCall ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-600 opacity-50 cursor-not-allowed'} text-white px-5 py-2 rounded font-medium transition-colors flex items-center gap-2`}
                    >
                      {isProcessing && <LoadingSpinner />}
                      Call {toCall > 0 ? Math.min(toCall, myChips) : ''}
                    </button>
                    
                    {/* Bet button - show if no bet to call */}
                    <button
                      onClick={openBetInput}
                      disabled={!isMyTurn || isProcessing || !canBet}
                      className={`${isMyTurn && canBet ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 opacity-50 cursor-not-allowed'} text-white px-5 py-2 rounded font-medium transition-colors`}
                    >
                      Bet
                    </button>
                    
                    {/* Raise button - show if there's a bet to call */}
                    <button
                      onClick={openBetInput}
                      disabled={!isMyTurn || isProcessing || !canRaise}
                      className={`${isMyTurn && canRaise ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-600 opacity-50 cursor-not-allowed'} text-white px-5 py-2 rounded font-medium transition-colors`}
                    >
                      Raise
                    </button>
                    
                    {/* Fold button - always available */}
                    <button
                      onClick={() => handleAction('fold')}
                      disabled={!isMyTurn || isProcessing}
                      className={`${isMyTurn ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 opacity-50 cursor-not-allowed'} text-white px-5 py-2 rounded font-medium transition-colors flex items-center gap-2`}
                    >
                      {isProcessing && <LoadingSpinner />}
                      Fold
                    </button>
                    
                    {/* All-In button - always available if you have chips */}
                    <button
                      onClick={() => setShowAllInConfirm(true)}
                      disabled={!isMyTurn || isProcessing || !canAllIn}
                      className={`${isMyTurn && canAllIn ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 opacity-50 cursor-not-allowed'} text-white px-5 py-2 rounded font-medium transition-colors`}
                    >
                      All-In ({myChips})
                    </button>
                  </div>
                )}
          </div>
        )}

        {/* Hand Result */}
        {gameState.isHandComplete && gameState.winnerIds && (
          <div className={`mt-4 p-4 rounded-lg text-center ${didIWin ? 'bg-green-600' : 'bg-red-600'}`}>
            <h3 className="text-xl font-bold text-white">
              {didIWin ? '🎉 You Won!' : '😔 You Lost'}
            </h3>
            {didIWin && myWinnings > 0 && (
              <p className="text-lg text-white">+{myWinnings} chips</p>
            )}
            {gameState.showdownRevealed && currentPlayer?.handRank && (
              <p className="text-sm text-white/80 mt-1">Your hand: {currentPlayer.handRank.name}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
