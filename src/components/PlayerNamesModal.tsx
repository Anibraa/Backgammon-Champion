import React, { useState } from 'react';
import { Users, X, Check, RotateCcw } from 'lucide-react';
import { sound } from '../utils/audio';

interface PlayerNamesModalProps {
  isOpen: boolean;
  player1Name: string;
  player2Name: string;
  player1Score: number;
  player2Score: number;
  onClose: () => void;
  onSaveNames: (p1: string, p2: string) => void;
  onResetScores: () => void;
}

export const PlayerNamesModal: React.FC<PlayerNamesModalProps> = ({
  isOpen,
  player1Name,
  player2Name,
  player1Score,
  player2Score,
  onClose,
  onSaveNames,
  onResetScores,
}) => {
  const [p1, setP1] = useState(player1Name);
  const [p2, setP2] = useState(player2Name);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanP1 = p1.trim() || 'Spieler 1';
    const cleanP2 = p2.trim() || 'Spieler 2';
    onSaveNames(cleanP1, cleanP2);
    sound.playClick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden p-5 sm:p-6 text-stone-100">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100">2-Spieler Duell</h2>
              <p className="text-xs text-stone-400">Namen & aktueller Spielstand</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Score Display */}
        <div className="bg-stone-950/70 border border-stone-800 rounded-xl p-3 mb-5 text-center">
          <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
            Gesamtstand (gewonnene Spiele)
          </div>
          <div className="flex items-center justify-center gap-4 text-lg font-black text-amber-300 font-mono">
            <span>{player1Name}: {player1Score}</span>
            <span className="text-stone-600">:</span>
            <span>{player2Name}: {player2Score}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Player 1 (White) */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-stone-100 border border-stone-400" />
              <span>Spieler 1 (Weiße Steine)</span>
            </label>
            <input
              type="text"
              value={p1}
              onChange={(e) => setP1(e.target.value)}
              maxLength={16}
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-hidden"
              placeholder="Name für Spieler 1"
            />
          </div>

          {/* Player 2 (Black) */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-stone-900 border border-amber-400" />
              <span>Spieler 2 (Schwarze Steine)</span>
            </label>
            <input
              type="text"
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              maxLength={16}
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-hidden"
              placeholder="Name für Spieler 2"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-stone-800 mt-5">
            <button
              type="button"
              onClick={() => {
                onResetScores();
                sound.playClick();
              }}
              className="text-xs text-stone-500 hover:text-stone-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Score zurücksetzen</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-stone-700 hover:bg-stone-800 text-stone-300 text-xs font-semibold cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1 shadow transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Speichern</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
