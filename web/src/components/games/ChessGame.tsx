"use client";

import { useState, useMemo, useCallback } from "react";

// Types matching the backend
type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
type PieceColor = 'white' | 'black';

interface Piece {
  type: PieceType;
  color: PieceColor;
  hasMoved: boolean;
}

interface Position {
  row: number;
  col: number;
}

interface ChessMove {
  from: Position;
  to: Position;
  piece: Piece;
  capturedPiece?: Piece;
  isCheck?: boolean;
  isCheckmate?: boolean;
  isCastling?: 'kingside' | 'queenside';
  isEnPassant?: boolean;
  promotionPiece?: PieceType;
  notation: string;
}

interface ChessState {
  board: (Piece | null)[][];
  currentTurn: PieceColor;
  playerWhite: string;
  playerBlack: string;
  moveHistory: ChessMove[];
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  drawReason?: string;
  winner?: string | null;
  gameOver: boolean;
}

interface ChessGameProps {
  gameState: ChessState;
  odUserId: string;
  onMove: (from: Position, to: Position, promotionPiece?: PieceType) => void;
  onForfeit: () => void;
}

// Unicode chess pieces
const PIECE_UNICODE: Record<PieceColor, Record<PieceType, string>> = {
  white: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  black: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export default function ChessGame({ gameState, odUserId, onMove, onForfeit }: ChessGameProps) {
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Position; to: Position } | null>(null);
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);

  // Determine player color and turn
  const myColor: PieceColor = gameState.playerWhite === odUserId ? 'white' : 'black';
  const isMyTurn = gameState.currentTurn === myColor && !gameState.gameOver;
  const shouldFlipBoard = myColor === 'black';

  // Get last move for highlighting
  const lastMove = gameState.moveHistory.length > 0 
    ? gameState.moveHistory[gameState.moveHistory.length - 1] 
    : null;

  // Calculate captured pieces
  const capturedPieces = useMemo(() => {
    const captured: { white: Piece[]; black: Piece[] } = { white: [], black: [] };
    for (const move of gameState.moveHistory) {
      if (move.capturedPiece) {
        if (move.capturedPiece.color === 'white') {
          captured.white.push(move.capturedPiece);
        } else {
          captured.black.push(move.capturedPiece);
        }
      }
    }
    return captured;
  }, [gameState.moveHistory]);

  // Simple valid move calculation (frontend validation)
  const calculateValidMoves = useCallback((pos: Position): Position[] => {
    const piece = gameState.board[pos.row][pos.col];
    if (!piece || piece.color !== myColor) return [];
    
    const moves: Position[] = [];
    const directions = {
      rook: [[-1, 0], [1, 0], [0, -1], [0, 1]],
      bishop: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
      knight: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],
      king: [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]],
    };

    const addSlidingMoves = (dirs: number[][]) => {
      for (const [dr, dc] of dirs) {
        let r = pos.row + dr;
        let c = pos.col + dc;
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const target = gameState.board[r][c];
          if (!target) {
            moves.push({ row: r, col: c });
          } else {
            if (target.color !== piece.color) {
              moves.push({ row: r, col: c });
            }
            break;
          }
          r += dr;
          c += dc;
        }
      }
    };

    const addSingleMoves = (dirs: number[][]) => {
      for (const [dr, dc] of dirs) {
        const r = pos.row + dr;
        const c = pos.col + dc;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
          const target = gameState.board[r][c];
          if (!target || target.color !== piece.color) {
            moves.push({ row: r, col: c });
          }
        }
      }
    };

    switch (piece.type) {
      case 'P': {
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;
        // Forward
        const oneForward = { row: pos.row + direction, col: pos.col };
        if (oneForward.row >= 0 && oneForward.row < 8 && !gameState.board[oneForward.row][oneForward.col]) {
          moves.push(oneForward);
          // Two forward from start
          if (pos.row === startRow) {
            const twoForward = { row: pos.row + 2 * direction, col: pos.col };
            if (!gameState.board[twoForward.row][twoForward.col]) {
              moves.push(twoForward);
            }
          }
        }
        // Captures
        for (const dc of [-1, 1]) {
          const r = pos.row + direction;
          const c = pos.col + dc;
          if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const target = gameState.board[r][c];
            if (target && target.color !== piece.color) {
              moves.push({ row: r, col: c });
            }
          }
        }
        break;
      }
      case 'N':
        addSingleMoves(directions.knight);
        break;
      case 'B':
        addSlidingMoves(directions.bishop);
        break;
      case 'R':
        addSlidingMoves(directions.rook);
        break;
      case 'Q':
        addSlidingMoves([...directions.rook, ...directions.bishop]);
        break;
      case 'K':
        addSingleMoves(directions.king);
        // Castling (simplified check)
        if (!piece.hasMoved) {
          // Kingside
          if (!gameState.board[pos.row][5] && !gameState.board[pos.row][6]) {
            const rook = gameState.board[pos.row][7];
            if (rook && rook.type === 'R' && !rook.hasMoved) {
              moves.push({ row: pos.row, col: 6 });
            }
          }
          // Queenside
          if (!gameState.board[pos.row][1] && !gameState.board[pos.row][2] && !gameState.board[pos.row][3]) {
            const rook = gameState.board[pos.row][0];
            if (rook && rook.type === 'R' && !rook.hasMoved) {
              moves.push({ row: pos.row, col: 2 });
            }
          }
        }
        break;
    }

    return moves;
  }, [gameState.board, myColor]);

  // Handle square click
  const handleSquareClick = (row: number, col: number) => {
    if (gameState.gameOver) return;
    if (!isMyTurn) return;

    const clickedPiece = gameState.board[row][col];

    if (selectedSquare) {
      // Check if clicking on a valid move destination
      const isValidMove = validMoves.some(m => m.row === row && m.col === col);
      
      if (isValidMove) {
        const piece = gameState.board[selectedSquare.row][selectedSquare.col];
        // Check for pawn promotion
        if (piece?.type === 'P' && ((myColor === 'white' && row === 0) || (myColor === 'black' && row === 7))) {
          setPendingPromotion({ from: selectedSquare, to: { row, col } });
          setShowPromotionDialog(true);
        } else {
          onMove(selectedSquare, { row, col });
        }
        setSelectedSquare(null);
        setValidMoves([]);
      } else if (clickedPiece && clickedPiece.color === myColor) {
        // Select a different piece
        setSelectedSquare({ row, col });
        setValidMoves(calculateValidMoves({ row, col }));
      } else {
        // Deselect
        setSelectedSquare(null);
        setValidMoves([]);
      }
    } else {
      // Select a piece
      if (clickedPiece && clickedPiece.color === myColor) {
        setSelectedSquare({ row, col });
        setValidMoves(calculateValidMoves({ row, col }));
      }
    }
  };

  // Handle promotion selection
  const handlePromotion = (pieceType: PieceType) => {
    if (pendingPromotion) {
      onMove(pendingPromotion.from, pendingPromotion.to, pieceType);
    }
    setShowPromotionDialog(false);
    setPendingPromotion(null);
    setSelectedSquare(null);
    setValidMoves([]);
  };

  // Format move history
  const formatMoveHistory = () => {
    const moves: string[] = [];
    for (let i = 0; i < gameState.moveHistory.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = gameState.moveHistory[i]?.notation || '';
      const blackMove = gameState.moveHistory[i + 1]?.notation || '';
      moves.push(`${moveNum}. ${whiteMove} ${blackMove}`);
    }
    return moves.join('  ');
  };

  // Render a square
  // visualRow/visualCol: position on screen (0 = top-left)
  // boardRow/boardCol: actual position in the game state array
  const renderSquare = (visualRow: number, visualCol: number) => {
    // Convert visual position to board position
    // For white: visual top (row 0) = board row 0 (black's back rank)
    // For black: visual top (row 0) = board row 7 (white's back rank) - need to flip
    const boardRow = shouldFlipBoard ? 7 - visualRow : visualRow;
    const boardCol = shouldFlipBoard ? 7 - visualCol : visualCol;

    const piece = gameState.board[boardRow][boardCol];
    
    // Square color is based on visual position for consistent look
    const isLight = (visualRow + visualCol) % 2 === 0;
    const isSelected = selectedSquare?.row === boardRow && selectedSquare?.col === boardCol;
    const isValidMove = validMoves.some(m => m.row === boardRow && m.col === boardCol);
    const isLastMoveFrom = lastMove?.from.row === boardRow && lastMove?.from.col === boardCol;
    const isLastMoveTo = lastMove?.to.row === boardRow && lastMove?.to.col === boardCol;
    const isKingInCheck = gameState.isCheck && piece?.type === 'K' && piece?.color === gameState.currentTurn;

    let bgColor = isLight ? 'bg-amber-100' : 'bg-amber-700';
    if (isSelected) bgColor = 'bg-yellow-400';
    else if (isLastMoveFrom || isLastMoveTo) bgColor = isLight ? 'bg-yellow-200' : 'bg-yellow-600';
    else if (isKingInCheck) bgColor = 'bg-red-500';

    // Calculate rank/file labels based on board orientation
    const rankLabel = shouldFlipBoard ? boardRow + 1 : 8 - boardRow;
    const fileLabel = FILES[boardCol];

    return (
      <div
        key={`${visualRow}-${visualCol}`}
        className={`relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center cursor-pointer ${bgColor} transition-colors`}
        onClick={() => handleSquareClick(boardRow, boardCol)}
      >
        {/* Piece */}
        {piece && (
          <span 
            className={`text-2xl sm:text-3xl md:text-4xl select-none ${
              piece.color === 'white' ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-gray-900'
            }`}
          >
            {PIECE_UNICODE[piece.color][piece.type]}
          </span>
        )}

        {/* Valid move indicator */}
        {isValidMove && !piece && (
          <div className="absolute w-3 h-3 rounded-full bg-green-500 opacity-60" />
        )}
        {isValidMove && piece && (
          <div className="absolute inset-0 border-4 border-red-500 opacity-60 rounded-sm" />
        )}

        {/* Coordinates - show rank on left edge, file on bottom edge */}
        {visualCol === 0 && (
          <span className="absolute left-0.5 top-0.5 text-[10px] font-bold text-gray-600">
            {rankLabel}
          </span>
        )}
        {visualRow === 7 && (
          <span className="absolute right-0.5 bottom-0 text-[10px] font-bold text-gray-600">
            {fileLabel}
          </span>
        )}
      </div>
    );
  };

  // Render captured pieces
  const renderCapturedPieces = (pieces: Piece[]) => {
    return pieces.map((p, i) => (
      <span key={i} className="text-lg">
        {PIECE_UNICODE[p.color][p.type]}
      </span>
    ));
  };

  // Get game status text
  const getStatusText = () => {
    if (gameState.isCheckmate) {
      const winner = gameState.winner === odUserId ? 'You win' : 'You lose';
      return `Checkmate! ${winner}`;
    }
    if (gameState.isStalemate) return 'Stalemate - Draw!';
    if (gameState.isDraw) return `Draw - ${gameState.drawReason}`;
    if (gameState.gameOver) {
      if (gameState.winner === odUserId) return 'You win!';
      return 'You lose!';
    }
    if (gameState.isCheck) return `${gameState.currentTurn === myColor ? 'You are' : 'Opponent is'} in check!`;
    return isMyTurn ? 'Your turn' : "Opponent's turn";
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-gray-900 rounded-lg border border-white/20">
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-md">
        <div className="text-white">
          <span className="font-bold">Chess</span>
          <span className="ml-2 text-sm text-gray-400">
            Playing as {myColor}
          </span>
        </div>
        <div className={`px-3 py-1 rounded text-sm font-medium ${
          gameState.gameOver 
            ? 'bg-gray-600 text-white' 
            : isMyTurn 
              ? 'bg-green-600 text-white' 
              : 'bg-yellow-600 text-black'
        }`}>
          {getStatusText()}
        </div>
      </div>

      {/* Opponent info */}
      <div className="flex items-center justify-between w-full max-w-md bg-gray-800 px-3 py-2 rounded">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${myColor === 'white' ? 'bg-gray-900' : 'bg-white'}`} />
          <span className="text-white text-sm">Opponent</span>
        </div>
        <div className="flex gap-1">
          {renderCapturedPieces(capturedPieces[myColor])}
        </div>
      </div>

      {/* Chess Board */}
      <div className="border-4 border-amber-900 rounded shadow-2xl">
        <div className="grid grid-cols-8">
          {Array(8).fill(null).map((_, row) =>
            Array(8).fill(null).map((_, col) => renderSquare(row, col))
          )}
        </div>
      </div>

      {/* Player info */}
      <div className="flex items-center justify-between w-full max-w-md bg-gray-800 px-3 py-2 rounded">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${myColor === 'white' ? 'bg-white' : 'bg-gray-900'}`} />
          <span className="text-white text-sm">You</span>
        </div>
        <div className="flex gap-1">
          {renderCapturedPieces(capturedPieces[myColor === 'white' ? 'black' : 'white'])}
        </div>
      </div>

      {/* Move history */}
      <div className="w-full max-w-md bg-gray-800 p-2 rounded max-h-20 overflow-y-auto">
        <p className="text-xs text-gray-400 font-mono">
          {formatMoveHistory() || 'Game started'}
        </p>
      </div>

      {/* Controls */}
      {!gameState.gameOver && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowForfeitConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Resign
          </button>
        </div>
      )}

      {/* Promotion Dialog */}
      {showPromotionDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border border-white/30">
            <h3 className="text-white text-lg font-bold mb-4">Choose promotion piece</h3>
            <div className="flex gap-4">
              {(['Q', 'R', 'B', 'N'] as PieceType[]).map(type => (
                <button
                  key={type}
                  onClick={() => handlePromotion(type)}
                  className="w-16 h-16 bg-amber-100 rounded flex items-center justify-center text-4xl hover:bg-amber-200 transition-colors"
                >
                  {PIECE_UNICODE[myColor][type]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Forfeit Confirmation */}
      {showForfeitConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg border border-white/30">
            <h3 className="text-white text-lg font-bold mb-4">Resign game?</h3>
            <p className="text-gray-400 mb-4">This will count as a loss.</p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  onForfeit();
                  setShowForfeitConfirm(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Resign
              </button>
              <button
                onClick={() => setShowForfeitConfirm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

