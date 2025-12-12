"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChessService = void 0;
const common_1 = require("@nestjs/common");
const chess_constants_1 = require("./chess.constants");
let ChessService = class ChessService {
    initializeState(playerWhite, playerBlack) {
        return {
            board: this.deepCopyBoard(chess_constants_1.INITIAL_BOARD),
            currentTurn: 'white',
            playerWhite,
            playerBlack,
            moveHistory: [],
            castlingRights: {
                whiteKingside: true,
                whiteQueenside: true,
                blackKingside: true,
                blackQueenside: true,
            },
            enPassantTarget: null,
            halfMoveClock: 0,
            fullMoveNumber: 1,
            positionHistory: [],
            isCheck: false,
            isCheckmate: false,
            isStalemate: false,
            isDraw: false,
            gameOver: false,
        };
    }
    makeMove(state, playerId, from, to, promotionPiece) {
        if (state.gameOver) {
            return { success: false, state, error: 'Game is already over' };
        }
        const playerColor = this.getPlayerColor(state, playerId);
        if (!playerColor) {
            return { success: false, state, error: 'You are not a player in this game' };
        }
        if (playerColor !== state.currentTurn) {
            return { success: false, state, error: 'Not your turn' };
        }
        const piece = state.board[from.row][from.col];
        if (!piece) {
            return { success: false, state, error: 'No piece at that position' };
        }
        if (piece.color !== playerColor) {
            return { success: false, state, error: 'That is not your piece' };
        }
        const validMoves = this.getValidMoves(state, from);
        const isValidMove = validMoves.some(m => m.row === to.row && m.col === to.col);
        if (!isValidMove) {
            return { success: false, state, error: 'Invalid move' };
        }
        if (piece.type === 'P' && this.isPawnPromotion(piece, to)) {
            if (!promotionPiece || !['Q', 'R', 'B', 'N'].includes(promotionPiece)) {
                return { success: false, state, error: 'Promotion piece required' };
            }
        }
        const newState = this.executeMove(state, from, to, promotionPiece);
        const move = this.createMoveRecord(state, newState, from, to, piece, promotionPiece);
        newState.moveHistory.push(move);
        const positionFen = this.generatePositionFen(newState);
        newState.positionHistory.push(positionFen);
        const gameEnd = this.checkGameEnd(newState);
        if (gameEnd) {
            newState.gameOver = true;
            newState.winner = gameEnd.winnerId;
            newState.isDraw = gameEnd.isDraw;
            if (gameEnd.isDraw && gameEnd.reason !== 'stalemate') {
                newState.drawReason = gameEnd.reason;
            }
        }
        return {
            success: true,
            state: newState,
            move,
            winner: newState.winner,
            isDraw: newState.isDraw,
            gameEnded: newState.gameOver,
        };
    }
    executeMove(state, from, to, promotionPiece) {
        const newState = {
            ...state,
            board: this.deepCopyBoard(state.board),
            castlingRights: { ...state.castlingRights },
            moveHistory: [...state.moveHistory],
            positionHistory: [...state.positionHistory],
        };
        const piece = newState.board[from.row][from.col];
        const capturedPiece = newState.board[to.row][to.col];
        let isEnPassant = false;
        if (piece.type === 'P' && state.enPassantTarget &&
            to.row === state.enPassantTarget.row && to.col === state.enPassantTarget.col) {
            isEnPassant = true;
            const capturedPawnRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
            newState.board[capturedPawnRow][to.col] = null;
        }
        let isCastling;
        if (piece.type === 'K' && Math.abs(to.col - from.col) === 2) {
            if (to.col > from.col) {
                isCastling = 'kingside';
                const rookCol = 7;
                const rookNewCol = 5;
                newState.board[to.row][rookNewCol] = newState.board[to.row][rookCol];
                newState.board[to.row][rookCol] = null;
                if (newState.board[to.row][rookNewCol]) {
                    newState.board[to.row][rookNewCol].hasMoved = true;
                }
            }
            else {
                isCastling = 'queenside';
                const rookCol = 0;
                const rookNewCol = 3;
                newState.board[to.row][rookNewCol] = newState.board[to.row][rookCol];
                newState.board[to.row][rookCol] = null;
                if (newState.board[to.row][rookNewCol]) {
                    newState.board[to.row][rookNewCol].hasMoved = true;
                }
            }
        }
        newState.board[to.row][to.col] = { ...piece, hasMoved: true };
        newState.board[from.row][from.col] = null;
        if (piece.type === 'P' && this.isPawnPromotion(piece, to) && promotionPiece) {
            newState.board[to.row][to.col] = {
                type: promotionPiece,
                color: piece.color,
                hasMoved: true,
            };
        }
        this.updateCastlingRights(newState, from, to, piece);
        newState.enPassantTarget = null;
        if (piece.type === 'P' && Math.abs(to.row - from.row) === 2) {
            newState.enPassantTarget = {
                row: (from.row + to.row) / 2,
                col: from.col,
            };
        }
        if (piece.type === 'P' || capturedPiece || isEnPassant) {
            newState.halfMoveClock = 0;
        }
        else {
            newState.halfMoveClock = state.halfMoveClock + 1;
        }
        if (state.currentTurn === 'black') {
            newState.fullMoveNumber = state.fullMoveNumber + 1;
        }
        newState.currentTurn = state.currentTurn === 'white' ? 'black' : 'white';
        newState.isCheck = this.isKingInCheck(newState, newState.currentTurn);
        const hasLegalMoves = this.hasAnyLegalMoves(newState, newState.currentTurn);
        if (!hasLegalMoves) {
            if (newState.isCheck) {
                newState.isCheckmate = true;
            }
            else {
                newState.isStalemate = true;
                newState.isDraw = true;
                newState.drawReason = 'stalemate';
            }
        }
        return newState;
    }
    updateCastlingRights(state, from, to, piece) {
        if (piece.type === 'K') {
            if (piece.color === 'white') {
                state.castlingRights.whiteKingside = false;
                state.castlingRights.whiteQueenside = false;
            }
            else {
                state.castlingRights.blackKingside = false;
                state.castlingRights.blackQueenside = false;
            }
        }
        if (piece.type === 'R' || state.board[to.row]?.[to.col]?.type === 'R') {
            if (from.row === 7 && from.col === 7)
                state.castlingRights.whiteKingside = false;
            if (to.row === 7 && to.col === 7)
                state.castlingRights.whiteKingside = false;
            if (from.row === 7 && from.col === 0)
                state.castlingRights.whiteQueenside = false;
            if (to.row === 7 && to.col === 0)
                state.castlingRights.whiteQueenside = false;
            if (from.row === 0 && from.col === 7)
                state.castlingRights.blackKingside = false;
            if (to.row === 0 && to.col === 7)
                state.castlingRights.blackKingside = false;
            if (from.row === 0 && from.col === 0)
                state.castlingRights.blackQueenside = false;
            if (to.row === 0 && to.col === 0)
                state.castlingRights.blackQueenside = false;
        }
    }
    getValidMoves(state, position) {
        const piece = state.board[position.row][position.col];
        if (!piece)
            return [];
        const pseudoLegalMoves = this.getPseudoLegalMoves(state, position, piece);
        return pseudoLegalMoves.filter(to => {
            const testState = this.simulateMove(state, position, to);
            return !this.isKingInCheck(testState, piece.color);
        });
    }
    getPseudoLegalMoves(state, pos, piece) {
        switch (piece.type) {
            case 'P': return this.getPawnMoves(state, pos, piece.color);
            case 'N': return this.getKnightMoves(state, pos, piece.color);
            case 'B': return this.getBishopMoves(state, pos, piece.color);
            case 'R': return this.getRookMoves(state, pos, piece.color);
            case 'Q': return this.getQueenMoves(state, pos, piece.color);
            case 'K': return this.getKingMoves(state, pos, piece.color);
            default: return [];
        }
    }
    getPawnMoves(state, pos, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;
        const oneForward = { row: pos.row + direction, col: pos.col };
        if (this.isOnBoard(oneForward) && !state.board[oneForward.row][oneForward.col]) {
            moves.push(oneForward);
            if (pos.row === startRow) {
                const twoForward = { row: pos.row + 2 * direction, col: pos.col };
                if (!state.board[twoForward.row][twoForward.col]) {
                    moves.push(twoForward);
                }
            }
        }
        for (const colOffset of [-1, 1]) {
            const capturePos = { row: pos.row + direction, col: pos.col + colOffset };
            if (this.isOnBoard(capturePos)) {
                const targetPiece = state.board[capturePos.row][capturePos.col];
                if (targetPiece && targetPiece.color !== color) {
                    moves.push(capturePos);
                }
                if (state.enPassantTarget &&
                    capturePos.row === state.enPassantTarget.row &&
                    capturePos.col === state.enPassantTarget.col) {
                    moves.push(capturePos);
                }
            }
        }
        return moves;
    }
    getKnightMoves(state, pos, color) {
        const moves = [];
        for (const delta of chess_constants_1.DIRECTIONS.KNIGHT) {
            const newPos = { row: pos.row + delta.row, col: pos.col + delta.col };
            if (this.isOnBoard(newPos)) {
                const targetPiece = state.board[newPos.row][newPos.col];
                if (!targetPiece || targetPiece.color !== color) {
                    moves.push(newPos);
                }
            }
        }
        return moves;
    }
    getBishopMoves(state, pos, color) {
        return this.getSlidingMoves(state, pos, color, chess_constants_1.DIRECTIONS.BISHOP);
    }
    getRookMoves(state, pos, color) {
        return this.getSlidingMoves(state, pos, color, chess_constants_1.DIRECTIONS.ROOK);
    }
    getQueenMoves(state, pos, color) {
        return this.getSlidingMoves(state, pos, color, chess_constants_1.QUEEN_DIRECTIONS);
    }
    getKingMoves(state, pos, color) {
        const moves = [];
        for (const delta of chess_constants_1.DIRECTIONS.KING) {
            const newPos = { row: pos.row + delta.row, col: pos.col + delta.col };
            if (this.isOnBoard(newPos)) {
                const targetPiece = state.board[newPos.row][newPos.col];
                if (!targetPiece || targetPiece.color !== color) {
                    moves.push(newPos);
                }
            }
        }
        const piece = state.board[pos.row][pos.col];
        if (piece && !piece.hasMoved && !this.isKingInCheck(state, color)) {
            if (this.canCastleKingside(state, color)) {
                moves.push({ row: pos.row, col: pos.col + 2 });
            }
            if (this.canCastleQueenside(state, color)) {
                moves.push({ row: pos.row, col: pos.col - 2 });
            }
        }
        return moves;
    }
    getSlidingMoves(state, pos, color, directions) {
        const moves = [];
        for (const delta of directions) {
            let newPos = { row: pos.row + delta.row, col: pos.col + delta.col };
            while (this.isOnBoard(newPos)) {
                const targetPiece = state.board[newPos.row][newPos.col];
                if (!targetPiece) {
                    moves.push({ ...newPos });
                }
                else {
                    if (targetPiece.color !== color) {
                        moves.push({ ...newPos });
                    }
                    break;
                }
                newPos = { row: newPos.row + delta.row, col: newPos.col + delta.col };
            }
        }
        return moves;
    }
    canCastleKingside(state, color) {
        const row = color === 'white' ? 7 : 0;
        const rights = color === 'white' ? state.castlingRights.whiteKingside : state.castlingRights.blackKingside;
        if (!rights)
            return false;
        if (state.board[row][5] || state.board[row][6])
            return false;
        const enemyColor = color === 'white' ? 'black' : 'white';
        if (this.isSquareAttacked(state, { row, col: 4 }, enemyColor))
            return false;
        if (this.isSquareAttacked(state, { row, col: 5 }, enemyColor))
            return false;
        if (this.isSquareAttacked(state, { row, col: 6 }, enemyColor))
            return false;
        return true;
    }
    canCastleQueenside(state, color) {
        const row = color === 'white' ? 7 : 0;
        const rights = color === 'white' ? state.castlingRights.whiteQueenside : state.castlingRights.blackQueenside;
        if (!rights)
            return false;
        if (state.board[row][1] || state.board[row][2] || state.board[row][3])
            return false;
        const enemyColor = color === 'white' ? 'black' : 'white';
        if (this.isSquareAttacked(state, { row, col: 4 }, enemyColor))
            return false;
        if (this.isSquareAttacked(state, { row, col: 3 }, enemyColor))
            return false;
        if (this.isSquareAttacked(state, { row, col: 2 }, enemyColor))
            return false;
        return true;
    }
    isPawnPromotion(piece, to) {
        if (piece.type !== 'P')
            return false;
        return (piece.color === 'white' && to.row === 0) || (piece.color === 'black' && to.row === 7);
    }
    isKingInCheck(state, color) {
        const kingPos = this.findKing(state.board, color);
        if (!kingPos)
            return false;
        const enemyColor = color === 'white' ? 'black' : 'white';
        return this.isSquareAttacked(state, kingPos, enemyColor);
    }
    isSquareAttacked(state, pos, byColor) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = state.board[row][col];
                if (piece && piece.color === byColor) {
                    const attacks = this.getAttackSquares(state, { row, col }, piece);
                    if (attacks.some(a => a.row === pos.row && a.col === pos.col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    getAttackSquares(state, pos, piece) {
        switch (piece.type) {
            case 'P': {
                const direction = piece.color === 'white' ? -1 : 1;
                const attacks = [];
                for (const colOffset of [-1, 1]) {
                    const attackPos = { row: pos.row + direction, col: pos.col + colOffset };
                    if (this.isOnBoard(attackPos)) {
                        attacks.push(attackPos);
                    }
                }
                return attacks;
            }
            case 'N': return this.getKnightMoves(state, pos, piece.color);
            case 'B': return this.getSlidingMoves(state, pos, piece.color, chess_constants_1.DIRECTIONS.BISHOP);
            case 'R': return this.getSlidingMoves(state, pos, piece.color, chess_constants_1.DIRECTIONS.ROOK);
            case 'Q': return this.getSlidingMoves(state, pos, piece.color, chess_constants_1.QUEEN_DIRECTIONS);
            case 'K': {
                const attacks = [];
                for (const delta of chess_constants_1.DIRECTIONS.KING) {
                    const newPos = { row: pos.row + delta.row, col: pos.col + delta.col };
                    if (this.isOnBoard(newPos)) {
                        attacks.push(newPos);
                    }
                }
                return attacks;
            }
            default: return [];
        }
    }
    findKing(board, color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && piece.type === 'K' && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }
    hasAnyLegalMoves(state, color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = state.board[row][col];
                if (piece && piece.color === color) {
                    const moves = this.getValidMoves(state, { row, col });
                    if (moves.length > 0)
                        return true;
                }
            }
        }
        return false;
    }
    isInsufficientMaterial(state) {
        const pieces = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = state.board[row][col];
                if (piece) {
                    pieces.push({ type: piece.type, color: piece.color, pos: { row, col } });
                }
            }
        }
        if (pieces.length === 2)
            return true;
        if (pieces.length === 3) {
            const nonKings = pieces.filter(p => p.type !== 'K');
            if (nonKings.length === 1 && (nonKings[0].type === 'B' || nonKings[0].type === 'N')) {
                return true;
            }
        }
        if (pieces.length === 4) {
            const bishops = pieces.filter(p => p.type === 'B');
            if (bishops.length === 2) {
                const colors = bishops.map(b => (b.pos.row + b.pos.col) % 2);
                if (colors[0] === colors[1])
                    return true;
            }
        }
        return false;
    }
    checkGameEnd(state) {
        if (state.isCheckmate) {
            const winnerColor = state.currentTurn === 'white' ? 'black' : 'white';
            const winnerId = winnerColor === 'white' ? state.playerWhite : state.playerBlack;
            return {
                winnerId,
                winnerColor,
                isDraw: false,
                reason: 'checkmate',
            };
        }
        if (state.isStalemate) {
            return {
                winnerId: null,
                winnerColor: null,
                isDraw: true,
                reason: 'stalemate',
            };
        }
        if (this.isInsufficientMaterial(state)) {
            return {
                winnerId: null,
                winnerColor: null,
                isDraw: true,
                reason: 'insufficient_material',
            };
        }
        if (state.halfMoveClock >= 100) {
            return {
                winnerId: null,
                winnerColor: null,
                isDraw: true,
                reason: 'fifty_move',
            };
        }
        const currentPos = this.generatePositionFen(state);
        const occurrences = state.positionHistory.filter(p => p === currentPos).length;
        if (occurrences >= 3) {
            return {
                winnerId: null,
                winnerColor: null,
                isDraw: true,
                reason: 'threefold_repetition',
            };
        }
        return null;
    }
    forfeitGame(state, forfeitingPlayerId) {
        const forfeitingColor = this.getPlayerColor(state, forfeitingPlayerId);
        const winnerColor = forfeitingColor === 'white' ? 'black' : 'white';
        const winnerId = winnerColor === 'white' ? state.playerWhite : state.playerBlack;
        return {
            winnerId,
            winnerColor,
            isDraw: false,
            reason: 'resignation',
        };
    }
    deepCopyBoard(board) {
        return board.map(row => row.map(cell => (cell ? { ...cell } : null)));
    }
    simulateMove(state, from, to) {
        const newBoard = this.deepCopyBoard(state.board);
        const piece = newBoard[from.row][from.col];
        if (piece?.type === 'P' && state.enPassantTarget &&
            to.row === state.enPassantTarget.row && to.col === state.enPassantTarget.col) {
            const capturedPawnRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
            newBoard[capturedPawnRow][to.col] = null;
        }
        newBoard[to.row][to.col] = piece;
        newBoard[from.row][from.col] = null;
        return { ...state, board: newBoard };
    }
    isOnBoard(pos) {
        return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
    }
    getPlayerColor(state, playerId) {
        if (state.playerWhite === playerId)
            return 'white';
        if (state.playerBlack === playerId)
            return 'black';
        return null;
    }
    positionToAlgebraic(pos) {
        return chess_constants_1.FILES[pos.col] + (8 - pos.row);
    }
    algebraicToPosition(square) {
        const col = chess_constants_1.FILES.indexOf(square[0]);
        const row = 8 - parseInt(square[1], 10);
        return { row, col };
    }
    generatePositionFen(state) {
        let fen = '';
        for (let row = 0; row < 8; row++) {
            let emptyCount = 0;
            for (let col = 0; col < 8; col++) {
                const piece = state.board[row][col];
                if (piece) {
                    if (emptyCount > 0) {
                        fen += emptyCount;
                        emptyCount = 0;
                    }
                    fen += chess_constants_1.FEN_PIECES[piece.color][piece.type];
                }
                else {
                    emptyCount++;
                }
            }
            if (emptyCount > 0)
                fen += emptyCount;
            if (row < 7)
                fen += '/';
        }
        fen += ' ' + (state.currentTurn === 'white' ? 'w' : 'b');
        let castling = '';
        if (state.castlingRights.whiteKingside)
            castling += 'K';
        if (state.castlingRights.whiteQueenside)
            castling += 'Q';
        if (state.castlingRights.blackKingside)
            castling += 'k';
        if (state.castlingRights.blackQueenside)
            castling += 'q';
        fen += ' ' + (castling || '-');
        if (state.enPassantTarget) {
            fen += ' ' + this.positionToAlgebraic(state.enPassantTarget);
        }
        else {
            fen += ' -';
        }
        return fen;
    }
    createMoveRecord(oldState, newState, from, to, piece, promotionPiece) {
        const capturedPiece = oldState.board[to.row][to.col] || undefined;
        const isCastling = piece.type === 'K' && Math.abs(to.col - from.col) === 2
            ? (to.col > from.col ? 'kingside' : 'queenside')
            : undefined;
        const isEnPassant = piece.type === 'P' && oldState.enPassantTarget &&
            to.row === oldState.enPassantTarget.row && to.col === oldState.enPassantTarget.col
            ? true : undefined;
        let notation = '';
        if (isCastling === 'kingside') {
            notation = 'O-O';
        }
        else if (isCastling === 'queenside') {
            notation = 'O-O-O';
        }
        else {
            if (piece.type !== 'P') {
                notation += piece.type;
                const ambiguous = this.findAmbiguousPieces(oldState, piece, from, to);
                if (ambiguous.length > 0) {
                    if (ambiguous.every(p => p.col !== from.col)) {
                        notation += chess_constants_1.FILES[from.col];
                    }
                    else if (ambiguous.every(p => p.row !== from.row)) {
                        notation += (8 - from.row);
                    }
                    else {
                        notation += chess_constants_1.FILES[from.col] + (8 - from.row);
                    }
                }
            }
            if (capturedPiece || isEnPassant) {
                if (piece.type === 'P') {
                    notation += chess_constants_1.FILES[from.col];
                }
                notation += 'x';
            }
            notation += this.positionToAlgebraic(to);
            if (promotionPiece) {
                notation += '=' + promotionPiece;
            }
        }
        if (newState.isCheckmate) {
            notation += '#';
        }
        else if (newState.isCheck) {
            notation += '+';
        }
        return {
            from,
            to,
            piece,
            capturedPiece,
            isCheck: newState.isCheck,
            isCheckmate: newState.isCheckmate,
            isCastling,
            isEnPassant,
            promotionPiece,
            notation,
        };
    }
    findAmbiguousPieces(state, piece, from, to) {
        const ambiguous = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (row === from.row && col === from.col)
                    continue;
                const other = state.board[row][col];
                if (other && other.type === piece.type && other.color === piece.color) {
                    const moves = this.getValidMoves(state, { row, col });
                    if (moves.some(m => m.row === to.row && m.col === to.col)) {
                        ambiguous.push({ row, col });
                    }
                }
            }
        }
        return ambiguous;
    }
    getAllValidMovesForPlayer(state, playerId) {
        const color = this.getPlayerColor(state, playerId);
        if (!color)
            return [];
        const allMoves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = state.board[row][col];
                if (piece && piece.color === color) {
                    const from = { row, col };
                    const moves = this.getValidMoves(state, from);
                    for (const to of moves) {
                        allMoves.push({ from, to });
                    }
                }
            }
        }
        return allMoves;
    }
};
exports.ChessService = ChessService;
exports.ChessService = ChessService = __decorate([
    (0, common_1.Injectable)()
], ChessService);
//# sourceMappingURL=chess.service.js.map