import { Injectable } from '@nestjs/common';
import {
  ChessState,
  Board,
  Piece,
  PieceType,
  PieceColor,
  Position,
  ChessMove,
  ChessMoveResult,
  ChessGameEndResult,
  CastlingRights,
} from './chess.types';
import { INITIAL_BOARD, DIRECTIONS, QUEEN_DIRECTIONS, FILES, FEN_PIECES } from './chess.constants';

@Injectable()
export class ChessService {
  // ============ INITIALIZATION ============

  initializeState(playerWhite: string, playerBlack: string): ChessState {
    return {
      board: this.deepCopyBoard(INITIAL_BOARD),
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

  // ============ MOVE EXECUTION ============

  makeMove(
    state: ChessState,
    playerId: string,
    from: Position,
    to: Position,
    promotionPiece?: PieceType
  ): ChessMoveResult {
    // Check if game is already over
    if (state.gameOver) {
      return { success: false, state, error: 'Game is already over' };
    }

    // Check if it's the player's turn
    const playerColor = this.getPlayerColor(state, playerId);
    if (!playerColor) {
      return { success: false, state, error: 'You are not a player in this game' };
    }
    if (playerColor !== state.currentTurn) {
      return { success: false, state, error: 'Not your turn' };
    }

    // Get the piece at the from position
    const piece = state.board[from.row][from.col];
    if (!piece) {
      return { success: false, state, error: 'No piece at that position' };
    }
    if (piece.color !== playerColor) {
      return { success: false, state, error: 'That is not your piece' };
    }

    // Check if the move is valid
    const validMoves = this.getValidMoves(state, from);
    const isValidMove = validMoves.some(m => m.row === to.row && m.col === to.col);
    if (!isValidMove) {
      return { success: false, state, error: 'Invalid move' };
    }

    // Check for pawn promotion
    if (piece.type === 'P' && this.isPawnPromotion(piece, to)) {
      if (!promotionPiece || !['Q', 'R', 'B', 'N'].includes(promotionPiece)) {
        return { success: false, state, error: 'Promotion piece required' };
      }
    }

    // Execute the move
    const newState = this.executeMove(state, from, to, promotionPiece);

    // Generate move notation
    const move = this.createMoveRecord(state, newState, from, to, piece, promotionPiece);
    newState.moveHistory.push(move);

    // Update position history for threefold repetition
    const positionFen = this.generatePositionFen(newState);
    newState.positionHistory.push(positionFen);

    // Check game end conditions
    const gameEnd = this.checkGameEnd(newState);
    if (gameEnd) {
      newState.gameOver = true;
      newState.winner = gameEnd.winnerId;
      newState.isDraw = gameEnd.isDraw;
      if (gameEnd.isDraw && gameEnd.reason !== 'stalemate') {
        newState.drawReason = gameEnd.reason as any;
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

  private executeMove(
    state: ChessState,
    from: Position,
    to: Position,
    promotionPiece?: PieceType
  ): ChessState {
    const newState: ChessState = {
      ...state,
      board: this.deepCopyBoard(state.board),
      castlingRights: { ...state.castlingRights },
      moveHistory: [...state.moveHistory],
      positionHistory: [...state.positionHistory],
    };

    const piece = newState.board[from.row][from.col]!;
    const capturedPiece = newState.board[to.row][to.col];

    // Handle en passant capture
    let isEnPassant = false;
    if (piece.type === 'P' && state.enPassantTarget &&
        to.row === state.enPassantTarget.row && to.col === state.enPassantTarget.col) {
      isEnPassant = true;
      // Remove the captured pawn
      const capturedPawnRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
      newState.board[capturedPawnRow][to.col] = null;
    }

    // Handle castling
    let isCastling: 'kingside' | 'queenside' | undefined;
    if (piece.type === 'K' && Math.abs(to.col - from.col) === 2) {
      if (to.col > from.col) {
        // Kingside castling
        isCastling = 'kingside';
        const rookCol = 7;
        const rookNewCol = 5;
        newState.board[to.row][rookNewCol] = newState.board[to.row][rookCol];
        newState.board[to.row][rookCol] = null;
        if (newState.board[to.row][rookNewCol]) {
          newState.board[to.row][rookNewCol]!.hasMoved = true;
        }
      } else {
        // Queenside castling
        isCastling = 'queenside';
        const rookCol = 0;
        const rookNewCol = 3;
        newState.board[to.row][rookNewCol] = newState.board[to.row][rookCol];
        newState.board[to.row][rookCol] = null;
        if (newState.board[to.row][rookNewCol]) {
          newState.board[to.row][rookNewCol]!.hasMoved = true;
        }
      }
    }

    // Move the piece
    newState.board[to.row][to.col] = { ...piece, hasMoved: true };
    newState.board[from.row][from.col] = null;

    // Handle pawn promotion
    if (piece.type === 'P' && this.isPawnPromotion(piece, to) && promotionPiece) {
      newState.board[to.row][to.col] = {
        type: promotionPiece,
        color: piece.color,
        hasMoved: true,
      };
    }

    // Update castling rights
    this.updateCastlingRights(newState, from, to, piece);

    // Update en passant target
    newState.enPassantTarget = null;
    if (piece.type === 'P' && Math.abs(to.row - from.row) === 2) {
      // Pawn moved two squares, set en passant target
      newState.enPassantTarget = {
        row: (from.row + to.row) / 2,
        col: from.col,
      };
    }

    // Update half-move clock
    if (piece.type === 'P' || capturedPiece || isEnPassant) {
      newState.halfMoveClock = 0;
    } else {
      newState.halfMoveClock = state.halfMoveClock + 1;
    }

    // Update full move number
    if (state.currentTurn === 'black') {
      newState.fullMoveNumber = state.fullMoveNumber + 1;
    }

    // Switch turn
    newState.currentTurn = state.currentTurn === 'white' ? 'black' : 'white';

    // Check for check
    newState.isCheck = this.isKingInCheck(newState, newState.currentTurn);

    // Check for checkmate or stalemate
    const hasLegalMoves = this.hasAnyLegalMoves(newState, newState.currentTurn);
    if (!hasLegalMoves) {
      if (newState.isCheck) {
        newState.isCheckmate = true;
      } else {
        newState.isStalemate = true;
        newState.isDraw = true;
        newState.drawReason = 'stalemate';
      }
    }

    return newState;
  }

  private updateCastlingRights(state: ChessState, from: Position, to: Position, piece: Piece): void {
    // King moved
    if (piece.type === 'K') {
      if (piece.color === 'white') {
        state.castlingRights.whiteKingside = false;
        state.castlingRights.whiteQueenside = false;
      } else {
        state.castlingRights.blackKingside = false;
        state.castlingRights.blackQueenside = false;
      }
    }

    // Rook moved or captured
    if (piece.type === 'R' || state.board[to.row]?.[to.col]?.type === 'R') {
      // White kingside rook
      if (from.row === 7 && from.col === 7) state.castlingRights.whiteKingside = false;
      if (to.row === 7 && to.col === 7) state.castlingRights.whiteKingside = false;
      // White queenside rook
      if (from.row === 7 && from.col === 0) state.castlingRights.whiteQueenside = false;
      if (to.row === 7 && to.col === 0) state.castlingRights.whiteQueenside = false;
      // Black kingside rook
      if (from.row === 0 && from.col === 7) state.castlingRights.blackKingside = false;
      if (to.row === 0 && to.col === 7) state.castlingRights.blackKingside = false;
      // Black queenside rook
      if (from.row === 0 && from.col === 0) state.castlingRights.blackQueenside = false;
      if (to.row === 0 && to.col === 0) state.castlingRights.blackQueenside = false;
    }
  }

  // ============ MOVE VALIDATION ============

  getValidMoves(state: ChessState, position: Position): Position[] {
    const piece = state.board[position.row][position.col];
    if (!piece) return [];

    const pseudoLegalMoves = this.getPseudoLegalMoves(state, position, piece);
    
    // Filter out moves that would leave the king in check
    return pseudoLegalMoves.filter(to => {
      const testState = this.simulateMove(state, position, to);
      return !this.isKingInCheck(testState, piece.color);
    });
  }

  private getPseudoLegalMoves(state: ChessState, pos: Position, piece: Piece): Position[] {
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

  private getPawnMoves(state: ChessState, pos: Position, color: PieceColor): Position[] {
    const moves: Position[] = [];
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;

    // Forward one square
    const oneForward = { row: pos.row + direction, col: pos.col };
    if (this.isOnBoard(oneForward) && !state.board[oneForward.row][oneForward.col]) {
      moves.push(oneForward);

      // Forward two squares from starting position
      if (pos.row === startRow) {
        const twoForward = { row: pos.row + 2 * direction, col: pos.col };
        if (!state.board[twoForward.row][twoForward.col]) {
          moves.push(twoForward);
        }
      }
    }

    // Diagonal captures
    for (const colOffset of [-1, 1]) {
      const capturePos = { row: pos.row + direction, col: pos.col + colOffset };
      if (this.isOnBoard(capturePos)) {
        const targetPiece = state.board[capturePos.row][capturePos.col];
        if (targetPiece && targetPiece.color !== color) {
          moves.push(capturePos);
        }
        // En passant
        if (state.enPassantTarget &&
            capturePos.row === state.enPassantTarget.row &&
            capturePos.col === state.enPassantTarget.col) {
          moves.push(capturePos);
        }
      }
    }

    return moves;
  }

  private getKnightMoves(state: ChessState, pos: Position, color: PieceColor): Position[] {
    const moves: Position[] = [];
    for (const delta of DIRECTIONS.KNIGHT) {
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

  private getBishopMoves(state: ChessState, pos: Position, color: PieceColor): Position[] {
    return this.getSlidingMoves(state, pos, color, DIRECTIONS.BISHOP);
  }

  private getRookMoves(state: ChessState, pos: Position, color: PieceColor): Position[] {
    return this.getSlidingMoves(state, pos, color, DIRECTIONS.ROOK);
  }

  private getQueenMoves(state: ChessState, pos: Position, color: PieceColor): Position[] {
    return this.getSlidingMoves(state, pos, color, QUEEN_DIRECTIONS);
  }

  private getKingMoves(state: ChessState, pos: Position, color: PieceColor): Position[] {
    const moves: Position[] = [];

    // Normal king moves
    for (const delta of DIRECTIONS.KING) {
      const newPos = { row: pos.row + delta.row, col: pos.col + delta.col };
      if (this.isOnBoard(newPos)) {
        const targetPiece = state.board[newPos.row][newPos.col];
        if (!targetPiece || targetPiece.color !== color) {
          moves.push(newPos);
        }
      }
    }

    // Castling
    const piece = state.board[pos.row][pos.col];
    if (piece && !piece.hasMoved && !this.isKingInCheck(state, color)) {
      // Kingside castling
      if (this.canCastleKingside(state, color)) {
        moves.push({ row: pos.row, col: pos.col + 2 });
      }
      // Queenside castling
      if (this.canCastleQueenside(state, color)) {
        moves.push({ row: pos.row, col: pos.col - 2 });
      }
    }

    return moves;
  }

  private getSlidingMoves(
    state: ChessState,
    pos: Position,
    color: PieceColor,
    directions: { row: number; col: number }[]
  ): Position[] {
    const moves: Position[] = [];

    for (const delta of directions) {
      let newPos = { row: pos.row + delta.row, col: pos.col + delta.col };
      while (this.isOnBoard(newPos)) {
        const targetPiece = state.board[newPos.row][newPos.col];
        if (!targetPiece) {
          moves.push({ ...newPos });
        } else {
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

  // ============ SPECIAL MOVES ============

  private canCastleKingside(state: ChessState, color: PieceColor): boolean {
    const row = color === 'white' ? 7 : 0;
    const rights = color === 'white' ? state.castlingRights.whiteKingside : state.castlingRights.blackKingside;

    if (!rights) return false;

    // Check if squares between king and rook are empty
    if (state.board[row][5] || state.board[row][6]) return false;

    // Check if king passes through or ends in check
    const enemyColor = color === 'white' ? 'black' : 'white';
    if (this.isSquareAttacked(state, { row, col: 4 }, enemyColor)) return false;
    if (this.isSquareAttacked(state, { row, col: 5 }, enemyColor)) return false;
    if (this.isSquareAttacked(state, { row, col: 6 }, enemyColor)) return false;

    return true;
  }

  private canCastleQueenside(state: ChessState, color: PieceColor): boolean {
    const row = color === 'white' ? 7 : 0;
    const rights = color === 'white' ? state.castlingRights.whiteQueenside : state.castlingRights.blackQueenside;

    if (!rights) return false;

    // Check if squares between king and rook are empty
    if (state.board[row][1] || state.board[row][2] || state.board[row][3]) return false;

    // Check if king passes through or ends in check
    const enemyColor = color === 'white' ? 'black' : 'white';
    if (this.isSquareAttacked(state, { row, col: 4 }, enemyColor)) return false;
    if (this.isSquareAttacked(state, { row, col: 3 }, enemyColor)) return false;
    if (this.isSquareAttacked(state, { row, col: 2 }, enemyColor)) return false;

    return true;
  }

  private isPawnPromotion(piece: Piece, to: Position): boolean {
    if (piece.type !== 'P') return false;
    return (piece.color === 'white' && to.row === 0) || (piece.color === 'black' && to.row === 7);
  }

  // ============ CHECK & CHECKMATE ============

  isKingInCheck(state: ChessState, color: PieceColor): boolean {
    const kingPos = this.findKing(state.board, color);
    if (!kingPos) return false;
    const enemyColor = color === 'white' ? 'black' : 'white';
    return this.isSquareAttacked(state, kingPos, enemyColor);
  }

  private isSquareAttacked(state: ChessState, pos: Position, byColor: PieceColor): boolean {
    // Check all enemy pieces
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

  private getAttackSquares(state: ChessState, pos: Position, piece: Piece): Position[] {
    // For attack squares, we don't include castling for king
    // and we use capture squares for pawns (diagonal)
    switch (piece.type) {
      case 'P': {
        const direction = piece.color === 'white' ? -1 : 1;
        const attacks: Position[] = [];
        for (const colOffset of [-1, 1]) {
          const attackPos = { row: pos.row + direction, col: pos.col + colOffset };
          if (this.isOnBoard(attackPos)) {
            attacks.push(attackPos);
          }
        }
        return attacks;
      }
      case 'N': return this.getKnightMoves(state, pos, piece.color);
      case 'B': return this.getSlidingMoves(state, pos, piece.color, DIRECTIONS.BISHOP);
      case 'R': return this.getSlidingMoves(state, pos, piece.color, DIRECTIONS.ROOK);
      case 'Q': return this.getSlidingMoves(state, pos, piece.color, QUEEN_DIRECTIONS);
      case 'K': {
        const attacks: Position[] = [];
        for (const delta of DIRECTIONS.KING) {
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

  private findKing(board: Board, color: PieceColor): Position | null {
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

  private hasAnyLegalMoves(state: ChessState, color: PieceColor): boolean {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = state.board[row][col];
        if (piece && piece.color === color) {
          const moves = this.getValidMoves(state, { row, col });
          if (moves.length > 0) return true;
        }
      }
    }
    return false;
  }

  // ============ DRAW CONDITIONS ============

  private isInsufficientMaterial(state: ChessState): boolean {
    const pieces: { type: PieceType; color: PieceColor; pos: Position }[] = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = state.board[row][col];
        if (piece) {
          pieces.push({ type: piece.type, color: piece.color, pos: { row, col } });
        }
      }
    }

    // King vs King
    if (pieces.length === 2) return true;

    // King + Bishop vs King or King + Knight vs King
    if (pieces.length === 3) {
      const nonKings = pieces.filter(p => p.type !== 'K');
      if (nonKings.length === 1 && (nonKings[0].type === 'B' || nonKings[0].type === 'N')) {
        return true;
      }
    }

    // King + Bishop vs King + Bishop (same color squares)
    if (pieces.length === 4) {
      const bishops = pieces.filter(p => p.type === 'B');
      if (bishops.length === 2) {
        const colors = bishops.map(b => (b.pos.row + b.pos.col) % 2);
        if (colors[0] === colors[1]) return true;
      }
    }

    return false;
  }

  // ============ GAME END ============

  checkGameEnd(state: ChessState): ChessGameEndResult | null {
    // Checkmate
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

    // Stalemate
    if (state.isStalemate) {
      return {
        winnerId: null,
        winnerColor: null,
        isDraw: true,
        reason: 'stalemate',
      };
    }

    // Insufficient material
    if (this.isInsufficientMaterial(state)) {
      return {
        winnerId: null,
        winnerColor: null,
        isDraw: true,
        reason: 'insufficient_material',
      };
    }

    // 50-move rule
    if (state.halfMoveClock >= 100) {
      return {
        winnerId: null,
        winnerColor: null,
        isDraw: true,
        reason: 'fifty_move',
      };
    }

    // Threefold repetition
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

  forfeitGame(state: ChessState, forfeitingPlayerId: string): ChessGameEndResult {
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

  // ============ UTILITIES ============

  private deepCopyBoard(board: Board): Board {
    return board.map(row =>
      row.map(cell => (cell ? { ...cell } : null))
    );
  }

  private simulateMove(state: ChessState, from: Position, to: Position): ChessState {
    const newBoard = this.deepCopyBoard(state.board);
    const piece = newBoard[from.row][from.col];

    // Handle en passant
    if (piece?.type === 'P' && state.enPassantTarget &&
        to.row === state.enPassantTarget.row && to.col === state.enPassantTarget.col) {
      const capturedPawnRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
      newBoard[capturedPawnRow][to.col] = null;
    }

    newBoard[to.row][to.col] = piece;
    newBoard[from.row][from.col] = null;

    return { ...state, board: newBoard };
  }

  private isOnBoard(pos: Position): boolean {
    return pos.row >= 0 && pos.row < 8 && pos.col >= 0 && pos.col < 8;
  }

  getPlayerColor(state: ChessState, playerId: string): PieceColor | null {
    if (state.playerWhite === playerId) return 'white';
    if (state.playerBlack === playerId) return 'black';
    return null;
  }

  positionToAlgebraic(pos: Position): string {
    return FILES[pos.col] + (8 - pos.row);
  }

  algebraicToPosition(square: string): Position {
    const col = FILES.indexOf(square[0]);
    const row = 8 - parseInt(square[1], 10);
    return { row, col };
  }

  private generatePositionFen(state: ChessState): string {
    // Generate FEN for position comparison (without move counters)
    let fen = '';

    // Board position
    for (let row = 0; row < 8; row++) {
      let emptyCount = 0;
      for (let col = 0; col < 8; col++) {
        const piece = state.board[row][col];
        if (piece) {
          if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
          }
          fen += FEN_PIECES[piece.color][piece.type];
        } else {
          emptyCount++;
        }
      }
      if (emptyCount > 0) fen += emptyCount;
      if (row < 7) fen += '/';
    }

    // Turn
    fen += ' ' + (state.currentTurn === 'white' ? 'w' : 'b');

    // Castling rights
    let castling = '';
    if (state.castlingRights.whiteKingside) castling += 'K';
    if (state.castlingRights.whiteQueenside) castling += 'Q';
    if (state.castlingRights.blackKingside) castling += 'k';
    if (state.castlingRights.blackQueenside) castling += 'q';
    fen += ' ' + (castling || '-');

    // En passant
    if (state.enPassantTarget) {
      fen += ' ' + this.positionToAlgebraic(state.enPassantTarget);
    } else {
      fen += ' -';
    }

    return fen;
  }

  private createMoveRecord(
    oldState: ChessState,
    newState: ChessState,
    from: Position,
    to: Position,
    piece: Piece,
    promotionPiece?: PieceType
  ): ChessMove {
    const capturedPiece = oldState.board[to.row][to.col] || undefined;
    const isCastling = piece.type === 'K' && Math.abs(to.col - from.col) === 2
      ? (to.col > from.col ? 'kingside' : 'queenside')
      : undefined;
    const isEnPassant = piece.type === 'P' && oldState.enPassantTarget &&
      to.row === oldState.enPassantTarget.row && to.col === oldState.enPassantTarget.col
      ? true : undefined;

    // Generate notation
    let notation = '';
    if (isCastling === 'kingside') {
      notation = 'O-O';
    } else if (isCastling === 'queenside') {
      notation = 'O-O-O';
    } else {
      if (piece.type !== 'P') {
        notation += piece.type;
        // Disambiguation if needed
        const ambiguous = this.findAmbiguousPieces(oldState, piece, from, to);
        if (ambiguous.length > 0) {
          if (ambiguous.every(p => p.col !== from.col)) {
            notation += FILES[from.col];
          } else if (ambiguous.every(p => p.row !== from.row)) {
            notation += (8 - from.row);
          } else {
            notation += FILES[from.col] + (8 - from.row);
          }
        }
      }
      if (capturedPiece || isEnPassant) {
        if (piece.type === 'P') {
          notation += FILES[from.col];
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
    } else if (newState.isCheck) {
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

  private findAmbiguousPieces(state: ChessState, piece: Piece, from: Position, to: Position): Position[] {
    const ambiguous: Position[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (row === from.row && col === from.col) continue;
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

  // Get all valid moves for frontend highlighting
  getAllValidMovesForPlayer(state: ChessState, playerId: string): { from: Position; to: Position }[] {
    const color = this.getPlayerColor(state, playerId);
    if (!color) return [];

    const allMoves: { from: Position; to: Position }[] = [];
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
}

