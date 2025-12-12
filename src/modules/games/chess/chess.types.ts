// Chess piece types
export type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P'; // King, Queen, Rook, Bishop, Knight, Pawn

// Piece colors
export type PieceColor = 'white' | 'black';

// A piece on the board
export interface Piece {
  type: PieceType;
  color: PieceColor;
  hasMoved: boolean; // Important for castling and pawn double-move
}

// Board position (0-7 for both row and col)
export interface Position {
  row: number; // 0 = rank 8 (black side), 7 = rank 1 (white side)
  col: number; // 0 = a-file, 7 = h-file
}

// Move representation
export interface ChessMove {
  from: Position;
  to: Position;
  piece: Piece;
  capturedPiece?: Piece;
  isCheck?: boolean;
  isCheckmate?: boolean;
  isCastling?: 'kingside' | 'queenside';
  isEnPassant?: boolean;
  promotionPiece?: PieceType; // For pawn promotion
  notation: string; // Standard algebraic notation (e.g., "Nf3", "O-O", "exd5")
}

// The 8x8 board - null means empty square
export type Board = (Piece | null)[][];

// Castling rights
export interface CastlingRights {
  whiteKingside: boolean;
  whiteQueenside: boolean;
  blackKingside: boolean;
  blackQueenside: boolean;
}

// Full game state
export interface ChessState {
  board: Board;
  currentTurn: PieceColor;
  playerWhite: string; // odUserId
  playerBlack: string; // odUserId
  moveHistory: ChessMove[];
  
  // For special moves
  castlingRights: CastlingRights;
  enPassantTarget: Position | null; // Square where en passant capture is possible
  
  // For draw conditions
  halfMoveClock: number; // Moves since last pawn move or capture (for 50-move rule)
  fullMoveNumber: number; // Increments after Black's move
  positionHistory: string[]; // FEN position strings for threefold repetition
  
  // Game status
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  drawReason?: 'stalemate' | 'insufficient_material' | 'fifty_move' | 'threefold_repetition' | 'agreement';
  winner?: string | null; // odUserId of winner, null for draw
  gameOver: boolean;
}

// Move result from makeMove
export interface ChessMoveResult {
  success: boolean;
  state: ChessState;
  move?: ChessMove;
  error?: string;
  winner?: string | null;
  isDraw?: boolean;
  gameEnded?: boolean;
}

// Game end result
export interface ChessGameEndResult {
  winnerId: string | null;
  winnerColor: PieceColor | null;
  isDraw: boolean;
  reason: 'checkmate' | 'stalemate' | 'resignation' | 'timeout' | 'insufficient_material' | 'fifty_move' | 'threefold_repetition' | 'agreement';
}

// Move input from client
export interface ChessMoveInput {
  from: Position;
  to: Position;
  promotionPiece?: PieceType;
}

