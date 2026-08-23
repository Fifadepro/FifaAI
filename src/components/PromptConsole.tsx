import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  Terminal,
  Layers,
  Wand2,
  Zap,
  Shield,
  Palette,
  LayoutGrid,
  Volume2,
  Lock,
  Clock,
  Database,
  Compass,
} from "lucide-react";

interface PromptConsoleProps {
  onGenerate: (prompt: string, mode: "new" | "modify") => void;
  isGenerating: boolean;
  streamText: string;
  hasExistingProject: boolean;
  onSelectModifier: (text: string) => void;
}

export const PromptConsole: React.FC<PromptConsoleProps> = ({
  onGenerate,
  isGenerating,
  streamText,
  hasExistingProject,
}) => {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"new" | "modify">(hasExistingProject ? "modify" : "new");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (hasExistingProject) {
      setMode("modify");
    }
  }, [hasExistingProject]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    onGenerate(prompt.trim(), mode);
    setPrompt("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const appendModifier = (modifier: string) => {
    setPrompt((prev) => (prev ? `${prev.trim()} ${modifier}` : modifier));
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const quickModifiers = [
    { label: "+ GUI Menu", text: "z graficznym GUI menu ekwipunku", icon: LayoutGrid },
    { label: "+ Cooldown", text: "z czasem odnowienia (cooldown 30s)", icon: Clock },
    { label: "+ Dźwięki & Cząsteczki", text: "z efektami cząsteczkowymi (particles) i dźwiękami Sound", icon: Volume2 },
    { label: "+ Uprawnienie VIP", text: "z uprawnieniem 'plugin.vip' i sprawdzaniem uprawnień", icon: Lock },
    { label: "+ Zapis do SQLite/Config", text: "z trwałym zapisem danych graczy do pliku", icon: Database },
    { label: "+ Tab Completer", text: "z podpowiedziami argumentów w tabulatorze (TabCompleter)", icon: Terminal },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-3">
      {/* Mode selector & status */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setMode("modify")}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              mode === "modify"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Modyfikuj Projekt (+Dodaj)
          </button>
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              mode === "new"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Nowy Cały Plugin
          </button>
        </div>

        {isGenerating && (
          <div className="flex items-center gap-1.5 text-emerald-400 font-mono animate-pulse bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-500/30">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Generowanie kodu w czasie rzeczywistym...</span>
          </div>
        )}
      </div>

      {/* Main Prompt Input */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative rounded-xl border border-slate-700 bg-slate-950/90 focus-within:border-emerald-500/80 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all shadow-inner">
          <div className="px-3 pt-2.5 pb-1 flex items-center gap-2 text-xs text-slate-400 border-b border-slate-800/80">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium text-slate-300">
              {mode === "modify"
                ? "Wpisz co dodać do pluginu (np. nową komendę, event, menu, mechanikę):"
                : "Napisz opis pluginu lub komendy, które ma posiadać:"}
            </span>
          </div>

          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === "modify"
                ? "np. Dodaj komendę /god z uprawnieniem plugin.god i informacją w chatcie oraz menu /pomoc"
                : "np. Stwórz plugin na system gildii z tworzeniem tagu nad głową, strefą 20x20 chronioną przed niszczeniem i komendą /gildia stwoz <nazwa>"
            }
            rows={3}
            disabled={isGenerating}
            className="w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none font-sans leading-relaxed disabled:opacity-50"
          />

          <div className="px-3 pb-2.5 pt-1 flex items-center justify-between gap-2 border-t border-slate-900/60">
            <div className="text-[11px] text-slate-500 hidden sm:block">
              Naciśnij <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">Enter</kbd> aby generować, <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 font-mono">Shift+Enter</kbd> nowa linia
            </div>

            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="ml-auto px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-md shadow-emerald-900/40"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Pisanie kodu...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{mode === "modify" ? "Zaktualizuj Plugin" : "Generuj Plugin"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Quick Feature Modifiers */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
          <Wand2 className="w-3 h-3 text-emerald-400" />
          Szybkie dodatki do polecenia:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {quickModifiers.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => appendModifier(mod.text)}
                disabled={isGenerating}
                className="px-2.5 py-1 rounded-md text-xs bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 hover:text-emerald-300 border border-slate-700/60 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Icon className="w-3 h-3 text-emerald-400/80" />
                <span>{mod.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
