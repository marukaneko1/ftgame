import { Board, Piece, PieceType, PieceColor } from './chess.types';

// Helper to create a piece
const piece = (type: PieceType, color: PieceColor): Piece => ({
  type,
  color,
  hasMoved: false,
});

// Standard starting position
export const INITIAL_BOARD: Board = [
  // Row 0 = Rank 8 (Black's back rank)
  [
    piece('R', 'black'),
    piece('N', 'black'),
    piece('B', 'black'),
    piece('Q', 'black'),
    piece('K', 'black'),
    piece('B', 'black'),
    piece('N', 'black'),
    piece('R', 'black'),
  ],
  // Row 1 = Rank 7 (Black's pawns)
  [
    piece('P', 'black'),
    piece('P', 'black'),
    piece('P', 'black'),
    piece('P', 'black'),
    piece('P', 'black'),
    piece('P', 'black'),
    piece('P', 'black'),
    piece('P', 'black'),
  ],
  // Rows 2-5 = Ranks 6-3 (empty)
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  // Row 6 = Rank 2 (White's pawns)
  [
    piece('P', 'white'),
    piece('P', 'white'),
    piece('P', 'white'),
    piece('P', 'white'),
    piece('P', 'white'),
    piece('P', 'white'),
    piece('P', 'white'),
    piece('P', 'white'),
  ],
  // Row 7 = Rank 1 (White's back rank)
  [
    piece('R', 'white'),
    piece('N', 'white'),
    piece('B', 'white'),
    piece('Q', 'white'),
    piece('K', 'white'),
    piece('B', 'white'),
    piece('N', 'white'),
    piece('R', 'white'),
  ],
];

// File letters (columns)
export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

// Rank numbers (rows) - note: rank 8 is row 0, rank 1 is row 7
export const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

// FEN piece characters
export const FEN_PIECES: Record<PieceColor, Record<PieceType, string>> = {
  white: { K: 'K', Q: 'Q', R: 'R', B: 'B', N: 'N', P: 'P' },
  black: { K: 'k', Q: 'q', R: 'r', B: 'b', N: 'n', P: 'p' },
};

// Unicode chess pieces for display
export const PIECE_UNICODE: Record<PieceColor, Record<PieceType, string>> = {
  white: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
  black: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
};

// Piece values (for display/evaluation, not used in game logic)
export const PIECE_VALUES: Record<PieceType, number> = {
  K: 0, // King is invaluable
  Q: 9,
  R: 5,
  B: 3,
  N: 3,
  P: 1,
};

// Direction vectors for piece movement
export const DIRECTIONS = {
  // Rook directions (horizontal/vertical)
  ROOK: [
    { row: -1, col: 0 },  // up
    { row: 1, col: 0 },   // down
    { row: 0, col: -1 },  // left
    { row: 0, col: 1 },   // right
  ],
  // Bishop directions (diagonal)
  BISHOP: [
    { row: -1, col: -1 }, // up-left
    { row: -1, col: 1 },  // up-right
    { row: 1, col: -1 },  // down-left
    { row: 1, col: 1 },   // down-right
  ],
  // Knight moves (L-shape)
  KNIGHT: [
    { row: -2, col: -1 },
    { row: -2, col: 1 },
    { row: -1, col: -2 },
    { row: -1, col: 2 },
    { row: 1, col: -2 },
    { row: 1, col: 2 },
    { row: 2, col: -1 },
    { row: 2, col: 1 },
  ],
  // King moves (one square in any direction)
  KING: [
    { row: -1, col: -1 },
    { row: -1, col: 0 },
    { row: -1, col: 1 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
    { row: 1, col: -1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
  ],
};

// Queen combines rook and bishop directions
export const QUEEN_DIRECTIONS = [...DIRECTIONS.ROOK, ...DIRECTIONS.BISHOP];

