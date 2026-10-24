import React, { useState, useEffect } from 'react';
import {
  Globe,
  Copy,
  Check,
  X,
  ArrowRight,
  Loader2,
  Sparkles,
  LogOut,
  KeyRound,
  Play,
  User,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface OnlineLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  onSetPlayerName: (name: string) => void;
  activeRoomId: string | null;
  isHostWaiting: boolean;
  onCreateRoom: (name: string) => Promise<void>;
  onJoinRoom: (roomId: string, name: string) => Promise<boolean>;
  onLeaveRoom: () => void;
  isConnecting: boolean;
  initialJoinCode?: string;
}

export const OnlineLobbyModal: React.FC<OnlineLobbyModalProps> = ({
  isOpen,
  onClose,
  playerName,
  onSetPlayerName,
  activeRoomId,
  isHostWaiting = false,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  isConnecting,
  initialJoinCode = '',
}) => {
  const [inputRoomCode, setInputRoomCode] = useState(initialJoinCode);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialJoinCode) {
      setInputRoomCode(initialJoinCode.toUpperCase());
    }
  }, [initialJoinCode]);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    if (!activeRoomId) return;
    try {
      await navigator.clipboard.writeText(activeRoomId);
      setCopiedCode(true);
      sound.playClick();
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyLink = async () => {
    if (!activeRoomId) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${activeRoomId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      sound.playClick();
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCreate = async () => {
    setErrorMsg(null);
    try {
      await onCreateRoom(playerName.trim() || 'Spieler 1');
      sound.playClick();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Fehler beim Erstellen des Raums. Bitte prüfe deine Verbindung.');
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const code = inputRoomCode.trim().toUpperCase();
    if (!code) {
      setErrorMsg('Bitte gib den 5-stelligen Raumcode ein.');
      return;
    }

    const success = await onJoinRoom(code, playerName.trim() || 'Spieler 2');
    if (success) {
      sound.playClick();
    } else {
      setErrorMsg(`Raum "${code}" nicht gefunden oder beendet. Bitte überprüfe den Code!`);
    }
  };

  const handleCancelAndClose = () => {
    sound.playClick();
    if (!activeRoomId || isHostWaiting) {
      onLeaveRoom();
    } else {
      onClose();
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCancelAndClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 pt-4 sm:pt-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
    >
      <div className="relative w-full max-w-xl sm:max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-stone-100 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3.5 border-b border-stone-800 bg-stone-950/80 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-100 flex items-center gap-2">
                Online-Spiel
              </h2>
              <p className="text-[10px] sm:text-xs text-stone-400">
                Spielt gegeneinander auf zwei verschiedenen Smartphones, Tablets oder PCs
              </p>
            </div>
          </div>
          <button
            onClick={handleCancelAndClose}
            className="p-1 sm:p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
            title="Schließen & Abbrechen"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3 sm:p-4 space-y-3 overflow-y-auto">
          {/* Compact Player Name bar */}
          <div className="bg-stone-950/70 border border-stone-800 rounded-xl px-3 py-2 flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-400 shrink-0">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Dein Name:</span>
            </div>
            <input
              type="text"
              value={playerName}
              onChange={(e) => onSetPlayerName(e.target.value)}
              placeholder="z. B. Spieler 1"
              maxLength={16}
              className="flex-1 bg-stone-900 border border-stone-700 focus:border-amber-500 rounded-lg px-2.5 py-1 text-xs sm:text-sm text-stone-100 focus:outline-hidden font-medium"
            />
          </div>

          {errorMsg && (
            <div className="p-2 sm:p-2.5 bg-rose-500/20 border border-rose-500/50 rounded-xl text-rose-300 text-xs text-center font-semibold">
              {errorMsg}
            </div>
          )}

          {/* FALL 1: Bereits ein Raum aktiv */}
          {activeRoomId ? (
            <div className="bg-stone-950 border border-amber-500/60 rounded-xl p-3.5 sm:p-4 text-center space-y-3 shadow-inner">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Raum ist aktiv & spielbereit</span>
              </div>

              <div>
                <span className="text-[10px] sm:text-xs text-stone-400 uppercase font-bold tracking-wider block mb-1">
                  Teile diesen 5-stelligen Code mit deinem Mitspieler:
                </span>
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-amber-400 bg-stone-900 border border-stone-800 py-2 sm:py-3 rounded-xl select-all shadow-inner">
                  {activeRoomId}
                </div>
              </div>

              <div className="flex items-center gap-2 justify-center pt-1">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer border border-stone-700"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Code kopiert!' : 'Code kopieren'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-950" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link kopiert!' : 'Link kopieren'}</span>
                </button>
              </div>

              <p className="text-[10px] sm:text-xs text-stone-400 leading-relaxed pt-0.5">
                Sobald dein Mitspieler auf seinem Gerät den Code eingibt oder den Link öffnet, startet das Spiel synchron!
              </p>

              <div className="pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => {
                    onLeaveRoom();
                    sound.playClick();
                  }}
                  className="px-3.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-200 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 mx-auto"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Raum schließen / Abbrechen</span>
                </button>
              </div>
            </div>
          ) : (
            /* FALL 2: Noch kein Raum aktiv -> "Raum erstellen" und "Raum beitreten" NEBENEINANDER */
            <div className="grid grid-cols-2 gap-2 sm:gap-3.5">
              {/* Spalte 1 (Links): Neuen Raum erstellen */}
              <div className="bg-stone-950/90 border border-amber-500/30 hover:border-amber-500/60 transition-all rounded-xl p-2.5 sm:p-4 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-black flex items-center justify-center shrink-0">
                      1
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-stone-100 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="truncate">Raum erstellen</span>
                    </h3>
                  </div>

                  <p className="text-[10px] sm:text-xs text-stone-400 leading-snug">
                    Du beginnst mit <strong className="text-stone-200">Weiß (unten)</strong> und erhältst sofort den 5-stelligen Code.
                  </p>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={isConnecting}
                    className="w-full py-2 sm:py-2.5 px-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black rounded-xl text-[11px] sm:text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                    <span>Jetzt Raum erstellen</span>
                  </button>
                </div>
              </div>

              {/* Spalte 2 (Rechts): Raum beitreten */}
              <form
                onSubmit={handleJoin}
                className="bg-stone-950/90 border border-emerald-500/30 hover:border-emerald-500/60 transition-all rounded-xl p-2.5 sm:p-4 flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black flex items-center justify-center shrink-0">
                      2
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-stone-100 flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">Raum beitreten</span>
                    </h3>
                  </div>

                  <p className="text-[10px] sm:text-xs text-stone-400 leading-snug">
                    Gib den Code deines Mitspielers ein. Du spielst mit <strong className="text-stone-200">Schwarz</strong>.
                  </p>
                </div>

                <div className="space-y-1.5 pt-0.5">
                  <input
                    type="text"
                    value={inputRoomCode}
                    onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                    onFocus={(e) => {
                      // Ensure input stays visible when mobile keyboard opens
                      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    placeholder="z. B. BG749"
                    maxLength={8}
                    className="w-full bg-stone-900 border-2 border-emerald-500/50 focus:border-emerald-400 rounded-lg px-2 py-1 sm:py-1.5 text-center text-sm sm:text-base font-mono font-black tracking-widest text-emerald-300 focus:outline-hidden uppercase placeholder:text-stone-600"
                  />

                  <button
                    type="submit"
                    disabled={isConnecting || !inputRoomCode.trim()}
                    className="w-full py-1.5 sm:py-2 px-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-stone-950 font-black rounded-lg text-[11px] sm:text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {isConnecting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5" />
                    )}
                    <span>Beitreten</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3 border-t border-stone-800 bg-stone-950/90 shrink-0">
          <span className="text-[10px] sm:text-[11px] text-stone-500 truncate">
            Echtzeit-Synchronisation via Firebase
          </span>

          <div className="flex items-center gap-2">
            {activeRoomId && (
              <button
                type="button"
                onClick={() => {
                  onLeaveRoom();
                  sound.playClick();
                }}
                className="px-2.5 sm:px-3 py-1 rounded-lg border border-rose-800/60 bg-rose-950/50 hover:bg-rose-900 text-rose-200 text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
                title="Aktives Online-Spiel beenden"
              >
                <LogOut className="w-3 h-3" />
                <span>Spiel beenden</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCancelAndClose}
              className="px-3 py-1 sm:py-1.5 rounded-lg border border-stone-700 hover:bg-stone-800 text-stone-300 text-[11px] sm:text-xs font-semibold cursor-pointer transition-all hover:text-stone-100"
            >
              Abbrechen / Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
