export type PlayerSymbol = "X" | "O";
export type CellValue = PlayerSymbol | null;
export interface TicTacToeState {
    board: CellValue[];
    currentTurn: PlayerSymbol;
    moveHistory: TicTacToeMove[];
    playerX: string;
    playerO: string;
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
    winner?: string | null;
    isDraw?: boolean;
    winningLine?: number[];
}
export interface GameEndResult {
    winnerId: string | null;
    winnerSymbol: PlayerSymbol | null;
    isDraw: boolean;
    reason: "win" | "draw" | "forfeit";
    winningLine?: number[];
}
export declare const WINNING_COMBINATIONS: number[][];
//# sourceMappingURL=tictactoe.types.d.ts.map