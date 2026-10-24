import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BoardState,
  Player,
  Difficulty,
  BoardTheme,
  MoveStep,
  GameStats,
  WinType,
  AIActiveMove,
  GameMode,
  TournamentPlayer,
} from './types/backgammon';
import {
  createInitialBoard,
  cloneBoard,
  calculatePips,
  findAllTurnSequences,
  applyMove,
  checkWinType,
} from './utils/backgammonRules';
import { chooseBestTurn } from './utils/backgammonAI';
import { sound } from './utils/audio';
import { Board } from './components/Board';
import { Header } from './components/Header';
import { RulesModal } from './components/RulesModal';
import { StatsModal } from './components/StatsModal';
import { GameOverModal } from './components/GameOverModal';
import { TournamentModal } from './components/TournamentModal';
import { PlayerNamesModal } from './components/PlayerNamesModal';
import { OnlineLobbyModal } from './components/OnlineLobbyModal';
import {
  createOnlineRoom,
  joinOnlineRoom,
  subscribeToOnlineRoom,
  updateOnlineRoomState,
  type OnlineRoomData,
} from './utils/firebase';
import { LogOut } from 'lucide-react';

const STATS_STORAGE_KEY = 'bg_master_stats';
const TOURNAMENT_PLAYERS_KEY = 'bg_tournament_players';
const LOCAL_SCORES_KEY = 'bg_local_scores';
const P1_NAME_KEY = 'bg_player1_name';
const P2_NAME_KEY = 'bg_player2_name';

const DEFAULT_STATS: GameStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  gammonsWon: 0,
  gammonsLost: 0,
  backgammonsWon: 0,
  backgammonsLost: 0,
  currentStreak: 0,
  bestStreak: 0,
};

const DEFAULT_TOURNAMENT_PLAYERS: TournamentPlayer[] = [
  { id: 'p1', name: 'Spieler 1', wins: 0, losses: 0, points: 0, gammonsWon: 0, backgammonsWon: 0 },
  { id: 'p2', name: 'Spieler 2', wins: 0, losses: 0, points: 0, gammonsWon: 0, backgammonsWon: 0 },
  { id: 'p3', name: 'Spieler 3', wins: 0, losses: 0, points: 0, gammonsWon: 0, backgammonsWon: 0 },
  { id: 'p4', name: 'Spieler 4', wins: 0, losses: 0, points: 0, gammonsWon: 0, backgammonsWon: 0 },
];

export default function App() {
  // Game Mode & Multiplayer Setup
  const [gameMode, setGameMode] = useState<GameMode>('vs-computer');
  const [player1Name, setPlayer1Name] = useState<string>(() => {
    return localStorage.getItem(P1_NAME_KEY) || 'Spieler 1';
  });
  const [player2Name, setPlayer2Name] = useState<string>(() => {
    return localStorage.getItem(P2_NAME_KEY) || 'Spieler 2';
  });
  const [localScores, setLocalScores] = useState<{ white: number; black: number }>(() => {
    try {
      const s = localStorage.getItem(LOCAL_SCORES_KEY);
      return s ? JSON.parse(s) : { white: 0, black: 0 };
    } catch {
      return { white: 0, black: 0 };
    }
  });

  // Online Multiplayer State (Firebase)
  const [isOnlineLobbyOpen, setIsOnlineLobbyOpen] = useState<boolean>(false);
  const [onlineRoomId, setOnlineRoomId] = useState<string | null>(null);
  const [onlineRole, setOnlineRole] = useState<'white' | 'black' | 'spectator' | null>(null);
  const [isOnlineConnecting, setIsOnlineConnecting] = useState<boolean>(false);
  const [isHostWaiting, setIsHostWaiting] = useState<boolean>(false);

  // Tournament State (for 2-8 players)
  const [tournamentPlayers, setTournamentPlayers] = useState<TournamentPlayer[]>(() => {
    try {
      const s = localStorage.getItem(TOURNAMENT_PLAYERS_KEY);
      return s ? JSON.parse(s) : DEFAULT_TOURNAMENT_PLAYERS;
    } catch {
      return DEFAULT_TOURNAMENT_PLAYERS;
    }
  });
  const [tournamentWhiteId, setTournamentWhiteId] = useState<string>('p1');
  const [tournamentBlackId, setTournamentBlackId] = useState<string>('p2');
  const [tournamentTargetPoints, setTournamentTargetPoints] = useState<number>(5);

  // Game Board & Core State
  const [board, setBoard] = useState<BoardState>(createInitialBoard);
  const [currentPlayer, setCurrentPlayer] = useState<Player>('white');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [theme, setTheme] = useState<BoardTheme>('classic');
  const [showPointNumbers, setShowPointNumbers] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());

  // Dice & Turn
  const [humanDice, setHumanDice] = useState<number[]>([]);
  const [humanDiceRemaining, setHumanDiceRemaining] = useState<number[]>([]);
  const [computerDice, setComputerDice] = useState<number[]>([]);
  const [computerDiceRemaining, setComputerDiceRemaining] = useState<number[]>([]);
  const [movesPlayed, setMovesPlayed] = useState<MoveStep[]>([]);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [hasRolled, setHasRolled] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>(
    'Willkommen! Würfle, um dein Spiel zu beginnen.'
  );

  // Undo Snapshot History within the current turn
  const [turnHistory, setTurnHistory] = useState<
    Array<{ board: BoardState; diceRemaining: number[]; step: MoveStep }>
  >([]);

  // Selection & UI highlights
  const [selectedPoint, setSelectedPoint] = useState<number | 'bar' | null>(null);
  const [validTargets, setValidTargets] = useState<
    Array<{ to: number | 'off'; die: number; isHit: boolean }>
  >([]);
  const [hintStep, setHintStep] = useState<{
    from: number | 'bar';
    to: number | 'off';
  } | null>(null);

  // AI deliberate slow-move tracking (only used vs-computer)
  const [aiActiveMove, setAiActiveMove] = useState<AIActiveMove | null>(null);
  const [lastAIMoves, setLastAIMoves] = useState<MoveStep[]>([]);
  const [lastAIMoveSummary, setLastAIMoveSummary] = useState<string | null>(null);

  // Game End & Modals
  const [gameStatus, setGameStatus] = useState<'playing' | 'game-over'>('playing');
  const [winner, setWinner] = useState<Player | null>(null);
  const [winType, setWinType] = useState<WinType>('normal');
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
  const [isGameOverOpen, setIsGameOverOpen] = useState<boolean>(false);
  const [isTournamentOpen, setIsTournamentOpen] = useState<boolean>(false);
  const [isPlayerNamesOpen, setIsPlayerNamesOpen] = useState<boolean>(false);

  // Persistent Stats (Single player against computer)
  const [stats, setStats] = useState<GameStats>(() => {
    try {
      const saved = localStorage.getItem(STATS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_STATS;
    } catch {
      return DEFAULT_STATS;
    }
  });

  // Active human player turn check
  const isHumanTurn =
    gameMode === 'vs-computer'
      ? currentPlayer === 'white'
      : gameMode === 'online'
      ? onlineRole === currentPlayer
      : true;

  const pips = calculatePips(board);

  // Active player display names
  const activeWhiteName = gameMode === 'vs-computer' ? 'Du' : player1Name;
  const activeBlackName = gameMode === 'vs-computer' ? 'Gegner (KI)' : player2Name;
  const activePlayerName = currentPlayer === 'white' ? activeWhiteName : activeBlackName;

  // Dice remaining for the active player's turn
  const currentDiceRemaining = currentPlayer === 'white' ? humanDiceRemaining : computerDiceRemaining;

  const [urlRoomParam, setUrlRoomParam] = useState<string>('');

  // Auto-detect URL parameter for room join (e.g. ?room=BG749)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setUrlRoomParam(roomParam);
      setGameMode('online');
      setIsOnlineLobbyOpen(true);
    }
  }, []);

  const prevHasRolledRef = useRef<boolean>(false);
  const lastProcessedRollIdRef = useRef<number>(0);
  const isOpponentRollingActiveRef = useRef<boolean>(false);
  const opponentRollTimeoutRef = useRef<any>(null);
  const opponentMoveTimeoutRef = useRef<any>(null);
  const autoEndTurnTimeoutRef = useRef<any>(null);
  const latestRoomDataRef = useRef<OnlineRoomData | null>(null);
  const currentTurnPlayerRef = useRef<Player>('white');
  const pendingOpponentDiceRef = useRef<{ dice: number[]; remaining: number[] } | null>(null);
  const onlineRoomIdRef = useRef<string | null>(onlineRoomId);
  const isHostWaitingRef = useRef<boolean>(isHostWaiting);
  const isSelfRollingRef = useRef<boolean>(false);
  const lastProcessedMoveTimestampRef = useRef<number>(0);
  const isOpponentMoveAnimatingRef = useRef<boolean>(false);

  useEffect(() => {
    onlineRoomIdRef.current = onlineRoomId;
  }, [onlineRoomId]);

  useEffect(() => {
    isHostWaitingRef.current = isHostWaiting;
  }, [isHostWaiting]);

  // Real-time synchronization listener for online rooms
  useEffect(() => {
    if (gameMode !== 'online' || !onlineRoomId) return;

    const unsubscribe = subscribeToOnlineRoom(onlineRoomId, (roomData) => {
      latestRoomDataRef.current = roomData;

      // 1. Handle game finished & victory
      if (roomData.status === 'finished') {
        if (roomData.board) setBoard(roomData.board);
        if (roomData.currentPlayer) setCurrentPlayer(roomData.currentPlayer);
        if (roomData.whiteDice) setHumanDice(roomData.whiteDice);
        setHumanDiceRemaining(roomData.whiteDiceRemaining || []);
        if (roomData.blackDice) setComputerDice(roomData.blackDice);
        setComputerDiceRemaining(roomData.blackDiceRemaining || []);

        if (roomData.winner) {
          setWinner(roomData.winner);
          setWinType(roomData.winType || 'normal');
          setGameStatus('game-over');

          const isOpponentWinningMove =
            roomData.lastMove &&
            roomData.lastMovePlayer &&
            roomData.lastMovePlayer !== onlineRole;

          if (isOpponentWinningMove && roomData.lastMove) {
            sound.playBearOff();
            setAiActiveMove({
              from: roomData.lastMove.from,
              to: roomData.lastMove.to,
              die: roomData.lastMove.dieUsed,
              phase: 'dragging',
              player: roomData.lastMovePlayer || undefined,
            });
            setTimeout(() => {
              setAiActiveMove(null);
              setIsGameOverOpen(true);
              sound.playClick();
            }, 800);
          } else {
            setIsGameOverOpen(true);
            if (roomData.winner === onlineRole) {
              sound.playWin();
            } else {
              sound.playClick();
            }
          }
        }
        if (roomData.statusMessage) {
          setStatusMessage(roomData.statusMessage);
        }
        return;
      }

      // Sync player display names
      if (roomData.whitePlayer) setPlayer1Name(roomData.whitePlayer.name);
      if (roomData.blackPlayer) setPlayer2Name(roomData.blackPlayer.name);

      if (roomData.status === 'playing' && isHostWaitingRef.current) {
        setIsHostWaiting(false);
        setIsOnlineLobbyOpen(false);
        sound.playClick();
      }

      // 2. DETECT TURN SWITCH (when currentPlayer changes in Firestore)
      const turnHasChanged = currentTurnPlayerRef.current !== roomData.currentPlayer;
      if (turnHasChanged) {
        currentTurnPlayerRef.current = roomData.currentPlayer;

        // Cancel any pending animations or timeouts from previous turn
        if (opponentMoveTimeoutRef.current) {
          clearTimeout(opponentMoveTimeoutRef.current);
          opponentMoveTimeoutRef.current = null;
        }
        if (opponentRollTimeoutRef.current) {
          clearTimeout(opponentRollTimeoutRef.current);
          opponentRollTimeoutRef.current = null;
        }
        if (autoEndTurnTimeoutRef.current) {
          clearTimeout(autoEndTurnTimeoutRef.current);
          autoEndTurnTimeoutRef.current = null;
        }

        isOpponentMoveAnimatingRef.current = false;
        isOpponentRollingActiveRef.current = false;
        isSelfRollingRef.current = false;
        setAiActiveMove(null);
        setIsRolling(false);
        pendingOpponentDiceRef.current = null;

        // Immediately adopt new turn state
        setCurrentPlayer(roomData.currentPlayer);
        setBoard(roomData.board);
        setHasRolled(roomData.hasRolled);
        prevHasRolledRef.current = roomData.hasRolled;

        setSelectedPoint(null);
        setValidTargets([]);
        setHintStep(null);
        setMovesPlayed([]);
        setTurnHistory([]);

        if (roomData.currentPlayer === 'white') {
          setHumanDice(roomData.whiteDice || []);
          setHumanDiceRemaining(roomData.whiteDiceRemaining || []);
          setComputerDice([]);
          setComputerDiceRemaining([]);
        } else {
          setComputerDice(roomData.blackDice || []);
          setComputerDiceRemaining(roomData.blackDiceRemaining || []);
          setHumanDice([]);
          setHumanDiceRemaining([]);
        }

        if (roomData.statusMessage) {
          setStatusMessage(roomData.statusMessage);
        }
        return;
      }

      // 3. IN-TURN UPDATES (same player turn)
      const isOpponentTurn = onlineRole !== roomData.currentPlayer;

      // Checker move animation for remote opponent
      const isOpponentMove =
        isOpponentTurn &&
        Boolean(
          roomData.lastMove &&
          roomData.lastMoveTimestamp &&
          roomData.lastMoveTimestamp !== lastProcessedMoveTimestampRef.current &&
          roomData.lastMovePlayer &&
          roomData.lastMovePlayer !== onlineRole
        );

      if (isOpponentMove && roomData.lastMove && roomData.lastMovePlayer) {
        lastProcessedMoveTimestampRef.current = roomData.lastMoveTimestamp!;
        isOpponentMoveAnimatingRef.current = true;

        if (opponentMoveTimeoutRef.current) {
          clearTimeout(opponentMoveTimeoutRef.current);
          opponentMoveTimeoutRef.current = null;
        }

        setAiActiveMove({
          from: roomData.lastMove.from,
          to: roomData.lastMove.to,
          die: roomData.lastMove.dieUsed,
          phase: 'dragging',
          player: roomData.lastMovePlayer || undefined,
        });

        if (roomData.lastMove.hit) {
          sound.playHit();
        } else if (roomData.lastMove.to === 'off') {
          sound.playBearOff();
        } else {
          sound.playCheckerMove();
        }

        opponentMoveTimeoutRef.current = setTimeout(() => {
          isOpponentMoveAnimatingRef.current = false;
          opponentMoveTimeoutRef.current = null;
          setAiActiveMove(null);

          const latest = latestRoomDataRef.current || roomData;
          setBoard(latest.board);
          setCurrentPlayer(latest.currentPlayer);
          setHasRolled(latest.hasRolled);

          if (latest.currentPlayer === 'white') {
            setHumanDice(latest.whiteDice || latest.dice || []);
            setHumanDiceRemaining(latest.whiteDiceRemaining ?? latest.diceRemaining ?? []);
            setComputerDice([]);
            setComputerDiceRemaining([]);
          } else {
            setComputerDice(latest.blackDice || latest.dice || []);
            setComputerDiceRemaining(latest.blackDiceRemaining ?? latest.diceRemaining ?? []);
            setHumanDice([]);
            setHumanDiceRemaining([]);
          }
        }, 550);
      } else if (!isOpponentMoveAnimatingRef.current) {
        setBoard(roomData.board);
        setCurrentPlayer(roomData.currentPlayer);
      }

      // Remote opponent rolling animation
      const isNewRollEvent =
        isOpponentTurn &&
        Boolean(
          (roomData.rollId && roomData.rollId !== lastProcessedRollIdRef.current) ||
          (roomData.isRolling && !isOpponentRollingActiveRef.current) ||
          (!prevHasRolledRef.current && roomData.hasRolled)
        );

      if (roomData.rollId) {
        lastProcessedRollIdRef.current = roomData.rollId;
      }
      prevHasRolledRef.current = roomData.hasRolled;

      if (isOpponentTurn && (isNewRollEvent || roomData.isRolling)) {
        const incomingDice =
          roomData.currentPlayer === 'white'
            ? roomData.whiteDice || roomData.dice || []
            : roomData.blackDice || roomData.dice || [];
        const incomingRem =
          roomData.currentPlayer === 'white'
            ? roomData.whiteDiceRemaining ?? roomData.diceRemaining ?? []
            : roomData.blackDiceRemaining ?? roomData.diceRemaining ?? [];

        if (incomingDice.length > 0) {
          pendingOpponentDiceRef.current = { dice: incomingDice, remaining: incomingRem };
        }

        if (!isOpponentRollingActiveRef.current) {
          isOpponentRollingActiveRef.current = true;
          setIsRolling(true);
          sound.playDiceRoll();

          if (opponentRollTimeoutRef.current) {
            clearTimeout(opponentRollTimeoutRef.current);
          }

          opponentRollTimeoutRef.current = setTimeout(() => {
            isOpponentRollingActiveRef.current = false;
            opponentRollTimeoutRef.current = null;
            setIsRolling(false);

            const latest = latestRoomDataRef.current || roomData;
            const finalDice =
              pendingOpponentDiceRef.current?.dice ||
              latest.whiteDice ||
              latest.blackDice ||
              latest.dice ||
              [];
            const finalRem =
              pendingOpponentDiceRef.current?.remaining ||
              latest.whiteDiceRemaining ||
              latest.blackDiceRemaining ||
              latest.diceRemaining ||
              [];

            if (latest.currentPlayer === 'white') {
              setHumanDice(finalDice);
              setHumanDiceRemaining(finalRem);
              setComputerDice([]);
              setComputerDiceRemaining([]);
            } else {
              setComputerDice(finalDice);
              setComputerDiceRemaining(finalRem);
              setHumanDice([]);
              setHumanDiceRemaining([]);
            }
            setHasRolled(latest.hasRolled);
            pendingOpponentDiceRef.current = null;
          }, 950);
        }

        if (roomData.statusMessage) {
          setStatusMessage(roomData.statusMessage);
        }
      } else if (!isOpponentRollingActiveRef.current && !isSelfRollingRef.current) {
        setIsRolling(Boolean(roomData.isRolling && isOpponentTurn));

        if (!isOpponentMoveAnimatingRef.current) {
          if (roomData.currentPlayer === 'white') {
            setHumanDice(roomData.whiteDice || roomData.dice || []);
            setHumanDiceRemaining(roomData.whiteDiceRemaining ?? roomData.diceRemaining ?? []);
            setComputerDice([]);
            setComputerDiceRemaining([]);
          } else {
            setComputerDice(roomData.blackDice || roomData.dice || []);
            setComputerDiceRemaining(roomData.blackDiceRemaining ?? roomData.diceRemaining ?? []);
            setHumanDice([]);
            setHumanDiceRemaining([]);
          }
        }

        setHasRolled(roomData.hasRolled);

        if (roomData.statusMessage) {
          setStatusMessage(roomData.statusMessage);
        }
      }
    });

    return () => {
      if (opponentMoveTimeoutRef.current) clearTimeout(opponentMoveTimeoutRef.current);
      if (opponentRollTimeoutRef.current) clearTimeout(opponentRollTimeoutRef.current);
      if (autoEndTurnTimeoutRef.current) clearTimeout(autoEndTurnTimeoutRef.current);
      unsubscribe();
    };
  }, [gameMode, isHostWaiting, onlineRole, onlineRoomId]);

  // Fullscreen (Vollansicht) state and listeners
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle request:', err);
    }
  }, []);

  // Save single-player stats to localStorage
  const updateStats = useCallback((fn: (prev: GameStats) => GameStats) => {
    setStats((prev) => {
      const next = fn(prev);
      try {
        localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage fallback
      }
      return next;
    });
  }, []);

  // Compute currently valid full sequences for the active player and remaining dice
  const currentSequences = hasRolled
    ? findAllTurnSequences(board, currentPlayer, currentDiceRemaining)
    : [];

  const hasLegalMoves =
    currentSequences.length > 0 && currentSequences[0].steps.length > 0;

  // Sound toggle handler
  const handleToggleMute = () => {
    const nextMuted = sound.toggleMute();
    setIsMuted(nextMuted);
  };

  // Start new game
  const handleNewGame = useCallback(() => {
    const freshBoard = createInitialBoard();
    setBoard(freshBoard);
    setCurrentPlayer('white');
    setHumanDice([]);
    setHumanDiceRemaining([]);
    setComputerDice([]);
    setComputerDiceRemaining([]);
    setMovesPlayed([]);
    setTurnHistory([]);
    setSelectedPoint(null);
    setValidTargets([]);
    setHintStep(null);
    setAiActiveMove(null);
    setLastAIMoves([]);
    setLastAIMoveSummary(null);
    setIsRolling(false);
    setHasRolled(false);
    setGameStatus('playing');
    setWinner(null);
    setIsGameOverOpen(false);

    if (gameMode === 'online' && onlineRoomId) {
      updateOnlineRoomState(onlineRoomId, {
        board: freshBoard,
        currentPlayer: 'white',
        dice: [],
        diceRemaining: [],
        hasRolled: false,
        status: 'playing',
        winner: null,
        winType: null,
        statusMessage: `Neues Spiel gestartet! ${activeWhiteName} (Weiß) beginnt – bitte würfeln!`,
      });
    }

    setStatusMessage(
      gameMode === 'vs-computer'
        ? 'Neues Spiel gestartet. Du bist am Zug – bitte würfeln!'
        : `Neues Spiel gestartet! ${activeWhiteName} (Weiß) beginnt – bitte würfeln!`
    );
    sound.playClick();
  }, [activeWhiteName, gameMode, onlineRoomId]);

  // Handle victory
  const handleWin = useCallback(
    (
      winPlayer: Player,
      finalBoard: BoardState,
      finalStep?: MoveStep,
      finalDiceRemaining?: number[]
    ) => {
      const victoryType = checkWinType(finalBoard, winPlayer);
      setWinner(winPlayer);
      setWinType(victoryType);
      setGameStatus('game-over');
      setIsGameOverOpen(true);

      if (gameMode === 'vs-computer') {
        const isWin = winPlayer === 'white';
        updateStats((prev) => {
          const next = { ...prev };
          next.gamesPlayed++;
          if (isWin) {
            next.wins++;
            next.currentStreak++;
            if (next.currentStreak > next.bestStreak) {
              next.bestStreak = next.currentStreak;
            }
            if (victoryType === 'gammon') next.gammonsWon++;
            if (victoryType === 'backgammon') next.backgammonsWon++;
          } else {
            next.losses++;
            next.currentStreak = 0;
            if (victoryType === 'gammon') next.gammonsLost++;
            if (victoryType === 'backgammon') next.backgammonsLost++;
          }
          return next;
        });
      } else if (gameMode === 'local-2p') {
        setLocalScores((prev) => {
          const next = { ...prev, [winPlayer]: prev[winPlayer] + 1 };
          try {
            localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
      } else if (gameMode === 'tournament') {
        const winnerId = winPlayer === 'white' ? tournamentWhiteId : tournamentBlackId;
        const loserId = winPlayer === 'white' ? tournamentBlackId : tournamentWhiteId;
        const ptsAwarded = victoryType === 'backgammon' ? 3 : victoryType === 'gammon' ? 2 : 1;

        setTournamentPlayers((prev) => {
          const next = prev.map((p) => {
            if (p.id === winnerId) {
              return {
                ...p,
                wins: p.wins + 1,
                points: p.points + ptsAwarded,
                gammonsWon: p.gammonsWon + (victoryType === 'gammon' ? 1 : 0),
                backgammonsWon: p.backgammonsWon + (victoryType === 'backgammon' ? 1 : 0),
              };
            }
            if (p.id === loserId) {
              return {
                ...p,
                losses: p.losses + 1,
              };
            }
            return p;
          });
          try {
            localStorage.setItem(TOURNAMENT_PLAYERS_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
      } else if (gameMode === 'online' && onlineRoomId) {
        const activeDice = winPlayer === 'white' ? humanDice : computerDice;
        const remDice = finalDiceRemaining ?? [];
        updateOnlineRoomState(onlineRoomId, {
          status: 'finished',
          winner: winPlayer,
          winType: victoryType,
          board: finalBoard,
          currentPlayer: winPlayer,
          whiteDice: winPlayer === 'white' ? activeDice : [],
          whiteDiceRemaining: winPlayer === 'white' ? remDice : [],
          blackDice: winPlayer === 'black' ? activeDice : [],
          blackDiceRemaining: winPlayer === 'black' ? remDice : [],
          dice: activeDice,
          diceRemaining: remDice,
          lastMove: finalStep || null,
          lastMoveTimestamp: Date.now(),
          lastMovePlayer: winPlayer,
          statusMessage: `Spiel beendet! ${winPlayer === 'white' ? activeWhiteName : activeBlackName} gewinnt (${victoryType})!`,
        });
      }
    },
    [
      activeBlackName,
      activeWhiteName,
      computerDice,
      gameMode,
      humanDice,
      onlineRoomId,
      tournamentBlackId,
      tournamentWhiteId,
      updateStats,
    ]
  );

  // Switch turn to next player
  const endTurn = useCallback(
    (nextPlayer: Player) => {
      setSelectedPoint(null);
      setValidTargets([]);
      setHintStep(null);
      setAiActiveMove(null);
      setMovesPlayed([]);
      setTurnHistory([]);
      setHasRolled(false);
      prevHasRolledRef.current = false;
      isOpponentRollingActiveRef.current = false;
      if (opponentRollTimeoutRef.current) {
        clearTimeout(opponentRollTimeoutRef.current);
        opponentRollTimeoutRef.current = null;
      }
      if (autoEndTurnTimeoutRef.current) {
        clearTimeout(autoEndTurnTimeoutRef.current);
        autoEndTurnTimeoutRef.current = null;
      }
      pendingOpponentDiceRef.current = null;
      currentTurnPlayerRef.current = nextPlayer;
      setCurrentPlayer(nextPlayer);

      const nextName = nextPlayer === 'white' ? activeWhiteName : activeBlackName;

      // Clear both dice sets on turn switch so no stale dice linger
      setHumanDice([]);
      setHumanDiceRemaining([]);
      setComputerDice([]);
      setComputerDiceRemaining([]);

      const msg =
        gameMode === 'vs-computer'
          ? nextPlayer === 'white'
            ? 'Du bist am Zug – Bitte würfeln!'
            : 'Gegner ist am Zug...'
          : `${nextName} (${nextPlayer === 'white' ? 'Weiß' : 'Schwarz'}) ist am Zug – Bitte würfeln!`;

      setStatusMessage(msg);

      if (gameMode === 'online' && onlineRoomId) {
        updateOnlineRoomState(onlineRoomId, {
          currentPlayer: nextPlayer,
          whiteDice: [],
          whiteDiceRemaining: [],
          blackDice: [],
          blackDiceRemaining: [],
          dice: [],
          diceRemaining: [],
          isRolling: false,
          hasRolled: false,
          lastMove: null,
          lastMoveTimestamp: 0,
          lastMovePlayer: null,
          statusMessage: msg,
        });
      }
    },
    [activeBlackName, activeWhiteName, gameMode, onlineRoomId]
  );

  // Roll dice for active human player
  const rollDice = useCallback(() => {
    if (isRolling || hasRolled || gameStatus !== 'playing' || !isHumanTurn) return;

    // Immediately clear current player's dice so clean tumbling 3D dice are rendered!
    if (currentPlayer === 'white') {
      setHumanDice([]);
      setHumanDiceRemaining([]);
    } else {
      setComputerDice([]);
      setComputerDiceRemaining([]);
    }

    isSelfRollingRef.current = true;
    setIsRolling(true);
    sound.playDiceRoll();

    const pName = currentPlayer === 'white' ? activeWhiteName : activeBlackName;
    const currentRollId = Date.now();

    if (gameMode === 'online' && onlineRoomId) {
      updateOnlineRoomState(onlineRoomId, {
        isRolling: true,
        rollId: currentRollId,
        rollingPlayer: currentPlayer,
        statusMessage: `🎲 ${pName} würfelt...`,
      });
    }

    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const isDouble = d1 === d2;
      const rolledDice = isDouble ? [d1, d1, d1, d1] : [d1, d2];

      if (currentPlayer === 'white') {
        setHumanDice(rolledDice);
        setHumanDiceRemaining(rolledDice);
      } else {
        setComputerDice(rolledDice);
        setComputerDiceRemaining(rolledDice);
      }

      setMovesPlayed([]);
      setTurnHistory([]);
      isSelfRollingRef.current = false;
      setIsRolling(false);
      setHasRolled(true);
      prevHasRolledRef.current = true;

      const sequences = findAllTurnSequences(board, currentPlayer, rolledDice);
      const possible = sequences.length > 0 && sequences[0].steps.length > 0;

      const rollMsg = isDouble
        ? `Pasch! 4x ${d1} gewürfelt für ${pName}. Wähle Steine zum Ziehen.`
        : `${pName} würfelt ${d1} und ${d2}. Wähle einen Stein zum Ziehen.`;

      if (!possible) {
        const passMsg = `${pName}: Keine legalen Züge möglich! Muss passen.`;
        setStatusMessage(passMsg);

        if (gameMode === 'online' && onlineRoomId) {
          updateOnlineRoomState(onlineRoomId, {
            whiteDice: currentPlayer === 'white' ? rolledDice : [],
            whiteDiceRemaining: [],
            blackDice: currentPlayer === 'black' ? rolledDice : [],
            blackDiceRemaining: [],
            dice: rolledDice,
            diceRemaining: [],
            isRolling: false,
            rollId: currentRollId,
            hasRolled: true,
            statusMessage: passMsg,
          });
        }

        setTimeout(() => {
          endTurn(currentPlayer === 'white' ? 'black' : 'white');
        }, 1800);
      } else {
        setStatusMessage(rollMsg);

        if (gameMode === 'online' && onlineRoomId) {
          updateOnlineRoomState(onlineRoomId, {
            whiteDice: currentPlayer === 'white' ? rolledDice : [],
            whiteDiceRemaining: currentPlayer === 'white' ? rolledDice : [],
            blackDice: currentPlayer === 'black' ? rolledDice : [],
            blackDiceRemaining: currentPlayer === 'black' ? rolledDice : [],
            dice: rolledDice,
            diceRemaining: rolledDice,
            isRolling: false,
            rollId: currentRollId,
            hasRolled: true,
            statusMessage: rollMsg,
          });
        }
      }
    }, 1000);
  }, [
    activeBlackName,
    activeWhiteName,
    board,
    currentPlayer,
    endTurn,
    gameMode,
    gameStatus,
    hasRolled,
    isHumanTurn,
    isRolling,
    onlineRoomId,
  ]);

  // AI Opponent Turn Loop (ONLY active in vs-computer mode when currentPlayer === 'black')
  const aiRunningRef = useRef(false);

  useEffect(() => {
    if (
      gameMode !== 'vs-computer' ||
      currentPlayer !== 'black' ||
      gameStatus !== 'playing' ||
      aiRunningRef.current
    ) {
      return;
    }

    aiRunningRef.current = true;

    const timer = setTimeout(() => {
      setIsRolling(true);
      setStatusMessage('Gegner schüttelt die Würfel...');
      sound.playDiceRoll();

      setTimeout(() => {
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const isDouble = d1 === d2;
        const rolledDice = isDouble ? [d1, d1, d1, d1] : [d1, d2];

        setComputerDice(rolledDice);
        setComputerDiceRemaining(rolledDice);
        setIsRolling(false);
        setHasRolled(true);
        setStatusMessage(
          isDouble
            ? `Gegner würfelt PASCH: 4x ${d1}!`
            : `Gegner hat ${d1} und ${d2} gewürfelt!`
        );

        setTimeout(() => {
          const bestTurn = chooseBestTurn(board, 'black', rolledDice, difficulty);

          if (!bestTurn || bestTurn.steps.length === 0) {
            setStatusMessage('Gegner hat keine Züge mit diesem Wurf und muss passen.');
            setTimeout(() => {
              aiRunningRef.current = false;
              endTurn('white');
            }, 2400);
            return;
          }

          let currentBoardState = cloneBoard(board);
          const steps = bestTurn.steps;
          let stepIdx = 0;

          const executeNextStep = () => {
            if (stepIdx >= steps.length) {
              const summary = steps
                .map(
                  (s) =>
                    `${s.from === 'bar' ? 'Bar' : `P${s.from}`} ➔ ${s.to === 'off' ? 'Hinaus' : `P${s.to}`} (+${s.dieUsed})`
                )
                .join(', ');
              setLastAIMoves(steps);
              setLastAIMoveSummary(summary);
              setAiActiveMove(null);

              if (currentBoardState.bornOff.black === 15) {
                handleWin('black', currentBoardState);
              } else {
                setStatusMessage('Du bist am Zug! Klicke auf deine Würfel.');
                setTimeout(() => {
                  aiRunningRef.current = false;
                  endTurn('white');
                }, 1800);
              }
              return;
            }

            const step = steps[stepIdx];
            const fromText = step.from === 'bar' ? 'der Bar' : `Feld ${step.from}`;
            const toText = step.to === 'off' ? 'dem Spielfeld (hinaus)' : `Feld ${step.to}`;

            setStatusMessage(`Gegner nimmt Stein auf ${fromText}...`);
            setAiActiveMove({
              from: step.from,
              to: step.to,
              die: step.dieUsed,
              phase: 'highlight-source',
            });

            setTimeout(() => {
              setStatusMessage(`Gegner zieht Stein von ${fromText} nach ${toText}...`);
              setAiActiveMove({
                from: step.from,
                to: step.to,
                die: step.dieUsed,
                phase: 'dragging',
              });

              setTimeout(() => {
                const result = applyMove(
                  currentBoardState,
                  'black',
                  step.from,
                  step.to,
                  step.dieUsed
                );
                currentBoardState = result.nextBoard;

                if (result.step.hit) {
                  sound.playHit();
                  setStatusMessage(`Gegner schlägt weißen Stein auf Feld ${step.to}!`);
                } else if (step.to === 'off') {
                  sound.playBearOff();
                  setStatusMessage(`Gegner spielt Stein hinaus! (+${step.dieUsed})`);
                } else {
                  sound.playCheckerMove();
                  setStatusMessage(`Gegner setzt Stein auf ${toText}.`);
                }

                setAiActiveMove({
                  from: step.from,
                  to: step.to,
                  die: step.dieUsed,
                  phase: 'moved',
                });
                setBoard(currentBoardState);
                setMovesPlayed((prev) => [...prev, result.step]);
                setComputerDiceRemaining((prev) => {
                  const next = [...prev];
                  const dIdx = next.indexOf(step.dieUsed);
                  if (dIdx !== -1) next.splice(dIdx, 1);
                  return next;
                });

                stepIdx++;

                setTimeout(() => {
                  setAiActiveMove(null);
                  setTimeout(executeNextStep, 800);
                }, 1100);
              }, 1600);
            }, 800);
          };

          executeNextStep();
        }, 2500);
      }, 800);
    }, 1400);

    return () => clearTimeout(timer);
  }, [board, currentPlayer, difficulty, endTurn, gameMode, gameStatus, handleWin]);

  // Helper to compute legal destinations for any given source point (or 'bar')
  const getTargetsForPoint = useCallback(
    (point: number | 'bar'): Array<{ to: number | 'off'; die: number; isHit: boolean }> => {
      if (!isHumanTurn || !hasRolled || gameStatus !== 'playing') return [];
      const currentBar = currentPlayer === 'white' ? board.bar.white : board.bar.black;
      if (currentBar > 0 && point !== 'bar') return [];

      const targets: Array<{ to: number | 'off'; die: number; isHit: boolean }> = [];
      const seen = new Set<string>();

      for (const seq of currentSequences) {
        const first = seq.steps[0];
        if (first && first.from === point) {
          const key = `${first.to}:${first.dieUsed}`;
          if (!seen.has(key)) {
            seen.add(key);
            targets.push({
              to: first.to,
              die: first.dieUsed,
              isHit: first.hit,
            });
          }
        }
      }
      return targets;
    },
    [board.bar.black, board.bar.white, currentPlayer, currentSequences, gameStatus, hasRolled, isHumanTurn]
  );

  // When active player clicks a point or bar
  const handleSelectPoint = (point: number | 'bar') => {
    if (!isHumanTurn || !hasRolled || gameStatus !== 'playing') {
      if (!hasRolled) {
        setStatusMessage('Bitte würfle zuerst!');
      }
      return;
    }

    const currentBar = currentPlayer === 'white' ? board.bar.white : board.bar.black;
    if (currentBar > 0 && point !== 'bar') {
      setStatusMessage('Du hast noch Steine auf der Bar! Du musst diese zuerst einwürfeln.');
      return;
    }

    if (selectedPoint === point) {
      setSelectedPoint(null);
      setValidTargets([]);
      return;
    }

    const targets = getTargetsForPoint(point);

    if (targets.length === 0) {
      sound.playClick();
      setStatusMessage('Kein legaler Zug mit diesem Stein möglich.');
      setSelectedPoint(null);
      setValidTargets([]);
    } else {
      sound.playClick();
      setSelectedPoint(point);
      setValidTargets(targets);
      setHintStep(null);
      setStatusMessage(
        `Wähle ein Zielfeld für den Stein auf ${point === 'bar' ? 'der Bar' : `Punkt ${point}`}.`
      );
    }
  };

  // Move checker handler (used by both drag-and-drop and point-target selection)
  const handleMoveChecker = (
    from: number | 'bar',
    to: number | 'off',
    dieUsed?: number
  ): boolean => {
    if (!isHumanTurn || gameStatus !== 'playing') return false;

    const currentBar = currentPlayer === 'white' ? board.bar.white : board.bar.black;
    if (currentBar > 0 && from !== 'bar') {
      setStatusMessage('Du hast noch Steine auf der Bar! Du musst diese zuerst einwürfeln.');
      return false;
    }

    let targetDie = dieUsed;
    if (targetDie === undefined) {
      for (const seq of currentSequences) {
        const first = seq.steps[0];
        if (first && first.from === from && first.to === to) {
          targetDie = first.dieUsed;
          break;
        }
      }
    }

    if (targetDie === undefined) {
      return false;
    }

    setTurnHistory((prev) => [
      ...prev,
      {
        board: cloneBoard(board),
        diceRemaining: [...currentDiceRemaining],
        step: { from, to, dieUsed: targetDie!, hit: false },
      },
    ]);

    const { nextBoard, step } = applyMove(board, currentPlayer, from, to, targetDie);

    if (step.hit) {
      sound.playHit();
      setStatusMessage(`Stein auf Punkt ${to} geschlagen!`);
    } else if (to === 'off') {
      sound.playBearOff();
      setStatusMessage(`Stein hinausgewürfelt! (+${targetDie})`);
    } else {
      sound.playCheckerMove();
      setStatusMessage(
        `Stein von ${from === 'bar' ? 'der Bar' : `Punkt ${from}`} nach ${to} gezogen.`
      );
    }

    const nextDiceRemaining = [...currentDiceRemaining];
    const dieIndex = nextDiceRemaining.indexOf(targetDie);
    if (dieIndex !== -1) {
      nextDiceRemaining.splice(dieIndex, 1);
    }

    setBoard(nextBoard);
    if (currentPlayer === 'white') {
      setHumanDiceRemaining(nextDiceRemaining);
    } else {
      setComputerDiceRemaining(nextDiceRemaining);
    }
    setMovesPlayed((prev) => [...prev, step]);
    setSelectedPoint(null);
    setValidTargets([]);
    setHintStep(null);

    // Check Win
    if (nextBoard.bornOff[currentPlayer] === 15) {
      handleWin(currentPlayer, nextBoard, step, nextDiceRemaining);
      return true;
    }

    // Check if turn finished
    const isFinished = nextDiceRemaining.length === 0;
    const nextSequences = findAllTurnSequences(nextBoard, currentPlayer, nextDiceRemaining);
    const noMoreMoves = isFinished || nextSequences.length === 0 || nextSequences[0].steps.length === 0;

    if (gameMode === 'online' && onlineRoomId) {
      const activeDice = currentPlayer === 'white' ? humanDice : computerDice;
      updateOnlineRoomState(onlineRoomId, {
        board: nextBoard,
        currentPlayer: currentPlayer,
        whiteDice: currentPlayer === 'white' ? activeDice : [],
        whiteDiceRemaining: currentPlayer === 'white' ? nextDiceRemaining : [],
        blackDice: currentPlayer === 'black' ? activeDice : [],
        blackDiceRemaining: currentPlayer === 'black' ? nextDiceRemaining : [],
        dice: activeDice,
        diceRemaining: nextDiceRemaining,
        hasRolled: true,
        lastMove: step,
        lastMoveTimestamp: Date.now(),
        lastMovePlayer: currentPlayer,
        statusMessage: isFinished
          ? `${activePlayerName}: Alle Würfel gespielt! Zug beendet.`
          : noMoreMoves
          ? `${activePlayerName}: Keine weiteren Züge möglich.`
          : `${activePlayerName}: Stein gezogen.`,
      });
    }

    if (isFinished) {
      setStatusMessage(`${activePlayerName}: Sehr gut! Zug beendet.`);
      if (autoEndTurnTimeoutRef.current) {
        clearTimeout(autoEndTurnTimeoutRef.current);
      }
      autoEndTurnTimeoutRef.current = setTimeout(() => {
        autoEndTurnTimeoutRef.current = null;
        endTurn(currentPlayer === 'white' ? 'black' : 'white');
      }, 750);
      return true;
    }

    if (noMoreMoves) {
      setStatusMessage('Keine weiteren Züge mit den restlichen Würfeln möglich.');
      if (autoEndTurnTimeoutRef.current) {
        clearTimeout(autoEndTurnTimeoutRef.current);
      }
      autoEndTurnTimeoutRef.current = setTimeout(() => {
        autoEndTurnTimeoutRef.current = null;
        endTurn(currentPlayer === 'white' ? 'black' : 'white');
      }, 1100);
    }

    return true;
  };

  // When human selects a target point or 'off' via tap
  const handleSelectTarget = (to: number | 'off', dieUsed: number) => {
    if (!selectedPoint) return;
    handleMoveChecker(selectedPoint, to, dieUsed);
  };

  // Undo last step within human turn
  const handleUndo = () => {
    if (turnHistory.length === 0 || !isHumanTurn) return;

    if (autoEndTurnTimeoutRef.current) {
      clearTimeout(autoEndTurnTimeoutRef.current);
      autoEndTurnTimeoutRef.current = null;
    }

    const lastSnapshot = turnHistory[turnHistory.length - 1];
    setBoard(lastSnapshot.board);
    if (currentPlayer === 'white') {
      setHumanDiceRemaining(lastSnapshot.diceRemaining);
    } else {
      setComputerDiceRemaining(lastSnapshot.diceRemaining);
    }
    setMovesPlayed((prev) => prev.slice(0, -1));
    setTurnHistory((prev) => prev.slice(0, -1));
    setSelectedPoint(null);
    setValidTargets([]);
    setHintStep(null);
    sound.playClick();
    setStatusMessage('Zug rückgängig gemacht.');

    if (gameMode === 'online' && onlineRoomId) {
      updateOnlineRoomState(onlineRoomId, {
        board: lastSnapshot.board,
        whiteDiceRemaining: currentPlayer === 'white' ? lastSnapshot.diceRemaining : [],
        blackDiceRemaining: currentPlayer === 'black' ? lastSnapshot.diceRemaining : [],
        diceRemaining: lastSnapshot.diceRemaining,
        statusMessage: `${activePlayerName}: Zug rückgängig gemacht.`,
      });
    }
  };

  // Hint recommendation for active player
  const handleHint = () => {
    if (!isHumanTurn || !hasRolled || currentDiceRemaining.length === 0) {
      setStatusMessage('Würfle zuerst, um einen Tipp zu erhalten.');
      return;
    }

    const best = chooseBestTurn(board, currentPlayer, currentDiceRemaining, 'hard');
    if (best && best.steps.length > 0) {
      const firstStep = best.steps[0];
      setHintStep({ from: firstStep.from, to: firstStep.to });
      setSelectedPoint(firstStep.from);
      handleSelectPoint(firstStep.from);
      sound.playClick();
      setStatusMessage(
        `💡 Tipp: Ziehe von ${firstStep.from === 'bar' ? 'der Bar' : `Punkt ${firstStep.from}`} nach ${firstStep.to === 'off' ? 'Hinaus' : `Punkt ${firstStep.to}`} (+${firstStep.dieUsed}).`
      );
    } else {
      setStatusMessage('Kein legaler Zug mehr möglich.');
    }
  };

  // Manual pass if no moves
  const handlePass = () => {
    if (!isHumanTurn || (hasLegalMoves && currentDiceRemaining.length > 0)) return;
    sound.playClick();
    if (autoEndTurnTimeoutRef.current) {
      clearTimeout(autoEndTurnTimeoutRef.current);
      autoEndTurnTimeoutRef.current = null;
    }
    endTurn(currentPlayer === 'white' ? 'black' : 'white');
  };

  // Switch Game Mode
  const handleSelectGameMode = (mode: GameMode) => {
    setGameMode(mode);
    sound.playClick();

    if (mode === 'online') {
      setIsOnlineLobbyOpen(true);
    } else if (mode === 'tournament') {
      handleNewGame();
      setIsTournamentOpen(true);
    } else if (mode === 'local-2p') {
      handleNewGame();
      setStatusMessage(
        `2-Spieler Modus aktiviert: ${player1Name} (Weiß) vs. ${player2Name} (Schwarz). Bitte würfeln!`
      );
    } else {
      handleNewGame();
      setStatusMessage('Spiel gegen den Computer gestartet. Du bist am Zug – bitte würfeln!');
    }
  };

  // Save 2-Player local names
  const handleSavePlayerNames = (p1: string, p2: string) => {
    setPlayer1Name(p1);
    setPlayer2Name(p2);
    try {
      localStorage.setItem(P1_NAME_KEY, p1);
      localStorage.setItem(P2_NAME_KEY, p2);
    } catch {}
    setStatusMessage(`Spielernamen aktualisiert: ${p1} (Weiß) vs. ${p2} (Schwarz).`);
  };

  // Reset 2-Player scores
  const handleResetLocalScores = () => {
    const fresh = { white: 0, black: 0 };
    setLocalScores(fresh);
    try {
      localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(fresh));
    } catch {}
  };

  // Online Room Handlers
  const handleCreateOnlineRoom = async (hostName: string) => {
    setIsOnlineConnecting(true);
    try {
      const freshBoard = createInitialBoard();
      const { roomId } = await createOnlineRoom(hostName, freshBoard);
      onlineRoomIdRef.current = roomId;
      isHostWaitingRef.current = true;
      setOnlineRoomId(roomId);
      setOnlineRole('white');
      setPlayer1Name(hostName);
      setIsHostWaiting(true);
      setGameMode('online');
      setBoard(freshBoard);
      setCurrentPlayer('white');
      setHumanDice([]);
      setHumanDiceRemaining([]);
      setComputerDice([]);
      setComputerDiceRemaining([]);
      setStatusMessage(`Raum ${roomId} erstellt! Warte auf zweiten Spieler...`);
    } finally {
      setIsOnlineConnecting(false);
    }
  };

  const handleJoinOnlineRoom = async (roomId: string, joinName: string): Promise<boolean> => {
    setIsOnlineConnecting(true);
    try {
      const res = await joinOnlineRoom(roomId, joinName);
      if (res.success && res.room) {
        onlineRoomIdRef.current = res.room.roomId;
        isHostWaitingRef.current = false;
        setOnlineRoomId(res.room.roomId);
        setOnlineRole(res.role);
        setBoard(res.room.board);
        setCurrentPlayer(res.room.currentPlayer);
        if (res.room.whitePlayer) setPlayer1Name(res.room.whitePlayer.name);
        setPlayer2Name(joinName);
        setGameMode('online');
        setIsOnlineLobbyOpen(false);
        setStatusMessage(
          `Raum ${res.room.roomId} beigetreten! Du spielst ${res.role === 'black' ? 'Schwarz (oben)' : 'Weiß (unten)'}.`
        );
        sound.playClick();
        return true;
      }
      return false;
    } finally {
      setIsOnlineConnecting(false);
    }
  };

  const handleLeaveOnlineRoom = () => {
    const rId = onlineRoomIdRef.current || onlineRoomId;
    if (rId) {
      updateOnlineRoomState(rId, {
        status: 'finished',
        statusMessage: 'Ein Mitspieler hat das Online-Spiel beendet / verlassen.',
      }).catch(() => {});
    }
    onlineRoomIdRef.current = null;
    isHostWaitingRef.current = false;
    setOnlineRoomId(null);
    setOnlineRole(null);
    setIsHostWaiting(false);
    setIsOnlineLobbyOpen(false);
    setGameMode('vs-computer');
    handleNewGame();
    sound.playClick();
  };

  // Tournament Player Management
  const handleAddTournamentPlayer = (name: string) => {
    const newPlayer: TournamentPlayer = {
      id: `p_${Date.now()}`,
      name,
      wins: 0,
      losses: 0,
      points: 0,
      gammonsWon: 0,
      backgammonsWon: 0,
    };
    setTournamentPlayers((prev) => {
      const next = [...prev, newPlayer];
      try {
        localStorage.setItem(TOURNAMENT_PLAYERS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleRemoveTournamentPlayer = (id: string) => {
    setTournamentPlayers((prev) => {
      const next = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem(TOURNAMENT_PLAYERS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleResetTournament = () => {
    setTournamentPlayers((prev) => {
      const next = prev.map((p) => ({
        ...p,
        wins: 0,
        losses: 0,
        points: 0,
        gammonsWon: 0,
        backgammonsWon: 0,
      }));
      try {
        localStorage.setItem(TOURNAMENT_PLAYERS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleStartTournamentMatch = () => {
    const pWhite = tournamentPlayers.find((p) => p.id === tournamentWhiteId);
    const pBlack = tournamentPlayers.find((p) => p.id === tournamentBlackId);
    if (pWhite) setPlayer1Name(pWhite.name);
    if (pBlack) setPlayer2Name(pBlack.name);

    setIsTournamentOpen(false);
    handleNewGame();
    setStatusMessage(
      `Turniermatch: ${pWhite?.name || 'Weiß'} vs. ${pBlack?.name || 'Schwarz'}. Bitte würfeln!`
    );
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-stone-950 text-stone-100 flex flex-col justify-between p-1 sm:p-1.5 md:p-2 selection:bg-amber-500 selection:text-stone-950">
      {/* Header Navigation, Scoreboard, In-turn Actions, & Fullscreen */}
      <Header
        difficulty={difficulty}
        gameMode={gameMode}
        showPointNumbers={showPointNumbers}
        isMuted={isMuted}
        currentPlayer={currentPlayer}
        isHumanTurn={isHumanTurn}
        whitePips={pips.white}
        blackPips={pips.black}
        canUndo={isHumanTurn && turnHistory.length > 0}
        canHint={isHumanTurn && hasRolled && currentDiceRemaining.length > 0}
        canPass={isHumanTurn && hasRolled && (!hasLegalMoves || currentDiceRemaining.length === 0) && gameStatus === 'playing'}
        isFullscreen={isFullscreen}
        statusMessage={statusMessage}
        player1Name={activeWhiteName}
        player2Name={activeBlackName}
        localScores={gameMode === 'local-2p' ? localScores : undefined}
        onlineRoomId={onlineRoomId}
        onlineRole={onlineRole}
        onSelectDifficulty={(d) => {
          setDifficulty(d);
          sound.playClick();
        }}
        onSelectGameMode={handleSelectGameMode}
        onOpenPlayerNames={() => setIsPlayerNamesOpen(true)}
        onOpenTournament={() => setIsTournamentOpen(true)}
        onOpenOnlineLobby={() => setIsOnlineLobbyOpen(true)}
        onLeaveOnlineRoom={handleLeaveOnlineRoom}
        onToggleNumbers={() => {
          setShowPointNumbers((prev) => !prev);
          sound.playClick();
        }}
        onToggleMute={handleToggleMute}
        onOpenRules={() => {
          setIsRulesOpen(true);
          sound.playClick();
        }}
        onOpenStats={() => {
          setIsStatsOpen(true);
          sound.playClick();
        }}
        onNewGame={handleNewGame}
        onUndo={handleUndo}
        onHint={handleHint}
        onPass={handlePass}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Active Online Match Status Banner (with prominent Beenden / Abbrechen button) */}
      {gameMode === 'online' && onlineRoomId && (
        <div className="w-full max-w-5xl mx-auto px-3 py-1 bg-stone-900/95 border border-emerald-500/50 rounded-xl flex items-center justify-between text-xs my-0.5 shadow-lg backdrop-blur-xs shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-emerald-300">
                Online: <span className="font-mono text-emerald-200 tracking-wider font-black">{onlineRoomId}</span>
              </span>
              <span className="text-stone-500 hidden sm:inline">•</span>
              <span className="text-stone-300 hidden sm:inline">
                Du spielst: <strong className="text-stone-100">{onlineRole === 'white' ? 'Weiß (unten)' : 'Schwarz (oben)'}</strong>
              </span>
              <span className="text-stone-500 hidden sm:inline">•</span>
              <span className="text-amber-300 font-semibold truncate">
                {isHumanTurn ? '🎯 Du bist am Zug' : '⏳ Gegner ist am Zug...'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsOnlineLobbyOpen(true)}
              className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[11px] font-semibold border border-stone-700 cursor-pointer transition-all"
              title="Raumcode ansehen oder teilen"
            >
              Raum-Code
            </button>
            <button
              type="button"
              onClick={() => {
                handleLeaveOnlineRoom();
              }}
              className="px-2.5 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/80 rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1.5 hover:scale-105 active:scale-95 shadow-sm"
              title="Online-Spiel beenden / Raum verlassen"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Spiel beenden</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Backgammon Board Area */}
      <main className="flex-1 min-h-0 w-full flex items-center justify-center p-0.5 sm:p-1 overflow-hidden">
        <Board
          board={board}
          selectedPoint={selectedPoint}
          validTargets={validTargets}
          hintStep={hintStep}
          aiActiveMove={aiActiveMove}
          lastAIMoves={lastAIMoves}
          lastAIMoveSummary={lastAIMoveSummary}
          currentPlayer={currentPlayer}
          isHumanTurn={isHumanTurn}
          theme={theme}
          showPointNumbers={showPointNumbers}
          onSelectPoint={handleSelectPoint}
          onSelectTarget={handleSelectTarget}
          onMoveChecker={handleMoveChecker}
          getTargetsForPoint={getTargetsForPoint}
          humanDice={humanDice}
          humanDiceRemaining={humanDiceRemaining}
          computerDice={computerDice}
          computerDiceRemaining={computerDiceRemaining}
          isRolling={isRolling}
          canRoll={isHumanTurn && !hasRolled && gameStatus === 'playing'}
          onRoll={rollDice}
          canUndo={isHumanTurn && turnHistory.length > 0}
          onUndo={handleUndo}
          player1Name={activeWhiteName}
          player2Name={activeBlackName}
        />
      </main>

      {/* Modals */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      <StatsModal
        isOpen={isStatsOpen}
        stats={stats}
        onClose={() => setIsStatsOpen(false)}
        onReset={() => {
          setStats(DEFAULT_STATS);
          localStorage.removeItem(STATS_STORAGE_KEY);
        }}
      />
      <GameOverModal
        isOpen={isGameOverOpen}
        winner={winner || 'white'}
        winType={winType}
        difficulty={difficulty}
        gameMode={gameMode}
        player1Name={activeWhiteName}
        player2Name={activeBlackName}
        onRematch={handleNewGame}
        onClose={() => setIsGameOverOpen(false)}
      />
      <TournamentModal
        isOpen={isTournamentOpen}
        players={tournamentPlayers}
        whitePlayerId={tournamentWhiteId}
        blackPlayerId={tournamentBlackId}
        targetPoints={tournamentTargetPoints}
        onClose={() => setIsTournamentOpen(false)}
        onAddPlayer={handleAddTournamentPlayer}
        onRemovePlayer={handleRemoveTournamentPlayer}
        onSelectMatchup={(wId, bId) => {
          setTournamentWhiteId(wId);
          setTournamentBlackId(bId);
        }}
        onSetTargetPoints={setTournamentTargetPoints}
        onResetTournament={handleResetTournament}
        onStartMatch={handleStartTournamentMatch}
      />
      <PlayerNamesModal
        isOpen={isPlayerNamesOpen}
        player1Name={player1Name}
        player2Name={player2Name}
        player1Score={localScores.white}
        player2Score={localScores.black}
        onClose={() => setIsPlayerNamesOpen(false)}
        onSaveNames={handleSavePlayerNames}
        onResetScores={handleResetLocalScores}
      />
      <OnlineLobbyModal
        isOpen={isOnlineLobbyOpen}
        onClose={() => {
          setIsOnlineLobbyOpen(false);
          if (!onlineRoomIdRef.current) {
            handleLeaveOnlineRoom();
          }
        }}
        playerName={onlineRole === 'black' ? player2Name : player1Name}
        onSetPlayerName={(n) => {
          if (onlineRole === 'black') setPlayer2Name(n);
          else setPlayer1Name(n);
        }}
        activeRoomId={onlineRoomId}
        isHostWaiting={isHostWaiting}
        onCreateRoom={handleCreateOnlineRoom}
        onJoinRoom={handleJoinOnlineRoom}
        onLeaveRoom={handleLeaveOnlineRoom}
        isConnecting={isOnlineConnecting}
        initialJoinCode={urlRoomParam}
      />
    </div>
  );
}
