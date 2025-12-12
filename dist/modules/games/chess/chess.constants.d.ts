import { Board, PieceType, PieceColor } from './chess.types';
export declare const INITIAL_BOARD: Board;
export declare const FILES: string[];
export declare const RANKS: string[];
export declare const FEN_PIECES: Record<PieceColor, Record<PieceType, string>>;
export declare const PIECE_UNICODE: Record<PieceColor, Record<PieceType, string>>;
export declare const PIECE_VALUES: Record<PieceType, number>;
export declare const DIRECTIONS: {
    ROOK: {
        row: number;
        col: number;
    }[];
    BISHOP: {
        row: number;
        col: number;
    }[];
    KNIGHT: {
        row: number;
        col: number;
    }[];
    KING: {
        row: number;
        col: number;
    }[];
};
export declare const QUEEN_DIRECTIONS: {
    row: number;
    col: number;
}[];
//# sourceMappingURL=chess.constants.d.ts.map