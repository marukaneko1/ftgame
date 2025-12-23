export const GAME_TYPES = ["chess", "trivia", "tictactoe"] as const;
export type GameType = (typeof GAME_TYPES)[number];


