import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

export interface DiceFaceProps {
  value?: number | string;
  isUsed?: boolean;
  isRolling?: boolean;
  isBlinking?: boolean;
  showQuestionMark?: boolean;
  diceColor?: 'white' | 'black';
  rotation?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onClick?: () => void;
}

const DOT_POSITIONS: Record<number, number[][]> = {
  1: [[50, 50]],
  2: [
    [26, 26],
    [74, 74],
  ],
  3: [
    [25, 25],
    [50, 50],
    [75, 75],
  ],
  4: [
    [26, 26],
    [26, 74],
    [74, 26],
    [74, 74],
  ],
  5: [
    [25, 25],
    [25, 75],
    [50, 50],
    [75, 25],
    [75, 75],
  ],
  6: [
    [26, 22],
    [26, 50],
    [26, 78],
    [74, 22],
    [74, 50],
    [74, 78],
  ],
};

// Preset resting angles so dice look naturally cast on felt
export const RESTING_ANGLES = [-5, 6, -3, 4];

export const DiceFace: React.FC<DiceFaceProps> = ({
  value,
  isUsed = false,
  isRolling = false,
  isBlinking = false,
  showQuestionMark = false,
  diceColor = 'white',
  rotation = 0,
  size = 'md',
  interactive = false,
  onClick,
}) => {
  const isQuestionMark = Boolean(showQuestionMark || value === '?' || value === 0);

  // During rolling, cycle displayed pips rapidly for an authentic rolling look
  const [displayValue, setDisplayValue] = useState<number>(
    typeof value === 'number' && value >= 1 && value <= 6 ? value : 1
  );

  useEffect(() => {
    if (!isRolling) {
      if (typeof value === 'number' && value >= 1 && value <= 6) {
        setDisplayValue(value);
      }
      return;
    }

    const interval = setInterval(() => {
      setDisplayValue(Math.floor(Math.random() * 6) + 1);
    }, 65);

    return () => clearInterval(interval);
  }, [isRolling, value]);

  const dots = DOT_POSITIONS[displayValue] || [[50, 50]];
  const isLight = diceColor === 'white';

  const sizeClasses = {
    sm: 'w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9',
    md: 'w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 xl:w-12.5 xl:h-12.5',
    lg: 'w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12.5 lg:h-12.5 xl:w-14 xl:h-14',
  }[size];

  return (
    <motion.div
      animate={
        isRolling
          ? {
              y: [0, -22, -12, -26, -6, 0],
              x: [0, -5, 7, -4, 4, 0],
              rotate: [
                rotation,
                rotation - 35,
                rotation + 45,
                rotation - 25,
                rotation + 18,
                rotation,
              ],
              scale: [1, 1.15, 1.08, 1.14, 1.02, 1],
              opacity: 1,
            }
          : isBlinking
          ? {
              y: [0, -4, 0],
              x: 0,
              rotate: rotation,
              scale: [1, 1.08, 1],
              opacity: [0.75, 1, 0.75],
            }
          : {
              y: 0,
              x: 0,
              rotate: rotation,
              scale: isUsed ? 0.94 : 1,
              opacity: isUsed ? 0.6 : 1,
            }
      }
      transition={{
        duration: isRolling ? 0.65 : isBlinking ? 1.0 : 0.25,
        repeat: isRolling ? Infinity : isBlinking ? Infinity : 0,
        ease: 'easeInOut',
      }}
      onClick={interactive && onClick ? onClick : undefined}
      className={`relative ${sizeClasses} rounded-lg sm:rounded-xl flex items-center justify-center select-none transition-all
        ${interactive ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}
        ${isUsed ? 'grayscale' : ''}
      `}
      style={{
        // Pure 3D dice materials without any surrounding background plate
        background: isLight
          ? 'linear-gradient(135deg, #ffffff 0%, #faf8f5 45%, #ece7df 100%)'
          : 'linear-gradient(135deg, #2a2a2a 0%, #171717 50%, #0d0d0d 100%)',
        border: isLight
          ? isBlinking
            ? '1.5px solid rgba(245, 158, 11, 0.9)'
            : '1px solid rgba(0, 0, 0, 0.12)'
          : '1px solid rgba(255, 255, 255, 0.14)',
        // Realistic tactile drop shadow cast directly onto the felt board + blink glow when can roll
        boxShadow: isRolling
          ? isLight
            ? '0 20px 25px -5px rgba(0,0,0,0.4), 0 8px 10px -6px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -2px 3px rgba(0,0,0,0.1)'
            : '0 20px 25px -5px rgba(0,0,0,0.8), 0 8px 10px -6px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.9)'
          : isBlinking
          ? '0 0 18px 3px rgba(245, 158, 11, 0.7), 0 6px 14px -2px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.95)'
          : isLight
          ? '0 6px 14px -2px rgba(0,0,0,0.4), 0 2px 4px -1px rgba(0,0,0,0.25), inset 0 1px 1px rgba(255,255,255,0.95), inset 0 -2px 3px rgba(0,0,0,0.1)'
          : '0 7px 16px -2px rgba(0,0,0,0.7), 0 2px 4px -1px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.9)',
      }}
    >
      {/* 3D Chamfered Edge Inner Highlight */}
      <div
        className="absolute inset-[1.5px] rounded-[6px] sm:rounded-[9px] pointer-events-none"
        style={{
          border: isLight
            ? '1px solid rgba(255, 255, 255, 0.7)'
            : '1px solid rgba(255, 255, 255, 0.08)',
        }}
      />

      {/* Render Question Mark "?" before rolling or Recessed Precision Pips after rolling */}
      {isQuestionMark && !isRolling ? (
        <svg className="w-full h-full p-1 sm:p-1.5" viewBox="0 0 100 100">
          <defs>
            <radialGradient
              id={`qmGrad-${isLight ? 'w' : 'b'}`}
              cx="40%"
              cy="35%"
              r="65%"
            >
              {isLight ? (
                <>
                  <stop offset="0%" stopColor="#44403c" />
                  <stop offset="60%" stopColor="#292524" />
                  <stop offset="100%" stopColor="#171514" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </>
              )}
            </radialGradient>
          </defs>
          {/* Subtle drop shadow underneath question mark */}
          <text
            x="50"
            y="52"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="54"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fill={isLight ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.7)'}
          >
            ?
          </text>
          {/* Main 3D Question Mark */}
          <text
            x="50"
            y="50.5"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="54"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fill={`url(#qmGrad-${isLight ? 'w' : 'b'})`}
          >
            ?
          </text>
        </svg>
      ) : (
        <svg className="w-full h-full p-1.5 sm:p-2" viewBox="0 0 100 100">
          <defs>
            <radialGradient
              id={`pipGrad-${isLight ? 'w' : 'b'}`}
              cx="40%"
              cy="40%"
              r="60%"
            >
              {isLight ? (
                <>
                  <stop offset="0%" stopColor="#383533" />
                  <stop offset="100%" stopColor="#141210" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="60%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#b45309" />
                </>
              )}
            </radialGradient>
          </defs>
          {dots.map(([cx, cy], idx) => (
            <g key={idx}>
              {/* Recessed shadow for depth */}
              <circle
                cx={cx}
                cy={cy + 1}
                r={9.5}
                fill={isLight ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.8)'}
              />
              {/* Main Pip */}
              <circle
                cx={cx}
                cy={cy}
                r={9.5}
                fill={`url(#pipGrad-${isLight ? 'w' : 'b'})`}
              />
              {/* Specular sheen inside pip */}
              <circle
                cx={cx - 2.5}
                cy={cy - 2.5}
                r={2.5}
                fill={isLight ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.5)'}
              />
            </g>
          ))}
        </svg>
      )}

      {/* Used Die Strikethrough/Badge */}
      {isUsed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-[88%] h-[3px] bg-red-500/90 shadow-md rotate-45 rounded-full border-t border-red-300/60" />
        </div>
      )}
    </motion.div>
  );
};
