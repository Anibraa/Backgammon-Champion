import React, { useState } from 'react';
import {
  X,
  BookOpen,
  ShieldCheck,
  Swords,
  Trophy,
  HelpCircle,
  Dices,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RuleTopic = 'goal' | 'direction' | 'dice' | 'bar' | 'bearoff' | 'scoring';

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const [activeTopic, setActiveTopic] = useState<RuleTopic>('goal');

  if (!isOpen) return null;

  const topics: Array<{ id: RuleTopic; label: string; icon: React.ReactNode }> = [
    { id: 'goal', label: '1. Spielziel', icon: <Trophy className="w-4 h-4 text-amber-400" /> },
    { id: 'direction', label: '2. Zugrichtung', icon: <HelpCircle className="w-4 h-4 text-sky-400" /> },
    { id: 'dice', label: '3. Würfel & Pasch', icon: <Dices className="w-4 h-4 text-emerald-400" /> },
    { id: 'bar', label: '4. Schlagen & Bar', icon: <Swords className="w-4 h-4 text-rose-400" /> },
    { id: 'bearoff', label: '5. Hinauswürfeln', icon: <ShieldCheck className="w-4 h-4 text-amber-400" /> },
    { id: 'scoring', label: '6. Punkte & Gammon', icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-bold text-stone-100">
              Interaktive Backgammon Spielregeln
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clickable Topics Navigation Bar */}
        <div className="flex items-center gap-1.5 p-2 bg-stone-950/40 border-b border-stone-800/80 overflow-x-auto scrollbar-none">
          {topics.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTopic(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                activeTopic === t.id
                  ? 'bg-amber-500 text-stone-950 shadow-md font-bold'
                  : 'bg-stone-800/70 text-stone-400 hover:text-stone-200 hover:bg-stone-800 border border-stone-700/50'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Interactive Topic Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm text-stone-300 leading-relaxed">
          {activeTopic === 'goal' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-stone-800/50 border border-stone-700/60 rounded-xl p-4">
                <h3 className="text-base font-bold text-amber-300 mb-2 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Das Grundziel des Spiels
                </h3>
                <p>
                  Jeder Spieler besitzt <strong>15 Spielsteine</strong>. Du spielst mit den hellen (weißen) Steinen,
                  die Computer-KI mit den dunklen (schwarzen) Steinen.
                </p>
                <div className="mt-3 p-3 bg-stone-900/80 rounded-lg border border-stone-800 text-xs sm:text-sm text-stone-200">
                  <strong className="text-amber-400">Hauptaufgabe:</strong> Bringe all deine 15 Steine in dein
                  <strong> eigenes Heimfeld (Punkte 1 bis 6)</strong> und würfele sie als Erster komplett vom Brett
                  hinaus!
                </div>
              </div>

              {/* Interactive Rule Hint */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-stone-800/40 border border-stone-700/40">
                  <div className="font-bold text-stone-100 mb-1">Dein Heimfeld (Weiß)</div>
                  <p className="text-stone-400">
                    Befindet sich unten rechts: <strong>Punkte 1 bis 6</strong>. Sobald alle 15 weißen Steine hier
                    angekommen sind, startet das Hinauswürfeln.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-stone-800/40 border border-stone-700/40">
                  <div className="font-bold text-stone-100 mb-1">Heimfeld der KI (Schwarz)</div>
                  <p className="text-stone-400">
                    Befindet sich oben rechts: <strong>Punkte 19 bis 24</strong>. Der Computer versucht seine Steine
                    dorthin zu bringen.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTopic === 'direction' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-stone-800/50 border border-stone-700/60 rounded-xl p-4">
                <h3 className="text-base font-bold text-amber-300 mb-2 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-sky-400" />
                  Zugrichtung im Hufeisen-Muster
                </h3>
                <p>
                  Beide Spieler ziehen gegenläufig im Hufeisen über die 24 dreieckigen Felder (Zungen / Points):
                </p>
                <ul className="mt-3 space-y-2 text-xs sm:text-sm">
                  <li className="p-2.5 rounded-lg bg-stone-900/80 border border-stone-800 flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 mt-1 shrink-0" />
                    <div>
                      <strong className="text-amber-300">Du (Weiß):</strong> Startet oben rechts auf Feld 24, zieht über
                      das Außenfeld (18–13 und 12–7) gegen den Uhrzeigersinn nach unten rechts in dein Heimfeld (6–1).
                    </div>
                  </li>
                  <li className="p-2.5 rounded-lg bg-stone-900/80 border border-stone-800 flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-stone-400 mt-1 shrink-0" />
                    <div>
                      <strong className="text-stone-300">Computer (Schwarz):</strong> Zieht in die umgekehrte
                      Richtung: von Feld 1 über das Außenfeld hinauf in sein Heimfeld (19–24).
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTopic === 'dice' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-stone-800/50 border border-stone-700/60 rounded-xl p-4">
                <h3 className="text-base font-bold text-amber-300 mb-2 flex items-center gap-2">
                  <Dices className="w-5 h-5 text-emerald-400" />
                  Würfeln, Ziehen & Pasch-Regel
                </h3>
                <ul className="space-y-2.5 text-xs sm:text-sm">
                  <li>
                    <strong>Normaler Wurf (2 unterschiedliche Zahlen):</strong> Du darfst mit zwei Steinen je eine Zahl
                    ziehen, oder beide Zahlen nacheinander mit demselben Stein (sofern der Zwischenpunkt nicht blockiert
                    ist).
                  </li>
                  <li className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/40">
                    <strong className="text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Der Pasch (Doppelwurf):
                    </strong>
                    <p className="mt-1 text-stone-300">
                      Würfelst du zwei gleiche Zahlen (z.B. <strong>4-4</strong>), zählt jede Zahl doppelt! Du darfst
                      also <strong>vier Züge zu je 4 Punkten</strong> ausführen (insgesamt 16 Punkte).
                    </p>
                  </li>
                  <li>
                    <strong>Blockierte Felder:</strong> Stehen auf einem Feld <strong>2 oder mehr gegnerische Steine</strong>,
                    ist dieses Feld für dich blockiert. Dort kannst du weder landen noch zwischenlanden.
                  </li>
                  <li>
                    <strong>Zugzwang:</strong> Du musst stets so viele Würfel wie legal möglich nutzen. Kannst du nur einen
                    von zwei Würfeln spielen, musst du den höheren wählen.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTopic === 'bar' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-stone-800/50 border border-stone-700/60 rounded-xl p-4">
                <h3 className="text-base font-bold text-amber-300 mb-2 flex items-center gap-2">
                  <Swords className="w-5 h-5 text-rose-400" />
                  Schlagen & Der Bar-Zwang
                </h3>
                <p>
                  Ein einzelner Stein auf einem Feld heißt <strong>"Blot"</strong> und ist ungeschützt!
                </p>
                <div className="mt-3 space-y-2 text-xs sm:text-sm">
                  <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/50">
                    <strong className="text-rose-300">Wie wird geschlagen?</strong>
                    <p className="text-stone-300 mt-1">
                      Landest du mit deinem Zug auf einem Feld mit genau einem gegnerischen Stein, wird dieser
                      <strong> geschlagen</strong> und wandert auf den mittleren Balken (die <em>Bar</em>).
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50">
                    <strong className="text-amber-300">Zwingender Wiedereintritt von der Bar:</strong>
                    <p className="text-stone-300 mt-1">
                      Liegt mindestens ein Stein von dir auf der Bar, <strong>darfst du keinen anderen Stein bewegen</strong>,
                      bis alle Steine von der Bar wieder im Spiel sind!
                    </p>
                    <p className="text-stone-400 mt-1">
                      Weiß würfelt im gegnerischen Heimfeld (Punkte 19–24) ein: z.B. mit einer 1 auf Feld 24, mit einer 6
                      auf Feld 19 (sofern das Feld nicht von $\ge 2$ gegnerischen Steinen blockiert ist).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTopic === 'bearoff' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-stone-800/50 border border-stone-700/60 rounded-xl p-4">
                <h3 className="text-base font-bold text-amber-300 mb-2 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  Das Hinauswürfeln (Bear-off)
                </h3>
                <p>
                  Das Hinauswürfeln ist das Finale des Spiels:
                </p>
                <ul className="mt-3 space-y-2 text-xs sm:text-sm list-disc list-inside">
                  <li>
                    <strong>Voraussetzung:</strong> Alle 15 deiner Steine müssen sich im Heimfeld (Punkte 1 bis 6)
                    befinden und kein eigener Stein darf auf der Bar liegen.
                  </li>
                  <li>
                    <strong>Exakter Wurf:</strong> Ein Stein auf Punkt 4 kann mit einer gewürfelten 4 hinausgenommen
                    werden.
                  </li>
                  <li>
                    <strong>Höherer Wurf:</strong> Würfelst du z.B. eine 6, hast aber keinen Stein mehr auf Punkt 6, darfst
                    du den am weitesten entfernten Stein (z.B. auf Punkt 5 oder 4) hinausnehmen.
                  </li>
                  <li>
                    Du kannst statt Hinauszunehmen auch jederzeit normal innerhalb deines Heimfeldes nach vorne ziehen.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTopic === 'scoring' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-stone-800/50 border border-stone-700/60 rounded-xl p-4">
                <h3 className="text-base font-bold text-amber-300 mb-2 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  Die 3 offiziellen Gewinnstufen
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-xs">
                  <div className="p-3 rounded-xl bg-stone-900 border border-stone-700">
                    <div className="font-bold text-stone-100 flex items-center gap-1">
                      <span>Einfacher Sieg</span>
                      <span className="text-amber-400 font-mono">(1 Pkt)</span>
                    </div>
                    <p className="text-stone-400 mt-1">
                      Tritt ein, wenn der Verlierer bereits mindestens einen Stein hinausgewürfelt hat.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-600/40">
                    <div className="font-bold text-amber-300 flex items-center gap-1">
                      <span>Gammon</span>
                      <span className="text-amber-400 font-mono">(2 Pkt)</span>
                    </div>
                    <p className="text-stone-300 mt-1">
                      Tritt ein, wenn der Verlierer noch <strong>keinen einzigen Stein</strong> hinausgewürfelt hat!
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-600/40">
                    <div className="font-bold text-purple-300 flex items-center gap-1">
                      <span>Backgammon</span>
                      <span className="text-purple-400 font-mono">(3 Pkt)</span>
                    </div>
                    <p className="text-stone-300 mt-1">
                      Tritt ein, wenn der Verlierer noch 0 Steine heraus hat und noch Steine auf der Bar oder im gegnerischen
                      Heimfeld stehen hat!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-5 py-3 border-t border-stone-800 bg-stone-950/80 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-stone-400">
            <span>Klicke auf die oberen Reiter, um mehr zu erfahren.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer shadow-md"
          >
            Verstanden & Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
