import React, { useState } from "react";
import { Sparkles, ArrowRight, Zap, Compass, Shield, Gift, Terminal, Trash2 } from "lucide-react";
import { motion } from "motion/react";

interface SmoothStartScreenProps {
  onStart: (prompt: string) => void;
  isGenerating?: boolean;
}

const STARTER_IDEAS = [
  {
    icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
    label: "Wirtualny Kosz /kosz",
    prompt: "Stwórz plugin na wirtualny kosz na śmieci (/kosz) z 36-slotowym ekwipunkiem GUI, który bezpowrotnie usuwa wrzucone przedmioty po zamknięciu i ma uprawnienie fifaai.kosz.use.",
  },
  {
    icon: <Shield className="w-3.5 h-3.5 text-indigo-400" />,
    label: "Panel Admina /adminpanel",
    prompt: "Stwórz zaawansowany plugin na Panel Administratora z komendą /adminpanel (alias /ap), interaktywnym menu GUI (leczenie graczy, włączanie latania, zmiana pogody, czyszczenie czatu) i uprawnieniem fifaai.adminpanel.use.",
  },
  {
    icon: <Compass className="w-3.5 h-3.5 text-cyan-400" />,
    label: "Losowy Teleport /rtp",
    prompt: "Napisz plugin na losowy teleport (/rtp) z bezpiecznym wyszukiwaniem stałego lądu (bez wody i lawy), 3-sekundowym odliczaniem z blokadą ruchu i konfigurowalnym promieniem w config.yml.",
  },
  {
    icon: <Gift className="w-3.5 h-3.5 text-emerald-400" />,
    label: "Nagrody Dzienne /daily",
    prompt: "Stwórz plugin z menu GUI na nagrody dzienne (/daily), z 24-godzinnym czasem oczekiwania, dźwiękiem odbioru oraz uprawnieniem VIP z podwójnymi nagrodami.",
  },
];

export const SmoothStartScreen: React.FC<SmoothStartScreenProps> = ({
  onStart,
  isGenerating = false,
}) => {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    onStart(prompt.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-140px)] px-4 py-8 max-w-4xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full flex flex-col items-center text-center space-y-6"
      >
        {/* Subtle Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/30 text-emerald-400 text-xs font-medium backdrop-blur-sm shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono">FifaAI Engine • Minecraft Plugin Architect</span>
        </div>

        {/* Main Heading requested by user */}
        <div className="space-y-3 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Wpisz na czym ma polegać plugin, <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              a ja go wygeneruję
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            Opisz dowolne komendy, przedmioty, eventy czy mechaniki. Wygeneruję dla Ciebie
            kompletny kod Java (Paper / Spigot), pliki konfiguracyjne i strukturę projektu.
          </p>
        </div>

        {/* Smooth Large Input Card */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl relative mt-2 group"
        >
          <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 focus-within:border-emerald-500/80 shadow-2xl transition-all duration-200 overflow-hidden">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder="Np. Chcę plugin na różdżkę zamrażania graczy na 3 sekundy po trafieniu śnieżką z komendą /freezerod..."
              className="w-full bg-transparent px-4 py-4 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
              autoFocus
            />

            <div className="flex items-center justify-between px-4 py-3 bg-slate-950/60 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                <Terminal className="w-3.5 h-3.5 text-slate-600" />
                <span>Naciśnij <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">Enter</kbd> aby wygenerować</span>
              </div>

              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all transform active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Wygeneruj plugin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>

        {/* Minimalist Starter Ideas */}
        <div className="w-full max-w-2xl pt-2 space-y-2.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-left pl-1">
            Przykładowe pomysły:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STARTER_IDEAS.map((idea, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onStart(idea.prompt)}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-900 transition-all text-left group flex items-start gap-3"
              >
                <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 shrink-0 group-hover:border-emerald-500/30">
                  {idea.icon}
                </div>
                <div className="space-y-0.5 truncate">
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">
                    {idea.label}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {idea.prompt}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
