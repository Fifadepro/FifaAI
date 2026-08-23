import React from "react";
import { Download, Copy, Settings, Terminal, Sparkles, Box, Check, Flame } from "lucide-react";
import { PluginProject, GenerationSettings } from "../types";

interface HeaderProps {
  project: PluginProject;
  settings: GenerationSettings;
  isGenerating: boolean;
  onOpenSettings: () => void;
  onDownloadZip: () => void;
  onCopyAllCode: () => void;
  onToggleSimulator: () => void;
  showSimulator: boolean;
  copiedAll: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  settings,
  isGenerating,
  onOpenSettings,
  onDownloadZip,
  onCopyAllCode,
  onToggleSimulator,
  showSimulator,
  copiedAll,
}) => {
  return (
    <header className="bg-slate-900 border-b border-emerald-900/40 text-slate-100 px-4 py-3 sticky top-0 z-30 shadow-lg backdrop-blur-md bg-slate-900/95">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Logo & Plugin Info */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center shadow-md shadow-emerald-900/40 border border-emerald-400/30">
                <Box className="w-6 h-6 text-white" />
              </div>
              {isGenerating && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-slate-100 flex items-center gap-1.5 tracking-tight">
                  <span>FifaAI</span>
                  <span className="text-emerald-400 font-mono text-sm px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-500/30 rounded font-semibold">
                    Studio
                  </span>
                </h1>
                <span className="text-xs text-slate-400 hidden sm:inline-block border-l border-slate-700 pl-2">
                  Generator Pluginów Minecraft
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="font-mono text-emerald-300 font-semibold">{project.pluginName}</span>
                <span>•</span>
                <span className="bg-slate-800 px-1.5 py-0.2 rounded text-slate-300 border border-slate-700 font-mono">
                  {settings.platform} {settings.minecraftVersion}
                </span>
                <span>•</span>
                <span className="text-slate-400">{project.files.length} plików</span>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors md:hidden"
            title="Ustawienia projektu"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap sm:flex-nowrap">
          <button
            onClick={onToggleSimulator}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all border ${
              showSimulator
                ? "bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-900/30"
                : "bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Symulator Gry</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>Ustawienia</span>
          </button>

          <button
            onClick={onCopyAllCode}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5"
            title="Kopiuj zawartość aktywnego pliku"
          >
            {copiedAll ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Skopiowano!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Kopiuj</span>
              </>
            )}
          </button>

          <button
            onClick={onDownloadZip}
            disabled={isGenerating || project.files.length === 0}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/40 border border-emerald-400/40 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Pobierz .ZIP</span>
          </button>
        </div>
      </div>
    </header>
  );
};
