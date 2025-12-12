import { PrismaService } from "../../../prisma/prisma.service";
import { TicTacToeState, MoveResult, GameEndResult, PlayerSymbol, CellValue } from "./tictactoe.types";
export declare class TicTacToeService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    initializeState(playerXId: string, playerOId: string): TicTacToeState;
    getPlayerSymbol(state: TicTacToeState, userId: string): PlayerSymbol | null;
    getCurrentPlayerId(state: TicTacToeState): string;
    makeMove(gameId: string, userId: string, cellIndex: number): Promise<MoveResult>;
    checkGameEnd(board: CellValue[], state: TicTacToeState): GameEndResult | null;
    forfeitGame(gameId: string, forfeitingUserId: string): Promise<GameEndResult>;
    getValidMoves(board: CellValue[]): number[];
}
//# sourceMappingURL=tictactoe.service.d.ts.map