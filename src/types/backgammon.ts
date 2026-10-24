export type Player = 'white' | 'black'; // 'white' = Human/Player 1, 'black' = Computer/Player 2

export type GameMode = 'vs-computer' | 'local-2p' | 'tournament' | 'online';

export interface TournamentPlayer {
  id: string;
  name: string;
  wins: number;
  losses: number;
  points: number;
  gammonsWon: number;
  backgammonsWon: number;
}

export interface TournamentMatch {
  id: string;
  whitePlayerId: string;
  blackPlayerId: string;
  winnerPlayerId?: string;
  winType?: WinType;
  round: number;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export type BoardTheme = 'classic';

// Points are indexed 1 to 24
// Point 0 is White Bear-off (Off), Point 25 is Black Bear-off (Off)
// Bar checkers stored separately: bar: { white: number, black: number }
// Born off checkers stored separately: bornOff: { white: number, black: number }

export interface PointState {
  pointIndex: number; // 1 to 24
  player: Player | null;
  count: number;
}

export interface BoardState {
  // points[1..24] - 1-based index for easy reasoning
  points: PointState[];
  bar: {
    white: number;
    black: number;
  };
  bornOff: {
    white: number;
    black: number;
  };
}

export interface MoveStep {
  from: number | 'bar'; // point 1..24 or 'bar'
  to: number | 'off';   // point 1..24 or 'off'
  dieUsed: number;
  hit: boolean;
}

export interface TurnState {
  currentPlayer: Player;
  dice: number[];          // All dice rolled this turn, e.g. [3, 5] or [4, 4, 4, 4]
  diceRemaining: number[]; // Dice still available to play
  movesPlayed: MoveStep[]; // Moves executed in the current turn
  isRolling: boolean;
  hasRolled: boolean;
  canRoll: boolean;
}

export type GameStatus = 'playing' | 'game-over';

export interface GameStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  gammonsWon: number;
  gammonsLost: number;
  backgammonsWon: number;
  backgammonsLost: number;
  currentStreak: number;
  bestStreak: number;
}

export type WinType = 'normal' | 'gammon' | 'backgammon';

export interface MoveCandidate {
  from: number | 'bar';
  to: number | 'off';
  die: number;
  isHit: boolean;
}

export interface AIActiveMove {
  from: number | 'bar';
  to: number | 'off';
  die: number;
  phase: 'highlight-source' | 'dragging' | 'highlight-target' | 'moved';
  player?: Player;
}
