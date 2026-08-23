import React, { useState } from "react";
import {
  X,
  Terminal,
  HelpCircle,
  Copy,
  Check,
  AlertTriangle,
  FolderOpen,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowRight,
  Package,
} from "lucide-react";
import { PluginProject } from "../types";

interface CompileGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: PluginProject;
  onDownloadZip: () => void;
}

export const CompileGuideModal: React.FC<CompileGuideModalProps> = ({
  isOpen,
  onClose,
  project,
  onDownloadZip,
}) => {
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<"quick" | "intellij" | "error">("error");

  if (!isOpen) return null;

  const handleCopyCmd = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const jarName = `${project.pluginName || "Plugin"}-${project.version || "1.0.0"}.jar`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/90 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Dlaczego plugin był na czerwono? (ClassNotFoundException)
              </h2>
              <p className="text-[11px] text-slate-400">
                Rozwiązanie problemu i instrukcja kompilacji dla Minecraft
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveGuideTab("error")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors border-t border-x cursor-pointer ${
              activeGuideTab === "error"
                ? "bg-slate-900 text-amber-400 border-amber-500/40 border-b-slate-900"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            Wyjaśnienie błędu
          </button>
          <button
            onClick={() => setActiveGuideTab("quick")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors border-t border-x cursor-pointer ${
              activeGuideTab === "quick"
                ? "bg-slate-900 text-emerald-400 border-emerald-500/40 border-b-slate-900"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            Kompilacja Maven (1 komenda)
          </button>
          <button
            onClick={() => setActiveGuideTab("intellij")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors border-t border-x cursor-pointer ${
              activeGuideTab === "intellij"
                ? "bg-slate-900 text-blue-400 border-blue-500/40 border-b-slate-900"
                : "text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            IntelliJ IDEA / Eclipse
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-slate-300 leading-relaxed">
          {activeGuideTab === "error" && (
            <div className="space-y-4">
              {/* Alert box */}
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Dlaczego Minecraft wyświetla: "Cannot find main class"?</span>
                </div>
                <p className="text-[11px] leading-normal text-amber-200/90">
                  Silnik serwera Minecraft (Paper / Spigot / Purpur) uruchamia kod maszynowy Javy (skompilowane pliki <strong>.class</strong>), a nie surowy tekst kodu źródłowego (pliki <strong>.java</strong>).
                </p>
                <p className="text-[11px] leading-normal text-amber-200/90">
                  Gdy wrzucisz surowe pliki do folderu plugins, serwer nie widzi skompilowanej klasy głównej i wyświetla plugin na czerwono.
                </p>
              </div>

              {/* Steps to fix */}
              <div className="space-y-2.5">
                <h3 className="font-bold text-white text-xs">Jak poprawnie uruchomić plugin (3 proste kroki):</h3>

                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      1
                    </span>
                    <div className="space-y-1">
                      <div className="font-semibold text-white">Pobierz źródła projektu (.ZIP)</div>
                      <div className="text-[11px] text-slate-400">
                        Projekt zawiera gotowy plik <code className="text-emerald-300 font-mono">pom.xml</code> oraz automatyczny skrypt <code className="text-emerald-300 font-mono">build.bat</code>.
                      </div>
                      <button
                        onClick={onDownloadZip}
                        className="mt-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Pobierz projekt {project.pluginName} (.ZIP)</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      2
                    </span>
                    <div className="space-y-1.5 flex-1">
                      <div className="font-semibold text-white">Skompiluj za pomocą Maven lub skryptu</div>
                      <div className="text-[11px] text-slate-400">
                        Wypakuj archiwum i kliknij dwukrotnie <code className="text-amber-300 font-mono">build.bat</code> lub wklej komendę:
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-400">
                        <span>mvn clean package</span>
                        <button
                          onClick={() => handleCopyCmd("mvn clean package")}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                          title="Kopiuj polecenie"
                        >
                          {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      3
                    </span>
                    <div className="space-y-1">
                      <div className="font-semibold text-white">Wrzuć gotowy plik .jar na serwer</div>
                      <div className="text-[11px] text-slate-400">
                        Maven utworzy folder <code className="text-emerald-300 font-mono">target/</code> z plikiem <code className="text-emerald-300 font-mono">{jarName}</code>. Skopiuj go do folderu <code className="text-emerald-300 font-mono">plugins/</code> i zrestartuj serwer!
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeGuideTab === "quick" && (
            <div className="space-y-3.5">
              <p className="text-slate-300 text-xs">
                Projekt posiada standardową strukturę <strong>Maven</strong> zgodną z wszystkimi wersjami Paper & Spigot (1.20 / 1.21).
              </p>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="font-semibold text-white flex items-center justify-between">
                  <span>Polecenie kompilacji w terminalu / konsoli:</span>
                  <button
                    onClick={() => handleCopyCmd("mvn clean package")}
                    className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    {copiedCmd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Kopiuj</span>
                  </button>
                </div>
                <pre className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                  mvn clean package
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="font-semibold text-white text-xs">Gdzie znajdę gotowy plik po kompilacji?</div>
                <p className="text-[11px] text-slate-400">
                  Po wykonaniu kompilacji Maven stworzy podfolder <span className="text-amber-300 font-mono font-bold">target/</span>.
                  W nim znajdziesz gotowy plik:
                </p>
                <div className="p-2 rounded bg-slate-900 font-mono text-emerald-300 text-[11px]">
                  target/{jarName}
                </div>
              </div>
            </div>
          )}

          {activeGuideTab === "intellij" && (
            <div className="space-y-3">
              <p className="text-slate-300 text-xs">
                Jak załadować i skompilować plugin w <strong>IntelliJ IDEA</strong>:
              </p>

              <ol className="list-decimal list-inside space-y-2 text-[11px] text-slate-300">
                <li>Rozpakuj pobrany plik <code>.zip</code>.</li>
                <li>W IntelliJ kliknij <strong>File ➔ Open</strong> i wybierz folder z rozpakowanym projektem (lub bezpośrednio plik <code>pom.xml</code>).</li>
                <li>Poczekaj chwilę, aż IntelliJ załaduje zależności Paper API.</li>
                <li>W prawym panelu kliknij zakładkę <strong>Maven</strong> ➔ <strong>Lifecycle</strong> ➔ kliknij dwukrotnie <strong>package</strong>.</li>
                <li>Gotowy plik <code>{jarName}</code> pojawi się w folderze <code>target/</code>!</li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <button
            onClick={onDownloadZip}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-colors shadow-lg cursor-pointer"
          >
            <Package className="w-4 h-4" />
            <span>Pobierz projekt Maven (.ZIP)</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Rozumiem, zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
