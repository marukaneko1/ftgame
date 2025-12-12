import { ChessState, PieceType, PieceColor, Position, ChessMoveResult, ChessGameEndResult } from './chess.types';
export declare class ChessService {
    initializeState(playerWhite: string, playerBlack: string): ChessState;
    makeMove(state: ChessState, playerId: string, from: Position, to: Position, promotionPiece?: PieceType): ChessMoveResult;
    private executeMove;
    private updateCastlingRights;
    getValidMoves(state: ChessState, position: Position): Position[];
    private getPseudoLegalMoves;
    private getPawnMoves;
    private getKnightMoves;
    private getBishopMoves;
    private getRookMoves;
    private getQueenMoves;
    private getKingMoves;
    private getSlidingMoves;
    private canCastleKingside;
    private canCastleQueenside;
    private isPawnPromotion;
    isKingInCheck(state: ChessState, color: PieceColor): boolean;
    private isSquareAttacked;
    private getAttackSquares;
    private findKing;
    private hasAnyLegalMoves;
    private isInsufficientMaterial;
    checkGameEnd(state: ChessState): ChessGameEndResult | null;
    forfeitGame(state: ChessState, forfeitingPlayerId: string): ChessGameEndResult;
    private deepCopyBoard;
    private simulateMove;
    private isOnBoard;
    getPlayerColor(state: ChessState, playerId: string): PieceColor | null;
    positionToAlgebraic(pos: Position): string;
    algebraicToPosition(square: string): Position;
    private generatePositionFen;
    private createMoveRecord;
    private findAmbiguousPieces;
    getAllValidMovesForPlayer(state: ChessState, playerId: string): {
        from: Position;
        to: Position;
    }[];
}
//# sourceMappingURL=chess.service.d.ts.map