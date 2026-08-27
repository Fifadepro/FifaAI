import React from "react";
import { Sparkles, Code2, Layers, Cpu } from "lucide-react";

interface PluginCreationLoaderProps {
  text?: string;
  subtitle?: string;
  size?: "normal" | "large";
  isStreaming?: boolean;
}

export const PluginCreationLoader: React.FC<PluginCreationLoaderProps> = ({
  text = "FifaAI",
  subtitle = "Generowanie kodu pluginu przez silnik FifaAI...",
  size = "large",
  isStreaming = true,
}) => {
  // Ensure the word is formatted cleanly for scanning loader
  const displayText = text.toUpperCase();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 h-full min-h-[380px] bg-slate-950/80 rounded-2xl relative overflow-hidden select-none">
      {/* Background ambient glow circles */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-teal-500/15 rounded-full blur-2xl pointer-events-none" />

      <div className="creation-loader-container z-10 relative flex flex-col items-center gap-6">
        {/* Top badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="font-semibold tracking-wider">AI PLUGIN BUILDER</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </div>

        {/* 9-Slice Scanning Text Loader */}
        <div className={`loader ${size === "large" ? "loader-large" : ""}`}>
          <div className="text">
            <span>{displayText}</span>
          </div>
          <div className="text">
            <span>{displayText}</span>
          </div>
          <div className="text">
            <span>{displayText}</span>
          </div>
          <div className="text">
            <span>{displayText}</span>
          </div>
          <div className="text">
            <span>{displayText}</span>
          </div>
          <div className="text">
            <span>{displayText}</span>
          </div>
          <div className="text">
            <span>{displayText}</span>
          </div>
          <div className="text">
            <span>{displayText}</span>
          </div>
          <div className="text">
            <span>{displayText}</span>
          </div>
          <div className="line" />
        </div>

        {/* Status description */}
        <div className="flex flex-col items-center gap-2 text-center max-w-md mt-2">
          <p className="text-sm font-semibold text-slate-200 tracking-wide flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>{subtitle}</span>
          </p>
          <p className="text-xs text-slate-400 font-mono">
            Tworzenie struktury pakietów, rejestracja komend i kompilacja kodu źródłowego
          </p>
        </div>

        {/* Subtle bottom progress indicators */}
        <div className="flex items-center gap-2 pt-2">
          <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-400/90 flex items-center gap-1.5 shadow-sm">
            <Code2 className="w-3 h-3 text-emerald-400" />
            <span>Paper / Spigot 1.20+</span>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-cyan-400/90 flex items-center gap-1.5 shadow-sm">
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>Java 17 / Maven</span>
          </span>
        </div>
      </div>
    </div>
  );
};
