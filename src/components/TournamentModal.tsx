import React, { useState } from 'react';
import { TournamentPlayer, Player } from '../types/backgammon';
import { Trophy, Plus, Trash2, Play, Users, X, Award, RotateCcw } from 'lucide-react';
import { sound } from '../utils/audio';

interface TournamentModalProps {
  isOpen: boolean;
  players: TournamentPlayer[];
  whitePlayerId: string;
  blackPlayerId: string;
  targetPoints: number;
  onClose: () => void;
  onAddPlayer: (name: string) => void;
  onRemovePlayer: (id: string) => void;
  onSelectMatchup: (whiteId: string, blackId: string) => void;
  onSetTargetPoints: (pts: number) => void;
  onResetTournament: () => void;
  onStartMatch: () => void;
}

export const TournamentModal: React.FC<TournamentModalProps> = ({
  isOpen,
  players,
  whitePlayerId,
  blackPlayerId,
  targetPoints,
  onClose,
  onAddPlayer,
  onRemovePlayer,
  onSelectMatchup,
  onSetTargetPoints,
  onResetTournament,
  onStartMatch,
}) => {
  const [newPlayerName, setNewPlayerName] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;
    onAddPlayer(trimmed);
    setNewPlayerName('');
    sound.playClick();
  };

  // Sort players by points descending, then wins descending
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.wins - a.wins;
  });

  const whitePlayer = players.find((p) => p.id === whitePlayerId) || players[0];
  const blackPlayer = players.find((p) => p.id === blackPlayerId) || players[1] || players[0];

  const tournamentLeader = sortedPlayers[0];
  const isTargetReached = targetPoints > 0 && tournamentLeader && tournamentLeader.points >= targetPoints;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-stone-800 bg-stone-950/70 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-100 flex items-center gap-2">
                Mehrspieler-Turnier (2–8 Spieler)
              </h2>
              <p className="text-xs text-stone-400">
                Spielt in einer Gruppe nacheinander gegeneinander mit Punktetabelle
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-stone-200 text-sm">
          {/* Target Winner Banner if reached */}
          {isTargetReached && (
            <div className="bg-gradient-to-r from-amber-900/60 via-amber-800/40 to-amber-900/60 border border-amber-500/60 rounded-xl p-3 sm:p-4 text-center">
              <span className="text-2xl">👑</span>
              <h3 className="text-base sm:text-lg font-black text-amber-300">
                Turniersieger: {tournamentLeader.name}!
              </h3>
              <p className="text-xs text-amber-200/80">
                Ziel von {targetPoints} Punkten erreicht mit {tournamentLeader.points} Punkten und {tournamentLeader.wins} Siegen!
              </p>
            </div>
          )}

          {/* Current Matchup Selection Box */}
          <div className="bg-stone-950/60 border border-stone-800 rounded-xl p-3 sm:p-4">
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Aktuelles Duell</span>
              <span className="text-[11px] text-amber-400/90 font-mono">
                Ziel: {targetPoints > 0 ? `${targetPoints} Punkte` : 'Endlos'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              {/* White Player Selector */}
              <div className="flex items-center gap-2 bg-stone-900/90 border border-amber-500/30 rounded-lg p-2">
                <div className="w-4 h-4 rounded-full bg-stone-100 border border-stone-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-stone-400 uppercase font-bold">Weiß (Startspieler)</div>
                  <select
                    value={whitePlayerId}
                    onChange={(e) => {
                      onSelectMatchup(e.target.value, blackPlayerId);
                      sound.playClick();
                    }}
                    className="w-full bg-transparent text-stone-100 font-bold text-xs sm:text-sm focus:outline-hidden cursor-pointer"
                  >
                    {players.map((p) => (
                      <option key={p.id} value={p.id} className="bg-stone-900 text-stone-100">
                        {p.name} ({p.points} Pkt.)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Black Player Selector */}
              <div className="flex items-center gap-2 bg-stone-900/90 border border-stone-700 rounded-lg p-2">
                <div className="w-4 h-4 rounded-full bg-stone-900 border border-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-stone-400 uppercase font-bold">Schwarz</div>
                  <select
                    value={blackPlayerId}
                    onChange={(e) => {
                      onSelectMatchup(whitePlayerId, e.target.value);
                      sound.playClick();
                    }}
                    className="w-full bg-transparent text-stone-100 font-bold text-xs sm:text-sm focus:outline-hidden cursor-pointer"
                  >
                    {players.map((p) => (
                      <option key={p.id} value={p.id} className="bg-stone-900 text-stone-100">
                        {p.name} ({p.points} Pkt.)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {whitePlayerId === blackPlayerId && players.length > 1 && (
              <p className="text-xs text-rose-400 mt-2">
                Hinweis: Bitte wähle zwei unterschiedliche Spieler für das Duell.
              </p>
            )}
          </div>

          {/* Tournament Leaderboard Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-400 uppercase tracking-wider">
              <span>Rangliste & Punkte</span>
              <div className="flex items-center gap-1.5">
                <span>Ziel:</span>
                {[3, 5, 7, 10].map((pts) => (
                  <button
                    key={pts}
                    onClick={() => {
                      onSetTargetPoints(pts);
                      sound.playClick();
                    }}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                      targetPoints === pts
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {pts}P
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-stone-950/70 border border-stone-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-900/90 text-stone-400 uppercase text-[10px] font-bold border-b border-stone-800">
                  <tr>
                    <th className="py-2 px-3 w-10 text-center">Rang</th>
                    <th className="py-2 px-3">Spieler</th>
                    <th className="py-2 px-3 text-center">Spiele</th>
                    <th className="py-2 px-3 text-center">Siege</th>
                    <th className="py-2 px-3 text-right">Punkte</th>
                    <th className="py-2 px-2 w-8 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 font-mono">
                  {sortedPlayers.map((p, idx) => {
                    const isRank1 = idx === 0 && p.points > 0;
                    const isRank2 = idx === 1 && p.points > 0;
                    const isRank3 = idx === 2 && p.points > 0;

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-stone-800/30 transition-colors ${
                          p.id === whitePlayerId || p.id === blackPlayerId ? 'bg-amber-500/5' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center font-bold">
                          {isRank1 ? '🥇' : isRank2 ? '🥈' : isRank3 ? '🥉' : `${idx + 1}.`}
                        </td>
                        <td className="py-2 px-3 font-sans font-semibold text-stone-100 flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {p.id === whitePlayerId && (
                            <span className="text-[9px] px-1 py-0.2 bg-stone-800 text-amber-200 rounded border border-amber-500/30">
                              Weiß
                            </span>
                          )}
                          {p.id === blackPlayerId && (
                            <span className="text-[9px] px-1 py-0.2 bg-stone-900 text-amber-400 rounded border border-stone-700">
                              Schwarz
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center text-stone-400">
                          {p.wins + p.losses}
                        </td>
                        <td className="py-2 px-3 text-center text-emerald-400 font-bold">
                          {p.wins}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-amber-300 text-sm">
                          {p.points}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {players.length > 2 && (
                            <button
                              onClick={() => {
                                onRemovePlayer(p.id);
                                sound.playClick();
                              }}
                              className="text-stone-600 hover:text-rose-400 transition-colors cursor-pointer p-1"
                              title="Spieler entfernen"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              Punkteverteilung: Einfacher Sieg = <strong>1 Punkt</strong>, Gammon = <strong>2 Punkte</strong>, Backgammon = <strong>3 Punkte</strong>.
            </p>
          </div>

          {/* Add New Player Form */}
          {players.length < 8 ? (
            <form onSubmit={handleAdd} className="flex gap-2">
              <input
                type="text"
                placeholder="Neuen Spieler hinzufügen (z. B. Max, Tim...)"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                maxLength={18}
                className="flex-1 bg-stone-950 border border-stone-800 rounded-lg px-3 py-1.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-hidden focus:border-amber-500/70"
              />
              <button
                type="submit"
                disabled={!newPlayerName.trim()}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-amber-300 font-semibold rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Hinzufügen</span>
              </button>
            </form>
          ) : (
            <p className="text-xs text-amber-400/80">
              Maximal 8 Turnierteilnehmer erreicht.
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-stone-800 bg-stone-950/80 shrink-0">
          <button
            onClick={() => {
              if (window.confirm('Turnier wirklich zurücksetzen und alle Punkte löschen?')) {
                onResetTournament();
                sound.playClick();
              }
            }}
            className="text-xs text-stone-500 hover:text-stone-300 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Punkte zurücksetzen</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-stone-700 hover:bg-stone-800 text-stone-300 text-xs font-semibold cursor-pointer"
            >
              Schließen
            </button>
            <button
              onClick={() => {
                onStartMatch();
                sound.playClick();
              }}
              disabled={whitePlayerId === blackPlayerId}
              className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-stone-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer hover:scale-102"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Dieses Duell spielen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
