import React from 'react';
import { GameStats } from '../types/backgammon';
import { X, BarChart3, Trophy, Flame, RotateCcw } from 'lucide-react';

interface StatsModalProps {
  isOpen: boolean;
  stats: GameStats;
  onClose: () => void;
  onReset: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  stats,
  onClose,
  onReset,
}) => {
  if (!isOpen) return null;

  const winRate =
    stats.gamesPlayed > 0
      ? Math.round((stats.wins / stats.gamesPlayed) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-bold text-stone-100">
              Deine Spielstatistik
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-stone-800/60 border border-stone-700/60 rounded-xl p-3 text-center">
              <span className="text-xs text-stone-400">Gespielte Partien</span>
              <div className="text-2xl font-black text-stone-100 mt-1">
                {stats.gamesPlayed}
              </div>
            </div>

            <div className="bg-stone-800/60 border border-stone-700/60 rounded-xl p-3 text-center">
              <span className="text-xs text-stone-400">Siegquote</span>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {winRate}%
              </div>
            </div>

            <div className="bg-stone-800/60 border border-stone-700/60 rounded-xl p-3 text-center">
              <span className="text-xs text-stone-400 flex items-center justify-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                Siege
              </span>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {stats.wins}
              </div>
            </div>

            <div className="bg-stone-800/60 border border-stone-700/60 rounded-xl p-3 text-center">
              <span className="text-xs text-stone-400">Niederlagen</span>
              <div className="text-2xl font-black text-rose-400 mt-1">
                {stats.losses}
              </div>
            </div>
          </div>

          {/* Gammon and Backgammon Details */}
          <div className="bg-stone-800/40 border border-stone-800 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-stone-300">
              <span>Gammons gewonnen (2 Pkt):</span>
              <span className="font-mono font-bold text-amber-300">{stats.gammonsWon}</span>
            </div>
            <div className="flex items-center justify-between text-stone-300">
              <span>Backgammons gewonnen (3 Pkt):</span>
              <span className="font-mono font-bold text-amber-300">{stats.backgammonsWon}</span>
            </div>
            <div className="border-t border-stone-700/50 pt-2 flex items-center justify-between text-stone-300">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                Aktuelle Siegesserie:
              </span>
              <span className="font-mono font-bold text-emerald-400">{stats.currentStreak}</span>
            </div>
            <div className="flex items-center justify-between text-stone-300">
              <span>Beste Siegesserie:</span>
              <span className="font-mono font-bold text-emerald-400">{stats.bestStreak}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-800 bg-stone-950/60 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm('Möchtest du die Statistik wirklich zurücksetzen?')) {
                onReset();
              }
            }}
            className="text-xs text-stone-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Zurücksetzen
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
