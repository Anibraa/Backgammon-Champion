import React from 'react';
import { Player } from '../types/backgammon';

interface CheckerProps {
  player: Player;
  isSelected?: boolean;
  isHintSource?: boolean;
  isHitTarget?: boolean;
  isDragging?: boolean;
  isBlinking?: boolean;
  count?: number; // total in stack if rendering top piece
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  interactive?: boolean;
}

export const Checker: React.FC<CheckerProps> = ({
  player,
  isSelected = false,
  isHintSource = false,
  isHitTarget = false,
  isDragging = false,
  isBlinking = false,
  count,
  size = 'md',
  onClick,
  onPointerDown,
  interactive = false,
}) => {
  const isWhite = player === 'white';

  const sizeClasses = {
    sm: 'w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-[9px]',
    md: 'w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9.5 lg:h-9.5 xl:w-11 xl:h-11 text-[10px] xl:text-xs',
    lg: 'w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-11 lg:h-11 xl:w-12 xl:h-12 text-xs xl:text-sm',
  }[size];

  return (
    <div
      onClick={interactive ? onClick : undefined}
      onPointerDown={interactive ? onPointerDown : undefined}
      className={`relative rounded-full select-none flex items-center justify-center transition-all shrink-0
        ${sizeClasses}
        ${interactive ? 'cursor-grab active:cursor-grabbing hover:scale-105 active:scale-95 pointer-events-auto' : 'cursor-default'}
        ${isDragging ? 'opacity-25 scale-90' : ''}
        ${
          isSelected && !isDragging
            ? 'ring-3 ring-amber-400 ring-offset-2 ring-offset-stone-900 shadow-amber-400/60 shadow-lg scale-105'
            : ''
        }
        ${isHintSource ? 'ring-2 ring-emerald-400 animate-pulse' : ''}
        ${isHitTarget ? 'ring-2 ring-rose-500' : ''}
        ${isBlinking && !isDragging && !isSelected ? 'ring-3 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.85)] animate-pulse' : ''}
      `}
      style={{
        touchAction: interactive ? 'none' : 'auto',
        background: isWhite
          ? 'radial-gradient(circle at 35% 30%, #ffffff 0%, #faf8f5 40%, #ede8de 70%, #d8cfbe 100%)'
          : 'radial-gradient(circle at 35% 30%, #636366 0%, #3a3a3c 38%, #242426 65%, #121214 100%)',
        boxShadow: isWhite
          ? '0 3px 6px -1px rgba(0,0,0,0.45), inset 0 2px 2px rgba(255,255,255,0.9), inset 0 -2px 3px rgba(120,53,15,0.2)'
          : '0 4px 8px rgba(0,0,0,0.7), inset 0 2px 2px rgba(255,255,255,0.45), inset 0 -2px 3px rgba(0,0,0,0.85)',
      }}
    >
      {/* White Checker Directional Gradient Rim: Top is bright & light-silvery/pearl, bottom is softly darker */}
      {isWhite && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            padding: '1.5px',
            background:
              'linear-gradient(180deg, rgba(225, 228, 233, 0.95) 0%, rgba(195, 192, 185, 0.75) 38%, rgba(185, 175, 160, 0.6) 72%, rgba(205, 195, 178, 0.75) 100%)',
            WebkitMask:
              'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />
      )}

      {/* Black Checker Directional Gradient Rim: Brighter at the top, subtly luminous at the bottom */}
      {!isWhite && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            padding: '1.5px',
            background:
              'linear-gradient(180deg, rgba(235, 240, 248, 0.95) 0%, rgba(165, 172, 185, 0.65) 45%, rgba(130, 138, 150, 0.5) 75%, rgba(200, 210, 225, 0.75) 100%)',
            WebkitMask:
              'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />
      )}

      {/* Engraved decorative concentric ring with dual ambient rim light */}
      <div
        className={`absolute inset-1 sm:inset-1.5 rounded-full border pointer-events-none ${
          isWhite
            ? 'border-t-white/90 border-x-stone-300/40 border-b-amber-800/20'
            : 'border-t-stone-300/65 border-x-stone-500/35 border-b-stone-300/50'
        }`}
      />

      {/* Center inner bead */}
      <div
        className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full pointer-events-none ${
          isWhite
            ? 'bg-[#b8a690] shadow-[inset_0_1px_1px_rgba(0,0,0,0.35)] border border-[#8f785f]/80'
            : 'bg-stone-400/90 shadow-[0_0_3px_rgba(255,255,255,0.4)]'
        }`}
      />

      {/* Stack Count Indicator if > 6 checkers */}
      {count !== undefined && count > 6 && (
        <span
          className={`absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center shadow-md ${
            isWhite
              ? 'bg-amber-900 text-amber-50 border border-amber-800'
              : 'bg-stone-800 text-stone-100 border border-stone-400'
          }`}
        >
          {count}
        </span>
      )}
    </div>
  );
};
