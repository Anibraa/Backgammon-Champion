import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Player, WinType } from '../types/backgammon';
import { Trophy, Frown, RotateCw, CheckCircle2 } from 'lucide-react';
import { sound } from '../utils/audio';

interface GameOverModalProps {
  isOpen: boolean;
  winner: Player;
  winType: WinType;
  difficulty: string;
  gameMode?: string;
  player1Name?: string;
  player2Name?: string;
  onRematch: () => void;
  onClose: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winner,
  winType,
  difficulty,
  gameMode = 'vs-computer',
  player1Name,
  player2Name,
  onRematch,
  onClose,
}) => {
  const isMultiplayer = gameMode !== 'vs-computer';
  const isHumanWinner = isMultiplayer || winner === 'white';

  useEffect(() => {
    if (!isOpen) return;

    if (isHumanWinner) {
      sound.playWin();
      // Burst celebratory confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#ffffff'],
        });
      } catch {
        // Confetti fallback safety
      }
    } else {
      sound.playDefeat();
    }
  }, [isOpen, isHumanWinner]);

  if (!isOpen) return null;

  const winTypeLabel = {
    normal: { title: 'Einfacher Sieg', pts: '1 Punkt', desc: 'Der Gegner konnte Steine herauswürfeln.' },
    gammon: { title: 'Gammon!', pts: '2 Punkte', desc: 'Der Gegner hat keinen einzigen Stein herausgewürfelt!' },
    backgammon: { title: 'Triple Backgammon!', pts: '3 Punkte', desc: 'Der Gegner stand noch auf der Bar oder im Heimfeld!' },
  }[winType];

  const diffLabel = {
    easy: 'Leicht',
    medium: 'Mittel',
    hard: 'Schwer',
  }[difficulty] || difficulty;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden text-center p-6 sm:p-8">
        {/* Glow backdrop */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
            isHumanWinner ? 'bg-amber-500/25' : 'bg-rose-500/15'
          }`}
        />

        {/* Icon */}
        <div className="relative mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-4">
          {isHumanWinner ? (
            <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-stone-950 flex items-center justify-center shadow-amber-500/40 shadow-xl">
              <Trophy className="w-8 h-8 fill-current" />
            </div>
          ) : (
            <div className="w-full h-full rounded-2xl bg-stone-800 text-rose-400 border border-rose-900/60 flex items-center justify-center">
              <Frown className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black text-stone-100 mb-1">
          {isMultiplayer
            ? `🎉 ${winner === 'white' ? (player1Name || 'Spieler 1') : (player2Name || 'Spieler 2')} gewinnt!`
            : isHumanWinner
            ? 'Glückwunsch! Du hast gewonnen!'
            : 'Die KI gewinnt diese Partie!'}
        </h2>

        <p className="text-sm text-stone-400 mb-5">
          {isMultiplayer ? (
            <span>
              Farbe:{' '}
              <strong className="text-amber-300">
                {winner === 'white' ? 'Weiß (Spieler 1)' : 'Schwarz (Spieler 2)'}
              </strong>
            </span>
          ) : (
            <span>
              Schwierigkeitsgrad: <strong className="text-amber-300">{diffLabel}</strong>
            </span>
          )}
        </p>

        {/* Win Type Highlight Card */}
        <div className="bg-stone-800/70 border border-stone-700/60 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-300 text-base flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              {winTypeLabel.title}
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {winTypeLabel.pts}
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            {winTypeLabel.desc}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onRematch}
            className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
            Revanche spielen
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto py-3 px-4 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-sm rounded-xl border border-stone-700 transition-colors cursor-pointer"
          >
            Brett ansehen
          </button>
        </div>
      </div>
    </div>
  );
};
