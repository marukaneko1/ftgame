export type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
export type PieceColor = 'white' | 'black';
export interface Piece {
    type: PieceType;
    color: PieceColor;
    hasMoved: boolean;
}
export interface Position {
    row: number;
    col: number;
}
export interface ChessMove {
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
export type Board = (Piece | null)[][];
export interface CastlingRights {
    whiteKingside: boolean;
    whiteQueenside: boolean;
    blackKingside: boolean;
    blackQueenside: boolean;
}
export interface ChessState {
    board: Board;
    currentTurn: PieceColor;
    playerWhite: string;
    playerBlack: string;
    moveHistory: ChessMove[];
    castlingRights: CastlingRights;
    enPassantTarget: Position | null;
    halfMoveClock: number;
    fullMoveNumber: number;
    positionHistory: string[];
    isCheck: boolean;
    isCheckmate: boolean;
    isStalemate: boolean;
    isDraw: boolean;
    drawReason?: 'stalemate' | 'insufficient_material' | 'fifty_move' | 'threefold_repetition' | 'agreement';
    winner?: string | null;
    gameOver: boolean;
}
export interface ChessMoveResult {
    success: boolean;
    state: ChessState;
    move?: ChessMove;
    error?: string;
    winner?: string | null;
    isDraw?: boolean;
    gameEnded?: boolean;
}
export interface ChessGameEndResult {
    winnerId: string | null;
    winnerColor: PieceColor | null;
    isDraw: boolean;
    reason: 'checkmate' | 'stalemate' | 'resignation' | 'timeout' | 'insufficient_material' | 'fifty_move' | 'threefold_repetition' | 'agreement';
}
export interface ChessMoveInput {
    from: Position;
    to: Position;
    promotionPiece?: PieceType;
}
//# sourceMappingURL=chess.types.d.ts.map