import { BoardState, Player, Difficulty, MoveStep } from '../types/backgammon';
import { findAllTurnSequences, calculatePips } from './backgammonRules';

/**
 * Probability table: number of rolls (out of 36) that can hit a blot at distance d (1..24)
 * For direct shots (1..6) and combination shots (7..12, etc.)
 */
const HIT_COMBINATIONS: { [distance: number]: number } = {
  1: 11, // 1-x, x-1, 1-1
  2: 12, // 2-x, x-2, 1-1, 2-2
  3: 14, // 3-x, x-3, 1-2, 2-1, 1-1, 3-3
  4: 15, // 4-x, x-4, 1-3, 3-1, 2-2, 4-4
  5: 15, // 5-x, x-5, 1-4, 4-1, 2-3, 3-2
  6: 17, // 6-x, x-6, 1-5, 5-1, 2-4, 4-2, 3-3, 2-2
  7: 6,  // 1-6, 6-1, 2-5, 5-2, 3-4, 4-3
  8: 6,  // 2-6, 6-2, 3-5, 5-3, 4-4, 2-2
  9: 5,  // 3-6, 6-3, 4-5, 5-4, 3-3
  10: 3, // 4-6, 6-4, 5-5
  11: 2, // 5-6, 6-5
  12: 3, // 6-6, 3-3, 4-4
};

/**
 * Evaluates board position from the perspective of `evalPlayer` ('black' or 'white').
 * Higher score is better for `evalPlayer`.
 */
export function evaluateBoard(board: BoardState, evalPlayer: Player, difficulty: Difficulty): number {
  const oppPlayer: Player = evalPlayer === 'white' ? 'black' : 'white';
  const pips = calculatePips(board);
  const evalPips = pips[evalPlayer];
  const oppPips = pips[oppPlayer];

  // 1. Pip count race differential (lower pips is better)
  let score = (oppPips - evalPips) * 1.5;

  // 2. Born off checkers (massive value)
  score += board.bornOff[evalPlayer] * 65;
  score -= board.bornOff[oppPlayer] * 65;

  // 3. Opponent checkers on bar (huge advantage)
  score += board.bar[oppPlayer] * 80;
  // Own checkers on bar (huge liability)
  score -= board.bar[evalPlayer] * 95;

  if (difficulty === 'easy') {
    // Easy AI only looks at basic pips, hits, and bear-offs
    return score;
  }

  // Points analysis
  let ownBlots = 0;
  let ownPrimesConsecutive = 0;
  let maxOwnPrime = 0;

  for (let i = 1; i <= 24; i++) {
    const pt = board.points[i];

    if (pt.player === evalPlayer) {
      if (pt.count === 1) {
        ownBlots++;
        // Penalty for exposed blot
        let blotPenalty = 28;

        if (difficulty === 'hard') {
          // Calculate direct danger from opponent checkers
          let totalHitChances = 0;
          // Check opponent checkers on bar
          if (board.bar[oppPlayer] > 0) {
            // Distance from bar
            const distFromBar = evalPlayer === 'black' ? i : (25 - i);
            if (HIT_COMBINATIONS[distFromBar]) {
              totalHitChances += HIT_COMBINATIONS[distFromBar];
            }
          }

          // Check opponent checkers on board that can attack
          for (let oppPt = 1; oppPt <= 24; oppPt++) {
            if (board.points[oppPt].player === oppPlayer && board.points[oppPt].count > 0) {
              const dist = evalPlayer === 'black' ? (i - oppPt) : (oppPt - i);
              if (dist > 0 && HIT_COMBINATIONS[dist]) {
                totalHitChances += Math.min(HIT_COMBINATIONS[dist], 15);
              }
            }
          }
          blotPenalty += Math.min(totalHitChances * 1.8, 65);
        }

        score -= blotPenalty;
      } else if (pt.count >= 2) {
        // Made point bonus
        score += 24;

        // Premium key points bonus (5, 7, 20)
        if (evalPlayer === 'black') {
          if (i === 20 || i === 21) score += 20; // Golden point / Anchor in white's home
          if (i === 5 || i === 7) score += 18;   // Outer control
        } else {
          if (i === 5 || i === 7) score += 20;   // White golden points
          if (i === 20 || i === 21) score += 18; // White anchors
        }

        // Penalty for overstacking (checkers > 5 on one point lose flexibility)
        if (pt.count > 5) {
          score -= (pt.count - 5) * 8;
        }

        ownPrimesConsecutive++;
        if (ownPrimesConsecutive > maxOwnPrime) {
          maxOwnPrime = ownPrimesConsecutive;
        }
      } else {
        ownPrimesConsecutive = 0;
      }
    } else {
      ownPrimesConsecutive = 0;
    }
  }

  // Bonus for primes (blocking opponent escape)
  if (maxOwnPrime >= 3) {
    score += (maxOwnPrime - 2) * 25;
  }
  if (maxOwnPrime >= 5) {
    score += 50; // Near-wall / Full-prime block
  }

  return score;
}

/**
 * Chooses the best turn sequence for the given player and difficulty.
 */
export function chooseBestTurn(
  board: BoardState,
  player: Player,
  dice: number[],
  difficulty: Difficulty
): { steps: MoveStep[]; score: number } | null {
  const sequences = findAllTurnSequences(board, player, dice);

  if (sequences.length === 0 || sequences[0].steps.length === 0) {
    return null;
  }

  // Easy mode: 45% chance of picking randomly among valid sequences
  if (difficulty === 'easy') {
    if (Math.random() < 0.45) {
      const randomSeq = sequences[Math.floor(Math.random() * sequences.length)];
      return {
        steps: randomSeq.steps,
        score: evaluateBoard(randomSeq.finalBoard, player, 'easy'),
      };
    }
  }

  let bestSeq = sequences[0];
  let bestScore = -Infinity;

  for (const seq of sequences) {
    let evalScore = evaluateBoard(seq.finalBoard, player, difficulty);

    // Medium mode: small random noise (+/- 8) so computer isn't completely robotic
    if (difficulty === 'medium') {
      evalScore += (Math.random() - 0.5) * 16;
    }

    if (evalScore > bestScore) {
      bestScore = evalScore;
      bestSeq = seq;
    }
  }

  return {
    steps: bestSeq.steps,
    score: bestScore,
  };
}
