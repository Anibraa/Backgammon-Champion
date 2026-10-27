import React from 'react';
import { Difficulty, Player, GameMode } from '../types/backgammon';
import {
  Volume2,
  VolumeX,
  HelpCircle,
  BarChart3,
  RotateCw,
  Hash,
  Maximize,
  Minimize,
  Lightbulb,
  RotateCcw,
  Play,
  Bot,
  Users,
  Trophy,
  Globe,
} from 'lucide-react';

interface HeaderProps {
  difficulty: Difficulty;
  gameMode: GameMode;
  showPointNumbers: boolean;
  isMuted: boolean;
  currentPlayer: Player;
  isHumanTurn: boolean;
  whitePips: number;
  blackPips: number;
  canUndo: boolean;
  canHint: boolean;
  canPass: boolean;
  isFullscreen: boolean;
  statusMessage?: string;
  player1Name?: string;
  player2Name?: string;
  localScores?: { white: number; black: number };
  onlineRoomId?: string | null;
  onlineRole?: 'white' | 'black' | 'spectator' | null;
  onSelectDifficulty: (d: Difficulty) => void;
  onSelectGameMode: (mode: GameMode) => void;
  onOpenPlayerNames?: () => void;
  onOpenTournament?: () => void;
  onOpenOnlineLobby?: () => void;
  onLeaveOnlineRoom?: () => void;
  onToggleNumbers: () => void;
  onToggleMute: () => void;
  onOpenRules: () => void;
  onOpenStats: () => void;
  onNewGame: () => void;
  onUndo: () => void;
  onHint: () => void;
  onPass: () => void;
  onToggleFullscreen: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  difficulty,
  gameMode,
  showPointNumbers,
  isMuted,
  currentPlayer,
  isHumanTurn,
  whitePips,
  blackPips,
  canUndo,
  canHint,
  canPass,
  isFullscreen,
  statusMessage,
  player1Name,
  player2Name,
  localScores,
  onlineRoomId,
  onlineRole,
  onSelectDifficulty,
  onSelectGameMode,
  onOpenPlayerNames,
  onOpenTournament,
  onOpenOnlineLobby,
  onLeaveOnlineRoom,
  onToggleNumbers,
  onToggleMute,
  onOpenRules,
  onOpenStats,
  onNewGame,
  onUndo,
  onHint,
  onPass,
  onToggleFullscreen,
}) => {
  return (
    <header className="w-full max-w-7xl mx-auto flex flex-col gap-1 px-1 sm:px-2 py-0.5 shrink-0 select-none">
      {/* Top Main Navigation Row */}
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {/* Left: Brand & Pips Scoreboard */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 border border-amber-500/40 flex items-center justify-center shadow-md text-amber-100 text-xs sm:text-sm">
            🎲
          </div>
          <h1 className="text-xs sm:text-sm font-bold tracking-tight text-stone-100 hidden md:block leading-tight">
            Backgammon Champion
          </h1>

          {/* Integrated Pips Scoreboard */}
          <div className="flex items-center gap-1 bg-stone-900/90 border border-stone-800 rounded-lg px-2 py-0.5 text-[11px] sm:text-xs">
            {/* White Player */}
            <div
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
                currentPlayer === 'white'
                  ? 'bg-amber-500/20 text-amber-200 font-bold ring-1 ring-amber-500/40'
                  : 'text-stone-300'
              }`}
              title={gameMode !== 'vs-computer' ? `${player1Name || 'Spieler 1'} (Weiß)` : 'Deine Pips (Augen bis zum Ziel)'}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-stone-100 border border-stone-400 shadow-xs" />
              <span className="max-w-[70px] truncate">
                {gameMode === 'vs-computer' ? 'Du:' : `${player1Name || 'Spieler 1'}:`}
              </span>
              <span className="font-mono font-bold text-amber-300">{whitePips}</span>
              {currentPlayer === 'white' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              )}
            </div>

            <span className="text-stone-600 font-light">|</span>

            {/* Black Player */}
            <div
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-all ${
                currentPlayer === 'black'
                  ? 'bg-amber-500/20 text-amber-200 font-bold ring-1 ring-amber-500/40'
                  : 'text-stone-400'
              }`}
              title={gameMode !== 'vs-computer' ? `${player2Name || 'Spieler 2'} (Schwarz)` : 'Gegner-Pips (Augen bis zum Ziel)'}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-stone-900 border border-amber-400/80 shadow-xs" />
              <span className="max-w-[70px] truncate">
                {gameMode === 'vs-computer' ? 'Gegner:' : `${player2Name || 'Spieler 2'}:`}
              </span>
              <span className="font-mono font-bold text-amber-300">{blackPips}</span>
              {currentPlayer === 'black' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-0.5" />
              )}
            </div>
          </div>
        </div>

        {/* Center: In-turn Gameplay Actions (Tipp, Zug zurück, Pass) */}
        <div className="flex items-center gap-1">
          {/* Hint Button */}
          <button
            onClick={onHint}
            disabled={!canHint}
            className={`px-2 py-0.5 sm:py-1 rounded-lg border text-[11px] sm:text-xs font-semibold shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              canHint
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 hover:scale-102'
                : 'bg-stone-900 border-stone-800 text-stone-500'
            }`}
            title="Tipp anfordern"
          >
            <Lightbulb className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Tipp</span>
          </button>

          {/* Undo Button */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`px-2 py-0.5 sm:py-1 rounded-lg border text-[11px] sm:text-xs font-semibold shadow-sm transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              canUndo
                ? 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-600 hover:scale-102'
                : 'bg-stone-900 border-stone-800 text-stone-500'
            }`}
            title="Letzten Teilzug rückgängig machen"
          >
            <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Zurück</span>
          </button>

          {/* Pass Button when no moves possible */}
          {canPass && (
            <button
              onClick={onPass}
              className="px-2.5 py-0.5 sm:py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg shadow text-[11px] sm:text-xs flex items-center gap-1 cursor-pointer animate-pulse"
              title="Keine Züge möglich – Zug beenden"
            >
              <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Zug beenden</span>
            </button>
          )}
        </div>

        {/* Right: Modus (Computer vs 2 Spieler vs Turnier), Difficulty, Vollansicht, Settings, Rules, Stats */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Game Mode Selector: Computer vs 2 Spieler vs Turnier */}
          <div className="flex items-center bg-stone-900 border border-stone-800 rounded-lg p-0.5 shadow-inner">
            <button
              onClick={() => onSelectGameMode('vs-computer')}
              className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                gameMode === 'vs-computer'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Gegen Computer spielen"
            >
              <Bot className="w-3 h-3" />
              <span className="hidden sm:inline">vs Computer</span>
            </button>
            <button
              onClick={() => onSelectGameMode('local-2p')}
              className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                gameMode === 'local-2p'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="2 Spieler an einem Gerät"
            >
              <Users className="w-3 h-3" />
              <span>2 Spieler</span>
            </button>
            <button
              onClick={() => onSelectGameMode('online')}
              className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                gameMode === 'online'
                  ? 'bg-emerald-500 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Online gegeneinander spielen"
            >
              <Globe className="w-3 h-3" />
              <span>Online</span>
            </button>
            <button
              onClick={() => onSelectGameMode('tournament')}
              className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                gameMode === 'tournament'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
              title="Turnier & Gruppe (2 bis 8 Spieler mit Tabelle)"
            >
              <Trophy className="w-3 h-3" />
              <span className="hidden sm:inline">Turnier (2+)</span>
            </button>
          </div>

          {/* Mode-specific secondary action */}
          {gameMode === 'vs-computer' && (
            <div className="flex items-center bg-stone-900 border border-stone-800 rounded-lg p-0.5 shadow-inner">
              <button
                onClick={() => onSelectDifficulty('easy')}
                className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  difficulty === 'easy'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Leicht
              </button>
              <button
                onClick={() => onSelectDifficulty('medium')}
                className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  difficulty === 'medium'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Mittel
              </button>
              <button
                onClick={() => onSelectDifficulty('hard')}
                className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  difficulty === 'hard'
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Schwer
              </button>
            </div>
          )}

          {gameMode === 'local-2p' && onOpenPlayerNames && (
            <button
              onClick={onOpenPlayerNames}
              className="px-2 py-0.5 sm:py-1 bg-stone-900 hover:bg-stone-800 text-amber-300 border border-stone-800 rounded-lg shadow-sm text-[10px] sm:text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
              title="Spielernamen & Spielstand anpassen"
            >
              <Users className="w-3 h-3 text-amber-400" />
              <span>
                {localScores ? `${localScores.white} : ${localScores.black}` : 'Namen'}
              </span>
            </button>
          )}

          {gameMode === 'online' && onOpenOnlineLobby && (
            <button
              onClick={onOpenOnlineLobby}
              className={`px-2 py-0.5 sm:py-1 rounded-lg border shadow-sm text-[10px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                onlineRoomId
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 border-emerald-400 animate-pulse'
              }`}
              title="Online-Raum verwalten, Code ansehen oder beitreten"
            >
              <Globe className="w-3 h-3" />
              <span>{onlineRoomId ? `Raum: ${onlineRoomId}` : 'Lobby'}</span>
            </button>
          )}

          {gameMode === 'tournament' && onOpenTournament && (
            <button
              onClick={onOpenTournament}
              className="px-2 py-0.5 sm:py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg shadow-sm text-[10px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
              title="Turniertabelle & Rangliste ansehen"
            >
              <Trophy className="w-3 h-3 text-amber-400" />
              <span>Tabelle</span>
            </button>
          )}

          {/* Fullscreen / Vollansicht Toggle Button */}
          <button
            onClick={onToggleFullscreen}
            className="px-2 py-0.5 sm:py-1 rounded-lg border border-amber-400 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs hover:scale-102 active:scale-95"
            title={
              isFullscreen
                ? 'Vollbild beenden (ESC)'
                : 'Vollbild aktivieren – Browser komplett ausblenden'
            }
          >
            {isFullscreen ? (
              <Minimize className="w-3.5 h-3.5 text-stone-950" />
            ) : (
              <Maximize className="w-3.5 h-3.5 text-stone-950" />
            )}
            <span className="hidden sm:inline">
              {isFullscreen ? 'Vollbild beenden' : 'Vollbild'}
            </span>
          </button>

          {/* Toggle Point Numbers */}
          <button
            onClick={onToggleNumbers}
            className={`p-1 sm:p-1.5 rounded-lg border shadow-sm transition-all cursor-pointer ${
              showPointNumbers
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
            title={showPointNumbers ? 'Nummern ausblenden' : 'Nummern 1-24 einblenden'}
          >
            <Hash className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleMute}
            className={`p-1 sm:p-1.5 rounded-lg border shadow-sm transition-all cursor-pointer ${
              !isMuted
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
            }`}
            title={isMuted ? 'Ton einschalten' : 'Stummschalten'}
          >
            {isMuted ? (
              <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            ) : (
              <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            )}
          </button>


          {/* Rules Button */}
          <button
            onClick={onOpenRules}
            className="p-1 sm:px-2 sm:py-1 bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 rounded-lg shadow-sm text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
            title="Regeln ansehen"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Regeln</span>
          </button>

          {/* Statistics Button */}
          <button
            onClick={onOpenStats}
            className="p-1 sm:p-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 rounded-lg shadow-sm transition-all cursor-pointer"
            title="Statistik ansehen"
          >
            <BarChart3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>

          {/* New Game Button */}
          <button
            onClick={onNewGame}
            className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-stone-800 hover:bg-stone-700 text-amber-300 hover:text-amber-200 border border-stone-700 rounded-lg shadow-sm text-[10px] sm:text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
            title="Neues Spiel starten"
          >
            <RotateCw className="w-3 h-3" />
            <span className="hidden sm:inline">Neu</span>
          </button>
        </div>
      </div>
    </header>
  );
};
