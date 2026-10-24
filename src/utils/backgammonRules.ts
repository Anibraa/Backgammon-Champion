import { BoardState, Player, MoveCandidate, MoveStep, WinType } from '../types/backgammon';

/**
 * Creates the standard 15-checker Backgammon initial board.
 * Points 1..24
 * White moves 24 -> 1, bears off at 1..6
 * Black moves 1 -> 24, bears off at 19..24
 */
export function createInitialBoard(): BoardState {
  const points = Array.from({ length: 25 }, (_, i) => ({
    pointIndex: i,
    player: null as Player | null,
    count: 0,
  }));

  // Standard Backgammon Starting Setup
  // White:
  points[24] = { pointIndex: 24, player: 'white', count: 2 };
  points[13] = { pointIndex: 13, player: 'white', count: 5 };
  points[8]  = { pointIndex: 8,  player: 'white', count: 3 };
  points[6]  = { pointIndex: 6,  player: 'white', count: 5 };

  // Black:
  points[1]  = { pointIndex: 1,  player: 'black', count: 2 };
  points[12] = { pointIndex: 12, player: 'black', count: 5 };
  points[17] = { pointIndex: 17, player: 'black', count: 3 };
  points[19] = { pointIndex: 19, player: 'black', count: 5 };

  return {
    points,
    bar: { white: 0, black: 0 },
    bornOff: { white: 0, black: 0 },
  };
}

export function cloneBoard(board: BoardState): BoardState {
  return {
    points: board.points.map((p) => ({ ...p })),
    bar: { ...board.bar },
    bornOff: { ...board.bornOff },
  };
}

/**
 * Calculates Pip Count (distance of all checkers to bearing off).
 */
export function calculatePips(board: BoardState): { white: number; black: number } {
  let whitePips = board.bar.white * 25;
  let blackPips = board.bar.black * 25;

  for (let i = 1; i <= 24; i++) {
    const pt = board.points[i];
    if (pt.player === 'white') {
      whitePips += pt.count * i;
    } else if (pt.player === 'black') {
      blackPips += pt.count * (25 - i);
    }
  }

  return { white: whitePips, black: blackPips };
}

/**
 * Checks if a player can bear off:
 * 1) No checkers on the bar
 * 2) All remaining checkers are inside home board (White: 1..6, Black: 19..24)
 */
export function canBearOff(board: BoardState, player: Player): boolean {
  if (board.bar[player] > 0) return false;

  if (player === 'white') {
    for (let i = 7; i <= 24; i++) {
      if (board.points[i].player === 'white' && board.points[i].count > 0) {
        return false;
      }
    }
  } else {
    for (let i = 1; i <= 18; i++) {
      if (board.points[i].player === 'black' && board.points[i].count > 0) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Check if a single move with a specific die is valid from the given position.
 */
export function isValidSingleMove(
  board: BoardState,
  player: Player,
  from: number | 'bar',
  die: number
): { valid: boolean; to: number | 'off'; hit: boolean } {
  const opponent: Player = player === 'white' ? 'black' : 'white';

  // 1. From Bar
  if (from === 'bar') {
    if (board.bar[player] <= 0) {
      return { valid: false, to: 'off', hit: false };
    }
    const targetPoint = player === 'white' ? 25 - die : die;
    const target = board.points[targetPoint];

    if (target.player === opponent && target.count >= 2) {
      return { valid: false, to: 'off', hit: false }; // blocked
    }

    const hit = target.player === opponent && target.count === 1;
    return { valid: true, to: targetPoint, hit };
  }

  // 2. Cannot move from board if checkers are on bar
  if (board.bar[player] > 0) {
    return { valid: false, to: 'off', hit: false };
  }

  const source = board.points[from];
  if (source.player !== player || source.count <= 0) {
    return { valid: false, to: 'off', hit: false };
  }

  // White moves down (p - die)
  if (player === 'white') {
    const targetPoint = from - die;

    if (targetPoint >= 1) {
      const target = board.points[targetPoint];
      if (target.player === opponent && target.count >= 2) {
        return { valid: false, to: 'off', hit: false };
      }
      const hit = target.player === opponent && target.count === 1;
      return { valid: true, to: targetPoint, hit };
    }

    // Target <= 0 means bearing off
    if (!canBearOff(board, 'white')) {
      return { valid: false, to: 'off', hit: false };
    }

    if (targetPoint === 0) {
      // Exact die
      return { valid: true, to: 'off', hit: false };
    }

    // targetPoint < 0: die is greater than point number
    // Valid only if there are no white checkers on higher points in home board
    for (let i = from + 1; i <= 6; i++) {
      if (board.points[i].player === 'white' && board.points[i].count > 0) {
        return { valid: false, to: 'off', hit: false };
      }
    }
    return { valid: true, to: 'off', hit: false };
  }

  // Black moves up (p + die)
  const targetPoint = from + die;

  if (targetPoint <= 24) {
    const target = board.points[targetPoint];
    if (target.player === opponent && target.count >= 2) {
      return { valid: false, to: 'off', hit: false };
    }
    const hit = target.player === opponent && target.count === 1;
    return { valid: true, to: targetPoint, hit };
  }

  // Target >= 25 means bearing off
  if (!canBearOff(board, 'black')) {
    return { valid: false, to: 'off', hit: false };
  }

  if (targetPoint === 25) {
    return { valid: true, to: 'off', hit: false };
  }

  // targetPoint > 25: die is greater than required distance
  // Valid only if no black checkers exist on points with greater distance (19..from-1)
  for (let i = 19; i < from; i++) {
    if (board.points[i].player === 'black' && board.points[i].count > 0) {
      return { valid: false, to: 'off', hit: false };
    }
  }

  return { valid: true, to: 'off', hit: false };
}

/**
 * Applies a move to the board and returns the new board state.
 */
export function applyMove(
  board: BoardState,
  player: Player,
  from: number | 'bar',
  to: number | 'off',
  dieUsed: number
): { nextBoard: BoardState; step: MoveStep } {
  const next = cloneBoard(board);
  const opponent: Player = player === 'white' ? 'black' : 'white';
  let isHit = false;

  // Deduct from source
  if (from === 'bar') {
    next.bar[player]--;
  } else {
    next.points[from].count--;
    if (next.points[from].count === 0) {
      next.points[from].player = null;
    }
  }

  // Place at target
  if (to === 'off') {
    next.bornOff[player]++;
  } else {
    const target = next.points[to];
    if (target.player === opponent && target.count === 1) {
      // Hit!
      isHit = true;
      target.player = player;
      target.count = 1;
      next.bar[opponent]++;
    } else {
      target.player = player;
      target.count++;
    }
  }

  const step: MoveStep = {
    from,
    to,
    dieUsed,
    hit: isHit,
  };

  return { nextBoard: next, step };
}

/**
 * Gets all single legal moves currently possible with a given set of dice.
 */
export function getSingleLegalMoves(
  board: BoardState,
  player: Player,
  availableDice: number[]
): MoveCandidate[] {
  const results: MoveCandidate[] = [];
  const uniqueDice = Array.from(new Set(availableDice));

  if (board.bar[player] > 0) {
    for (const die of uniqueDice) {
      const check = isValidSingleMove(board, player, 'bar', die);
      if (check.valid) {
        results.push({
          from: 'bar',
          to: check.to,
          die,
          isHit: check.hit,
        });
      }
    }
    return results;
  }

  for (let p = 1; p <= 24; p++) {
    if (board.points[p].player === player && board.points[p].count > 0) {
      for (const die of uniqueDice) {
        const check = isValidSingleMove(board, player, p, die);
        if (check.valid) {
          results.push({
            from: p,
            to: check.to,
            die,
            isHit: check.hit,
          });
        }
      }
    }
  }

  return results;
}

export interface SequenceResult {
  steps: MoveStep[];
  finalBoard: BoardState;
}

/**
 * Recursively find all valid full-turn move sequences using the available dice.
 */
export function findAllTurnSequences(
  board: BoardState,
  player: Player,
  dice: number[]
): SequenceResult[] {
  const sequences: SequenceResult[] = [];

  function search(currentBoard: BoardState, remainingDice: number[], currentSteps: MoveStep[]) {
    // Try each unique die in remainingDice
    const uniqueDice = Array.from(new Set(remainingDice));
    let anyMoveMade = false;

    // Check bar first
    if (currentBoard.bar[player] > 0) {
      for (const die of uniqueDice) {
        const check = isValidSingleMove(currentBoard, player, 'bar', die);
        if (check.valid) {
          anyMoveMade = true;
          const { nextBoard, step } = applyMove(currentBoard, player, 'bar', check.to, die);
          const nextDice = [...remainingDice];
          const dieIndex = nextDice.indexOf(die);
          nextDice.splice(dieIndex, 1);
          search(nextBoard, nextDice, [...currentSteps, step]);
        }
      }
    } else {
      for (let p = 1; p <= 24; p++) {
        if (currentBoard.points[p].player === player && currentBoard.points[p].count > 0) {
          for (const die of uniqueDice) {
            const check = isValidSingleMove(currentBoard, player, p, die);
            if (check.valid) {
              anyMoveMade = true;
              const { nextBoard, step } = applyMove(currentBoard, player, p, check.to, die);
              const nextDice = [...remainingDice];
              const dieIndex = nextDice.indexOf(die);
              nextDice.splice(dieIndex, 1);
              search(nextBoard, nextDice, [...currentSteps, step]);
            }
          }
        }
      }
    }

    if (!anyMoveMade) {
      // Leaf node in move tree
      sequences.push({
        steps: currentSteps,
        finalBoard: currentBoard,
      });
    }
  }

  search(board, dice, []);

  if (sequences.length === 0) {
    return [{ steps: [], finalBoard: board }];
  }

  // Filter according to standard Backgammon rules:
  // 1. Must use the MAXIMUM number of checkers/dice possible
  const maxMoves = Math.max(...sequences.map((s) => s.steps.length));
  let filtered = sequences.filter((s) => s.steps.length === maxMoves);

  // 2. If maxMoves === 1 and initial dice were 2 different dice [d1, d2],
  //    and one sequence uses higher die and one uses lower die, player MUST use the higher die
  if (maxMoves === 1 && dice.length === 2 && dice[0] !== dice[1]) {
    const higherDie = Math.max(dice[0], dice[1]);
    const higherDieSequences = filtered.filter((s) => s.steps[0]?.dieUsed === higherDie);
    if (higherDieSequences.length > 0) {
      filtered = higherDieSequences;
    }
  }

  // Deduplicate identical sequences
  const seen = new Set<string>();
  const uniqueSequences: SequenceResult[] = [];
  for (const seq of filtered) {
    const key = seq.steps.map((s) => `${s.from}->${s.to}:${s.dieUsed}`).join('|');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSequences.push(seq);
    }
  }

  return uniqueSequences;
}

/**
 * Determine victory type: normal (1x), gammon (2x), backgammon (3x)
 */
export function checkWinType(board: BoardState, winner: Player): WinType {
  const loser: Player = winner === 'white' ? 'black' : 'white';

  if (board.bornOff[loser] > 0) {
    return 'normal';
  }

  // Loser has 0 born off checkers
  // If loser still has checkers on the bar or in the winner's home board: Backgammon!
  if (board.bar[loser] > 0) {
    return 'backgammon';
  }

  // Winner's home board:
  // For white winner, white's home board is 1..6
  // For black winner, black's home board is 19..24
  if (winner === 'white') {
    for (let i = 1; i <= 6; i++) {
      if (board.points[i].player === loser && board.points[i].count > 0) {
        return 'backgammon';
      }
    }
  } else {
    for (let i = 19; i <= 24; i++) {
      if (board.points[i].player === loser && board.points[i].count > 0) {
        return 'backgammon';
      }
    }
  }

  return 'gammon';
}
