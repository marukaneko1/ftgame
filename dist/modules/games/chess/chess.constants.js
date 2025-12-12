"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUEEN_DIRECTIONS = exports.DIRECTIONS = exports.PIECE_VALUES = exports.PIECE_UNICODE = exports.FEN_PIECES = exports.RANKS = exports.FILES = exports.INITIAL_BOARD = void 0;
const piece = (type, color) => ({
    type,
    color,
    hasMoved: false,
});
exports.INITIAL_BOARD = [
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
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
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
exports.FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
exports.RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];
exports.FEN_PIECES = {
    white: { K: 'K', Q: 'Q', R: 'R', B: 'B', N: 'N', P: 'P' },
    black: { K: 'k', Q: 'q', R: 'r', B: 'b', N: 'n', P: 'p' },
};
exports.PIECE_UNICODE = {
    white: { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' },
    black: { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' },
};
exports.PIECE_VALUES = {
    K: 0,
    Q: 9,
    R: 5,
    B: 3,
    N: 3,
    P: 1,
};
exports.DIRECTIONS = {
    ROOK: [
        { row: -1, col: 0 },
        { row: 1, col: 0 },
        { row: 0, col: -1 },
        { row: 0, col: 1 },
    ],
    BISHOP: [
        { row: -1, col: -1 },
        { row: -1, col: 1 },
        { row: 1, col: -1 },
        { row: 1, col: 1 },
    ],
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
exports.QUEEN_DIRECTIONS = [...exports.DIRECTIONS.ROOK, ...exports.DIRECTIONS.BISHOP];
//# sourceMappingURL=chess.constants.js.map