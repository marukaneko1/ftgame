// Tic Tac Toe game types

export type PlayerSymbol = "X" | "O";
export type CellValue = PlayerSymbol | null;

export interface TicTacToeState {
  board: CellValue[];  // 9 cells indexed 0-8
  currentTurn: PlayerSymbol;
  moveHistory: TicTacToeMove[];
  playerX: string;  // userId
  playerO: string;  // userId
  startedAt: number;
}

export interface TicTacToeMove {
  cell: number;
  player: PlayerSymbol;
  timestamp: number;
}

export interface MoveResult {
  success: boolean;
  error?: string;
  state?: TicTacToeState;
  winner?: string | null;  // userId or null
  isDraw?: boolean;
  winningLine?: number[];  // indices of winning cells
}

export interface GameEndResult {
  winnerId: string | null;
  winnerSymbol: PlayerSymbol | null;
  isDraw: boolean;
  reason: "win" | "draw" | "forfeit";
  winningLine?: number[];
}

// Winning combinations: rows, columns, diagonals
export const WINNING_COMBINATIONS: number[][] = [
  // Rows
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  // Columns
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  // Diagonals
  [0, 4, 8],
  [2, 4, 6]
];

