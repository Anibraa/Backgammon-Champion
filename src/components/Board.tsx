import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { BoardState, Player, BoardTheme, AIActiveMove, MoveStep } from '../types/backgammon';
import { sound } from '../utils/audio';
import { Checker } from './Checker';
import { DiceFace, RESTING_ANGLES } from './Dice';

interface BoardProps {
  board: BoardState;
  selectedPoint: number | 'bar' | null;
  validTargets: Array<{ to: number | 'off'; die: number; isHit: boolean }>;
  hintStep: { from: number | 'bar'; to: number | 'off' } | null;
  aiActiveMove?: AIActiveMove | null;
  lastAIMoves?: MoveStep[] | null;
  lastAIMoveSummary?: string | null;
  currentPlayer: Player;
  isHumanTurn: boolean;
  theme?: BoardTheme;
  showPointNumbers: boolean;
  onSelectPoint: (point: number | 'bar') => void;
  onSelectTarget: (to: number | 'off', die: number) => void;
  onMoveChecker?: (from: number | 'bar', to: number | 'off', die?: number) => boolean;
  getTargetsForPoint?: (point: number | 'bar') => Array<{ to: number | 'off'; die: number; isHit: boolean }>;
  // Dice properties
  humanDice: number[];
  humanDiceRemaining: number[];
  computerDice: number[];
  computerDiceRemaining: number[];
  isRolling: boolean;
  canRoll: boolean;
  onRoll?: () => void;
  canUndo?: boolean;
  onUndo?: () => void;
  player1Name?: string;
  player2Name?: string;
}

// Robust hit-test helper for finding drop targets (handles touch offsets, margins, and proximity)
const findDropTarget = (clientX: number, clientY: number): number | 'off' | null => {
  // 1. Direct hit via elementFromPoint
  try {
    const elem = document.elementFromPoint(clientX, clientY);
    const bearoffElem = elem?.closest('[data-drop-bearoff]');
    if (bearoffElem) return 'off';

    const pointElem = elem?.closest('[data-drop-point]');
    if (pointElem) {
      const pStr = pointElem.getAttribute('data-drop-point');
      if (pStr !== null) {
        const val = parseInt(pStr, 10);
        if (!isNaN(val)) return val;
      }
    }
  } catch {
    // fallback below
  }

  // 2. White Bear-Off Bounding Box check (with generous hit zone for touch)
  const bearoffEl = document.querySelector('[data-drop-bearoff]');
  if (bearoffEl) {
    const rect = bearoffEl.getBoundingClientRect();
    if (
      clientX >= rect.left - 20 &&
      clientX <= rect.right + 40 &&
      clientY >= rect.top - 20 &&
      clientY <= rect.bottom + 40
    ) {
      return 'off';
    }
  }

  // 3. Exact point bounding boxes (with padding for touch accuracy)
  const pointEls = document.querySelectorAll('[data-drop-point]');
  let bestPoint: number | null = null;
  let minDistance = Infinity;

  for (let i = 0; i < pointEls.length; i++) {
    const el = pointEls[i];
    const rect = el.getBoundingClientRect();
    const pStr = el.getAttribute('data-drop-point');
    if (!pStr) continue;
    const val = parseInt(pStr, 10);
    if (isNaN(val)) continue;

    // Check if within rect with 12px forgiveness
    if (
      clientX >= rect.left - 6 &&
      clientX <= rect.right + 6 &&
      clientY >= rect.top - 12 &&
      clientY <= rect.bottom + 12
    ) {
      return val;
    }

    // Distance to point center for proximity fallback
    const centerX = (rect.left + rect.right) / 2;
    const centerY = (rect.top + rect.bottom) / 2;
    const dist = Math.hypot(clientX - centerX, clientY - centerY);
    if (dist < minDistance) {
      minDistance = dist;
      bestPoint = val;
    }
  }

  // If reasonably close to a point center, pick the closest
  if (bestPoint !== null && minDistance < 60) {
    return bestPoint;
  }

  return null;
};

export const Board: React.FC<BoardProps> = ({
  board,
  selectedPoint,
  validTargets,
  hintStep,
  aiActiveMove,
  lastAIMoves,
  lastAIMoveSummary,
  currentPlayer,
  isHumanTurn,
  theme,
  showPointNumbers,
  onSelectPoint,
  onSelectTarget,
  onMoveChecker,
  getTargetsForPoint,
  humanDice,
  humanDiceRemaining,
  computerDice,
  computerDiceRemaining,
  isRolling,
  canRoll,
  onRoll,
  canUndo,
  onUndo,
  player1Name,
  player2Name,
}) => {
  // Drag and drop state (supports both mouse and touch/finger gestures)
  const [dragState, setDragState] = useState<{
    from: number | 'bar';
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    isDragging: boolean;
    targets: Array<{ to: number | 'off'; die: number; isHit: boolean }>;
  } | null>(null);

  const [hoveredDropTarget, setHoveredDropTarget] = useState<number | 'off' | null>(null);
  const didDragRef = useRef(false);
  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;

  // Opponent animated drag coordinates
  const [aiDragCoords, setAiDragCoords] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);

  useEffect(() => {
    if (aiActiveMove && aiActiveMove.phase === 'dragging') {
      const getCoord = (target: number | 'bar' | 'off'): { x: number; y: number } | null => {
        let el: Element | null = null;
        const mover = aiActiveMove.player || (currentPlayer === 'white' ? 'white' : 'black');
        if (target === 'bar') {
          el = document.querySelector(mover === 'white' ? '[data-bar-white="true"]' : '[data-bar-black="true"]');
        } else if (target === 'off') {
          el = document.querySelector(mover === 'white' ? '[data-bearoff-white="true"]' : '[data-bearoff-black="true"]');
        } else {
          el = document.querySelector(`[data-drop-point="${target}"]`);
        }
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        if (target === 'bar' || target === 'off') {
          return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
        }
        const isTop = target >= 13 && target <= 24;
        return {
          x: rect.left + rect.width / 2,
          y: isTop ? rect.top + 36 : rect.bottom - 36,
        };
      };

      const start = getCoord(aiActiveMove.from);
      const end = getCoord(aiActiveMove.to);
      if (start && end) {
        setAiDragCoords({
          startX: start.x,
          startY: start.y,
          endX: end.x,
          endY: end.y,
        });
      }
    } else {
      setAiDragCoords(null);
    }
  }, [aiActiveMove]);

  const handleCheckerPointerDown = (
    from: number | 'bar',
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    // Only primary button or touch contact
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (!isHumanTurn) return;
    const currentBar = currentPlayer === 'white' ? board.bar.white : board.bar.black;
    if (currentBar > 0 && from !== 'bar') return;

    // Immediately calculate legal moves for this specific piece
    const pieceTargets = getTargetsForPoint ? getTargetsForPoint(from) : validTargets;

    setDragState({
      from,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      isDragging: false,
      targets: pieceTargets,
    });
  };

  const isDraggingActive = dragState !== null;

  useEffect(() => {
    if (!isDraggingActive) return;

    const handlePointerMove = (e: PointerEvent) => {
      const current = dragStateRef.current;
      if (!current) return;

      const dist = Math.hypot(e.clientX - current.startX, e.clientY - current.startY);
      const isDragging = current.isDragging || dist > 6;

      if (!current.isDragging && isDragging) {
        sound.playCheckerPickup();
        if (selectedPoint !== current.from) {
          onSelectPoint(current.from);
        }
      }

      setDragState((prev) =>
        prev
          ? {
              ...prev,
              currentX: e.clientX,
              currentY: e.clientY,
              isDragging,
            }
          : null
      );

      if (isDragging) {
        const dropTarget = findDropTarget(e.clientX, e.clientY);
        const isValid = dropTarget !== null && current.targets.some((t) => t.to === dropTarget);
        setHoveredDropTarget(isValid ? dropTarget : null);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const current = dragStateRef.current;
      if (current && current.isDragging) {
        didDragRef.current = true;
        setTimeout(() => {
          didDragRef.current = false;
        }, 200);

        const releaseX = e.clientX !== 0 || e.clientY !== 0 ? e.clientX : current.currentX;
        const releaseY = e.clientX !== 0 || e.clientY !== 0 ? e.clientY : current.currentY;
        const dropTarget = findDropTarget(releaseX, releaseY);
        if (dropTarget !== null) {
          const targetInfo = current.targets.find((t) => t.to === dropTarget);
          if (targetInfo) {
            if (onMoveChecker) {
              onMoveChecker(current.from, dropTarget, targetInfo.die);
            } else {
              onSelectTarget(targetInfo.to, targetInfo.die);
            }
          }
        }
      }

      setDragState(null);
      setHoveredDropTarget(null);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDraggingActive, onMoveChecker, onSelectPoint, onSelectTarget, selectedPoint]);
  // Compute used indices for human dice
  const humanUsedIndices: number[] = [];
  if (humanDice && humanDice.length > 0) {
    const remaining = [...humanDiceRemaining];
    humanDice.forEach((val, idx) => {
      const rIdx = remaining.indexOf(val);
      if (rIdx !== -1) {
        remaining.splice(rIdx, 1);
      } else {
        humanUsedIndices.push(idx);
      }
    });
  }

  // Compute used indices for computer dice
  const computerUsedIndices: number[] = [];
  if (computerDice && computerDice.length > 0) {
    const remaining = [...computerDiceRemaining];
    computerDice.forEach((val, idx) => {
      const rIdx = remaining.indexOf(val);
      if (rIdx !== -1) {
        remaining.splice(rIdx, 1);
      } else {
        computerUsedIndices.push(idx);
      }
    });
  }
  // User requested exact board colors:
  // Felt background: #F1E9DA (RGB: 241, 233, 218 - Cremeweiß / Off-White)
  // Brown points (14, 16, 19, 21, 23, etc.): #7F2F1E (RGB: 127, 47, 30 - Terrakotta / Rostbraun)
  // Light points (13, 15, 17, 18, 20, 22, 24, etc.): #E6DCB8 (RGB: 230, 220, 184 - Sandgelb / Beige)
  const themeStyles = {
    rim: 'bg-[#22130c] border-[#3d2216]',
    felt: 'bg-[#F1E9DA]',
    hinge: 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-700 border-yellow-300/80',
    pointLight: '#E6DCB8', // Helle spitze Felder (13, 15, 17, 18, 20, 22, 24...)
    pointDark: '#7F2F1E',  // Rötlich-braune spitze Felder (14, 16, 19, 21, 23...)
    borderPointLight: '#b5a77e', // Passender sanfter Kontur-Rand
    borderPointDark: '#561c10',  // Dunkler Terrakotta/Rostbraun-Rand
  };

  // Helper to check if a point is a valid destination for the human player
  // If dragging, use the targets calculated specifically for the dragged piece!
  const activeTargets = dragState?.isDragging ? dragState.targets : validTargets;

  const getTargetInfo = (to: number | 'off') => {
    return activeTargets.find((t) => t.to === to);
  };

  const isBarSelected = selectedPoint === 'bar';
  const barTarget = getTargetInfo('off');

  // AI Active state checks
  const isAISource = (point: number | 'bar') =>
    aiActiveMove?.from === point &&
    (aiActiveMove.phase === 'highlight-source' || aiActiveMove.phase === 'dragging');

  const isAITarget = (to: number | 'off') =>
    aiActiveMove?.to === to &&
    (aiActiveMove.phase === 'dragging' || aiActiveMove.phase === 'moved');

  // Render checkers stacked along a triangle
  const renderPointCheckers = (pointIndex: number, isTopRow: boolean) => {
    const pt = board.points[pointIndex];
    if (!pt || pt.count === 0 || !pt.player) return null;

    // Render all checkers (including 6 checkers fully visible).
    // Automatically adjust stack overlap so stacks of 6 or more fit cleanly along the point
    const count = pt.count;
    const maxVisible = Math.max(6, Math.min(count, 8));
    const visibleCount = Math.min(count, maxVisible);
    const isOwnerCurrent = pt.player === currentPlayer;
    const currentBar = currentPlayer === 'white' ? board.bar.white : board.bar.black;
    const canInteract = isHumanTurn && isOwnerCurrent && currentBar === 0;
    const isSelected = selectedPoint === pointIndex;
    const isHint = hintStep && hintStep.from === pointIndex;
    const isAISourceActive = isAISource(pointIndex);

    // Dynamic negative margin for stacks: 6 or more checkers stack a bit tighter so they fit the point length
    const stackMargin = count >= 6 ? '-19px' : '-16px';

    const items = [];
    for (let i = 0; i < visibleCount; i++) {
      const isTopChecker = i === visibleCount - 1;
      const isCheckerBeingDragged = Boolean(
        (dragState?.isDragging && dragState.from === pointIndex && isTopChecker) ||
        (aiActiveMove?.phase === 'dragging' && aiActiveMove.from === pointIndex && isTopChecker)
      );

      items.push(
        <div
          key={i}
          className={`transition-transform duration-200 ${
            canInteract ? 'pointer-events-auto cursor-grab' : 'pointer-events-none'
          }`}
          style={{
            marginTop: isTopRow ? (i === 0 ? '0' : stackMargin) : undefined,
            marginBottom: !isTopRow ? (i === 0 ? '0' : stackMargin) : undefined,
            zIndex: i + 1,
            touchAction: canInteract ? 'none' : 'auto',
          }}
        >
          <Checker
            player={pt.player}
            isSelected={isSelected && isTopChecker}
            isHintSource={Boolean(isHint && isTopChecker)}
            isHitTarget={Boolean(isAISourceActive && isTopChecker)}
            isDragging={isCheckerBeingDragged}
            count={isTopChecker ? count : undefined}
            size="md"
            interactive={canInteract}
            onPointerDown={(e) => {
              if (canInteract) {
                handleCheckerPointerDown(pointIndex, e);
              }
            }}
            onClick={() => {
              if (didDragRef.current) return;
              if (canInteract) {
                onSelectPoint(pointIndex);
              }
            }}
          />
        </div>
      );
    }

    return (
      <div
        className={`flex flex-col items-center justify-start w-full pointer-events-none ${
          isTopRow ? 'pt-1.5' : 'pb-1.5 flex-col-reverse'
        }`}
      >
        {items}
      </div>
    );
  };

  // Render an individual triangular point
  const renderPoint = (pointIndex: number, isTopRow: boolean, isEven: boolean) => {
    const targetInfo = getTargetInfo(pointIndex);
    const isTarget = Boolean(targetInfo);
    const isHint = hintStep && hintStep.to === pointIndex;
    const isAISrc = isAISource(pointIndex);
    const isAITgt = isAITarget(pointIndex);
    const isHoveredDrop = hoveredDropTarget === pointIndex && isTarget;

    const pt = board.points[pointIndex];
    const currentBar = currentPlayer === 'white' ? board.bar.white : board.bar.black;
    const canSelect =
      isHumanTurn &&
      currentBar === 0 &&
      pt &&
      pt.player === currentPlayer &&
      pt.count > 0;

    const pointColor = isEven ? themeStyles.pointLight : themeStyles.pointDark;
    const pointBorder = isEven ? themeStyles.borderPointLight : themeStyles.borderPointDark;

    // SVG coordinate:
    // The sharp tip of the triangle extends further and deeper into the playing board
    const polygonPoints = isTopRow
      ? '0,0 100,0 50,192'
      : '0,240 100,240 50,48';

    return (
      <div
        key={pointIndex}
        data-drop-point={pointIndex}
        onPointerDown={(e) => {
          // Touching or pressing on a human point starts drag for that point if it's not a target
          if (canSelect && !isTarget) {
            handleCheckerPointerDown(pointIndex, e);
          }
        }}
        onClick={() => {
          if (didDragRef.current) return;
          if (isTarget && targetInfo) {
            onSelectTarget(pointIndex, targetInfo.die);
          } else if (canSelect) {
            onSelectPoint(pointIndex);
          }
        }}
        className={`relative flex-1 h-full flex flex-col items-center justify-between cursor-pointer select-none group transition-all touch-none
          ${isHoveredDrop ? 'bg-amber-400/40 ring-4 ring-amber-300 ring-inset scale-[1.01] z-20 shadow-lg' : ''}
          ${isTarget && !isHoveredDrop ? 'bg-amber-400/20 ring-2 ring-amber-400 ring-inset' : ''}
          ${isHint ? 'ring-2 ring-emerald-400 ring-inset animate-pulse' : ''}
          ${isAISrc ? 'bg-amber-500/25 ring-2 ring-amber-400 ring-inset animate-pulse' : ''}
          ${isAITgt ? 'bg-rose-500/30 ring-3 ring-rose-400 ring-inset' : ''}
        `}
      >
        {/* SVG Triangle Point with clearly visible and outlined sharp tip (Spitze) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-xs"
          preserveAspectRatio="none"
          viewBox="0 0 100 240"
        >
          {/* Main Triangle Spike */}
          <polygon
            points={polygonPoints}
            fill={pointColor}
            stroke={pointBorder}
            strokeWidth="2.5"
            strokeLinejoin="round"
            className="transition-colors duration-150"
          />

          {/* Marquetry Inlaid Spine Accent down the center to emphasize the sharp tip */}
          <line
            x1="50"
            y1={isTopRow ? 0 : 240}
            x2="50"
            y2={isTopRow ? 190 : 50}
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth="1.2"
            strokeDasharray="2 3"
          />

          {/* Sharp Tip Highlight Bead */}
          <circle
            cx="50"
            cy={isTopRow ? 190 : 50}
            r="2.5"
            fill={pointBorder}
            className="opacity-80"
          />
        </svg>

        {/* Human Target Die badge */}
        {isTarget && targetInfo && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (didDragRef.current) return;
              onSelectTarget(pointIndex, targetInfo.die);
            }}
            className={`absolute z-30 px-2 py-0.5 rounded-full text-[11px] font-black shadow-md cursor-pointer pointer-events-auto transform transition-transform hover:scale-110 ${
              targetInfo.isHit
                ? 'bg-rose-600 text-white ring-2 ring-rose-300 animate-bounce'
                : 'bg-amber-500 text-stone-950 ring-1 ring-amber-300'
            } ${isTopRow ? 'top-[46%]' : 'bottom-[46%]'}`}
          >
            {targetInfo.isHit ? `Hit (+${targetInfo.die})` : `+${targetInfo.die}`}
          </div>
        )}

        {/* Checkers on Point */}
        <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-auto">
          {renderPointCheckers(pointIndex, isTopRow)}
        </div>

        {/* Point Number Badge */}
        {showPointNumbers && (
          <div
            className={`absolute z-20 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded pointer-events-none shadow-sm transition-opacity ${
              isEven
                ? 'text-[#362712] bg-[#fbf5e8]/90 border border-[#b5a77e]/80 shadow-xs'
                : 'text-amber-100 bg-[#4e1b10]/95 border border-[#9b3a25]/90'
            } ${isTopRow ? 'top-1' : 'bottom-1'}`}
          >
            {pointIndex}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`relative h-full max-h-full aspect-[16/10.5] w-auto max-w-full rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 shadow-2xl border-2 sm:border-4 transition-colors select-none flex flex-col justify-between shrink-0 touch-none ${themeStyles.rim}`}
      style={{
        boxShadow: '0 20px 45px -10px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.15)',
      }}
    >
      {/* Felt Playing Surface */}
      <div
        className={`relative flex-1 min-h-0 w-full rounded-lg sm:rounded-xl flex overflow-hidden shadow-inner border border-stone-900/30 touch-none ${themeStyles.felt}`}
      >
        {/* Main Board (Left & Right halves with Center Bar) */}
        <div className="relative flex-1 flex flex-col justify-between h-full">
          {/* Top Half (Points 13..24) */}
          <div className="flex-1 flex border-b-2 border-[#2b1810]/20">
            {/* Top-Left Quadrant (Points 13 to 18) */}
            <div className="flex-1 flex">
              {[13, 14, 15, 16, 17, 18].map((pt, idx) =>
                renderPoint(pt, true, idx % 2 === 0)
              )}
            </div>

            {/* Central Bar Top (Black checkers captured) */}
            <div
              data-bar-black="true"
              onClick={() => {
                if (didDragRef.current) return;
                if (isHumanTurn && currentPlayer === 'black' && board.bar.black > 0) {
                  onSelectPoint('bar');
                }
              }}
              className={`w-10 sm:w-13 md:w-15 flex flex-col items-center justify-start pt-1.5 sm:pt-2 border-x-2 border-[#1a0c07] relative z-20 transition-all ${
                themeStyles.rim
              } ${
                isHumanTurn && currentPlayer === 'black' && board.bar.black > 0
                  ? 'cursor-pointer hover:bg-amber-950/40 ring-2 ring-amber-400/50'
                  : ''
              } ${isAISource('bar') ? 'ring-2 ring-amber-400 bg-amber-950/70' : ''}`}
            >
              <div
                className={`w-6 sm:w-8 h-1.5 sm:h-2 rounded mb-1 ${themeStyles.hinge} border shadow-xs`}
              />
              <span
                className={`text-[9px] uppercase font-black tracking-wider mb-0.5 ${
                  board.bar.black > 0 ? 'text-amber-300 font-extrabold animate-pulse' : 'text-amber-200/70'
                }`}
              >
                {board.bar.black > 0 ? `Bar (${board.bar.black})` : 'Bar'}
              </span>

              {board.bar.black > 0 && (
                <div className="flex flex-col items-center -space-y-3.5 my-1">
                  {Array.from({ length: Math.min(board.bar.black, 4) }).map((_, i) => {
                    const isTopBlackBarChecker = i === Math.min(board.bar.black, 4) - 1;
                    const isAIDraggingFromBar = Boolean(
                      aiActiveMove?.phase === 'dragging' &&
                      aiActiveMove.from === 'bar' &&
                      isTopBlackBarChecker
                    );
                    const isHumanDraggingFromBar = Boolean(
                      dragState?.isDragging &&
                      dragState.from === 'bar' &&
                      isTopBlackBarChecker &&
                      currentPlayer === 'black'
                    );
                    const canInteractBlackBar = Boolean(
                      isHumanTurn && currentPlayer === 'black' && isTopBlackBarChecker
                    );
                    return (
                      <Checker
                        key={i}
                        player="black"
                        count={isTopBlackBarChecker ? board.bar.black : undefined}
                        size="sm"
                        isSelected={isBarSelected && isTopBlackBarChecker && currentPlayer === 'black'}
                        isHintSource={Boolean(hintStep && hintStep.from === 'bar' && isTopBlackBarChecker && currentPlayer === 'black')}
                        isDragging={isAIDraggingFromBar || isHumanDraggingFromBar}
                        isBlinking={canInteractBlackBar}
                        interactive={canInteractBlackBar}
                        onPointerDown={(e) => {
                          if (canInteractBlackBar) {
                            handleCheckerPointerDown('bar', e);
                          }
                        }}
                        onClick={() => {
                          if (didDragRef.current) return;
                          if (canInteractBlackBar) {
                            onSelectPoint('bar');
                          }
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top-Right Quadrant (Points 19 to 24) - Black's Home Board */}
            <div className="flex-1 flex">
              {[19, 20, 21, 22, 23, 24].map((pt, idx) =>
                renderPoint(pt, true, idx % 2 === 1)
              )}
            </div>
          </div>

          {/* Bottom Half (Points 12..1) */}
          <div className="flex-1 flex border-t-2 border-[#2b1810]/20">
            {/* Bottom-Left Quadrant (Points 12 down to 7) */}
            <div className="flex-1 flex">
              {[12, 11, 10, 9, 8, 7].map((pt, idx) =>
                renderPoint(pt, false, idx % 2 === 0)
              )}
            </div>

            {/* Central Bar Bottom (White checkers captured) */}
            <div
              data-bar-white="true"
              onClick={() => {
                if (didDragRef.current) return;
                if (isHumanTurn && currentPlayer === 'white' && board.bar.white > 0) {
                  onSelectPoint('bar');
                }
              }}
              className={`w-10 sm:w-13 md:w-15 flex flex-col items-center justify-end pb-1.5 sm:pb-2 border-x-2 border-[#1a0c07] relative z-20 transition-all ${
                themeStyles.rim
              } ${
                isHumanTurn && currentPlayer === 'white' && board.bar.white > 0
                  ? 'cursor-pointer hover:bg-amber-950/40 ring-2 ring-amber-400/50'
                  : ''
              }`}
            >
              {board.bar.white > 0 && (
                <div className="flex flex-col items-center -space-y-3.5 mb-1">
                  {Array.from({ length: Math.min(board.bar.white, 4) }).map((_, i) => {
                    const isTopBarChecker = i === Math.min(board.bar.white, 4) - 1;
                    const canInteractWhite = isHumanTurn && currentPlayer === 'white' && isTopBarChecker;
                    return (
                      <Checker
                        key={i}
                        player="white"
                        isSelected={isBarSelected && isTopBarChecker && currentPlayer === 'white'}
                        isHintSource={Boolean(hintStep && hintStep.from === 'bar' && isTopBarChecker && currentPlayer === 'white')}
                        isDragging={Boolean(dragState?.isDragging && dragState.from === 'bar' && isTopBarChecker && currentPlayer === 'white')}
                        isBlinking={canInteractWhite}
                        count={isTopBarChecker ? board.bar.white : undefined}
                        size="sm"
                        interactive={canInteractWhite}
                        onPointerDown={(e) => {
                          if (canInteractWhite) {
                            handleCheckerPointerDown('bar', e);
                          }
                        }}
                        onClick={() => {
                          if (didDragRef.current) return;
                          if (canInteractWhite) {
                            onSelectPoint('bar');
                          }
                        }}
                      />
                    );
                  })}
                </div>
              )}

              <span
                className={`text-[9px] uppercase font-black tracking-wider mb-1.5 ${
                  board.bar.white > 0
                    ? 'text-amber-300 font-extrabold'
                    : 'text-amber-200/70'
                }`}
              >
                {board.bar.white > 0 ? `Bar (${board.bar.white})` : 'Bar'}
              </span>

              <div
                className={`w-5 sm:w-7 h-1.5 sm:h-2 rounded ${themeStyles.hinge} border shadow-xs`}
              />
            </div>

            {/* Bottom-Right Quadrant (Points 6 down to 1) - White's Home Board */}
            <div className="flex-1 flex">
              {[6, 5, 4, 3, 2, 1].map((pt, idx) =>
                renderPoint(pt, false, idx % 2 === 1)
              )}
            </div>
          </div>

          {/* Centered Dice Layer directly on the playing field left and right of the central Bar */}
          {/* Sits "rein" on the felt with zero background plate, completely clear of the Spitzen */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-25 flex items-center pointer-events-none px-2 sm:px-4">
            {/* Left Half: Human White Player Dice */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="flex items-center relative">
                {isRolling && currentPlayer === 'white' && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black text-[10px] tracking-wide shadow-lg animate-bounce pointer-events-none whitespace-nowrap z-30 flex items-center gap-1">
                    <span>🎲</span>
                    <span>Würfelt...</span>
                  </div>
                )}
                {/* Dice container: clicking die 1, die 2, or the gap between them triggers roll */}
                <div
                  onClick={canRoll && currentPlayer === 'white' ? onRoll : undefined}
                  className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-2xl select-none transition-all ${
                    canRoll && currentPlayer === 'white'
                      ? 'cursor-pointer pointer-events-auto hover:scale-105 active:scale-95'
                      : 'pointer-events-none'
                  }`}
                  title={canRoll && currentPlayer === 'white' ? 'Klicke zum Würfeln' : undefined}
                >
                  {humanDice.length === 0 ? (
                    // Vor dem Würfeln: Weiße Würfel mit Fragezeichen
                    <>
                      <DiceFace
                        value="?"
                        showQuestionMark={true}
                        diceColor="white"
                        rotation={RESTING_ANGLES[0]}
                        isBlinking={canRoll && currentPlayer === 'white' && !isRolling}
                        isRolling={isRolling && currentPlayer === 'white'}
                      />
                      <DiceFace
                        value="?"
                        showQuestionMark={true}
                        diceColor="white"
                        rotation={RESTING_ANGLES[1]}
                        isBlinking={canRoll && currentPlayer === 'white' && !isRolling}
                        isRolling={isRolling && currentPlayer === 'white'}
                      />
                    </>
                  ) : (
                    humanDice.map((val, idx) => (
                      <DiceFace
                        key={idx}
                        value={val}
                        isUsed={humanUsedIndices.includes(idx)}
                        isRolling={isRolling && currentPlayer === 'white'}
                        diceColor="white"
                        rotation={RESTING_ANGLES[idx % RESTING_ANGLES.length]}
                      />
                    ))
                  )}
                </div>

                {/* Quick Undo button right next to the dice if white player moved checkers */}
                {canUndo && onUndo && currentPlayer === 'white' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUndo();
                    }}
                    className="pointer-events-auto ml-1.5 px-2 py-0.5 sm:py-1 bg-stone-900/90 hover:bg-stone-800 text-amber-300 border border-stone-700/80 rounded-full shadow-md text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 cursor-pointer hover:scale-105 transition-all"
                    title="Zug rückgängig machen"
                  >
                    <span>Zurück</span>
                  </button>
                )}
              </div>
            </div>

            {/* Central Bar Spacer - Matches the central Bar width exactly */}
            <div className="w-10 sm:w-13 md:w-15 shrink-0 pointer-events-none" />

            {/* Right Half: Black Player (Computer or Human Player 2) */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="flex items-center relative">
                {isRolling && currentPlayer === 'black' && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-black text-[10px] tracking-wide shadow-lg animate-bounce pointer-events-none whitespace-nowrap z-30 flex items-center gap-1">
                    <span>🎲</span>
                    <span>Würfelt...</span>
                  </div>
                )}
                {/* Quick Undo button for Black player if human */}
                {canUndo && onUndo && currentPlayer === 'black' && isHumanTurn && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUndo();
                    }}
                    className="pointer-events-auto mr-1.5 px-2 py-0.5 sm:py-1 bg-stone-900/90 hover:bg-stone-800 text-amber-300 border border-stone-700/80 rounded-full shadow-md text-[10px] sm:text-[11px] font-semibold flex items-center gap-1 cursor-pointer hover:scale-105 transition-all"
                    title="Zug rückgängig machen"
                  >
                    <span>Zurück</span>
                  </button>
                )}

                <div
                  onClick={canRoll && currentPlayer === 'black' ? onRoll : undefined}
                  className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-2xl select-none transition-all ${
                    canRoll && currentPlayer === 'black'
                      ? 'cursor-pointer pointer-events-auto hover:scale-105 active:scale-95'
                      : 'pointer-events-none'
                  }`}
                  title={canRoll && currentPlayer === 'black' ? 'Klicke zum Würfeln' : undefined}
                >
                  {computerDice.length === 0 ? (
                    // Vor dem Würfeln: Schwarze Würfel mit Fragezeichen
                    <>
                      <DiceFace
                        value="?"
                        showQuestionMark={true}
                        diceColor="black"
                        rotation={RESTING_ANGLES[0]}
                        isBlinking={canRoll && currentPlayer === 'black' && isHumanTurn && !isRolling}
                        isRolling={isRolling && currentPlayer === 'black'}
                      />
                      <DiceFace
                        value="?"
                        showQuestionMark={true}
                        diceColor="black"
                        rotation={RESTING_ANGLES[1]}
                        isBlinking={canRoll && currentPlayer === 'black' && isHumanTurn && !isRolling}
                        isRolling={isRolling && currentPlayer === 'black'}
                      />
                    </>
                  ) : (
                    computerDice.map((val, idx) => (
                      <DiceFace
                        key={idx}
                        value={val}
                        isUsed={computerUsedIndices.includes(idx)}
                        isRolling={isRolling && currentPlayer === 'black'}
                        diceColor="black"
                        rotation={RESTING_ANGLES[idx % RESTING_ANGLES.length]}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bear-Off Trays (Right Side) */}
        <div
          className={`w-12 sm:w-16 md:w-20 shrink-0 border-l-2 sm:border-l-3 border-stone-900/60 flex flex-col justify-between p-1 sm:p-2 ${
            themeStyles.rim
          } ${isAITarget('off') ? 'ring-2 ring-rose-400 bg-rose-950/40' : ''}`}
        >
          {/* Black Bear-Off (Top) */}
          <div
            data-drop-bearoff={currentPlayer === 'black' ? 'true' : undefined}
            data-bearoff-black="true"
            onClick={() => {
              if (didDragRef.current) return;
              if (barTarget && currentPlayer === 'black' && isHumanTurn) {
                onSelectTarget('off', barTarget.die);
              }
            }}
            className={`flex-1 flex flex-col items-center justify-start border-b border-[#3d2216]/80 pb-2 transition-all rounded-lg ${
              hoveredDropTarget === 'off' && barTarget && currentPlayer === 'black'
                ? 'cursor-pointer bg-emerald-800/60 ring-4 ring-emerald-300 scale-[1.02] shadow-lg'
                : barTarget && currentPlayer === 'black' && isHumanTurn
                ? 'cursor-pointer bg-emerald-950/40 ring-2 ring-emerald-400 hover:bg-emerald-900/50'
                : ''
            }`}
          >
            <span className="text-[10px] font-black text-amber-100 uppercase tracking-wider mb-1 max-w-full truncate">
              {player2Name || 'Schwarz'}
            </span>
            <div className="text-xs font-mono font-bold text-amber-400">
              {board.bornOff.black} / 15
            </div>

            {barTarget && currentPlayer === 'black' && isHumanTurn && (
              <div className="mt-1 px-1.5 py-0.5 bg-emerald-500 text-stone-950 text-[10px] font-black rounded shadow-md animate-bounce">
                Hinaus! (+{barTarget.die})
              </div>
            )}

            {/* Visual stacked bars */}
            <div className="mt-2 flex flex-col items-center -space-y-1 w-full px-1">
              {Array.from({ length: Math.min(board.bornOff.black, 10) }).map((_, i) => (
                <div
                  key={i}
                  className="w-full h-2 rounded-xs bg-gradient-to-r from-stone-900 via-stone-800 to-stone-950 border border-stone-600/80 shadow-xs"
                />
              ))}
            </div>
          </div>

          {/* White Bear-Off (Bottom) */}
          <div
            data-drop-bearoff={currentPlayer === 'white' ? 'true' : undefined}
            data-bearoff-white="true"
            onClick={() => {
              if (didDragRef.current) return;
              if (barTarget && currentPlayer === 'white') {
                onSelectTarget('off', barTarget.die);
              }
            }}
            className={`flex-1 flex flex-col items-center justify-end border-t border-[#3d2216]/80 pt-2 transition-all rounded-lg ${
              hoveredDropTarget === 'off' && barTarget && currentPlayer === 'white'
                ? 'cursor-pointer bg-emerald-800/60 ring-4 ring-emerald-300 scale-[1.02] shadow-lg'
                : barTarget && currentPlayer === 'white'
                ? 'cursor-pointer bg-emerald-950/40 ring-2 ring-emerald-400 hover:bg-emerald-900/50'
                : ''
            }`}
          >
            {barTarget && currentPlayer === 'white' && (
              <div className="mb-2 px-2 py-0.5 bg-emerald-500 text-stone-950 text-[10px] font-black rounded shadow-md animate-bounce">
                Hinaus! (+{barTarget.die})
              </div>
            )}

            {/* Visual stacked bars */}
            <div className="mb-2 flex flex-col items-center -space-y-1 w-full px-1">
              {Array.from({ length: Math.min(board.bornOff.white, 10) }).map((_, i) => (
                <div
                  key={i}
                  className="w-full h-2 rounded-xs bg-gradient-to-r from-amber-50 via-stone-100 to-amber-100 border border-amber-900/40 shadow-xs"
                />
              ))}
            </div>

            <div className="text-xs font-mono font-bold text-amber-100">
              {board.bornOff.white} / 15
            </div>
            <span
              className={`text-[10px] font-black uppercase tracking-wider mt-1 max-w-full truncate ${
                barTarget && currentPlayer === 'white' ? 'text-emerald-300 font-extrabold' : 'text-amber-100'
              }`}
            >
              {player1Name || 'Weiß'}
            </span>
          </div>
        </div>
      </div>

      {/* Floating Dragged Checker under user's finger / cursor (Pointer drag) */}
      {dragState && dragState.isDragging && (
        <div
          className="fixed pointer-events-none z-100 -translate-x-1/2 -translate-y-1/2 will-change-transform"
          style={{
            left: `${dragState.currentX}px`,
            top: `${dragState.currentY}px`,
          }}
        >
          <div className="scale-115 drop-shadow-2xl">
            <Checker
              player="white"
              size="md"
              isSelected={true}
            />
          </div>
        </div>
      )}

      {/* Floating Dragged Opponent Checker (Animated Drag across the board) */}
      {aiActiveMove && aiActiveMove.phase === 'dragging' && aiDragCoords && (
        <motion.div
          key={`ai-drag-${aiActiveMove.from}-${aiActiveMove.to}-${aiActiveMove.die}`}
          className="fixed pointer-events-none z-100 -translate-x-1/2 -translate-y-1/2 will-change-transform"
          initial={{
            left: `${aiDragCoords.startX}px`,
            top: `${aiDragCoords.startY}px`,
            scale: 1.05,
          }}
          animate={{
            left: `${aiDragCoords.endX}px`,
            top: `${aiDragCoords.endY}px`,
            scale: [1.05, 1.25, 1.2, 1.05],
          }}
          transition={{
            duration: 0.65,
            ease: [0.25, 1, 0.5, 1],
          }}
        >
          <div className="scale-115 drop-shadow-[0_22px_28px_rgba(0,0,0,0.9)]">
            <Checker
              player={aiActiveMove.player || 'black'}
              size="md"
              isSelected={true}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
};
