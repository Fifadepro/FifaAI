import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  FileCode,
  Copy,
  Check,
  Download,
  Folder,
  FileText,
  Terminal,
  Search,
  Sparkles,
  Maximize2,
  Minimize2,
  Code2,
  Package,
  Layers,
  Cpu,
  Zap,
} from "lucide-react";
import { ProjectFile } from "../types";

interface CodeViewerProps {
  files: ProjectFile[];
  activeFilePath: string;
  onSelectFile: (path: string) => void;
  isStreaming: boolean;
  streamText?: string;
  onAskAiAboutFile: (file: ProjectFile) => void;
  onDownloadJar?: () => void;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  files,
  activeFilePath,
  onSelectFile,
  isStreaming,
  streamText = "",
  onAskAiAboutFile,
  onDownloadJar,
}) => {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"code" | "live_stream">("code");
  const codeContainerRef = useRef<HTMLDivElement>(null);

  // Auto switch to live stream tab when generation begins
  useEffect(() => {
    if (isStreaming) {
      setViewMode("live_stream");
    } else {
      setViewMode("code");
    }
  }, [isStreaming]);

  // Auto scroll internal container down during live streaming (WITHOUT scrolling the outer page/window)
  useEffect(() => {
    if (isStreaming && viewMode === "live_stream" && codeContainerRef.current) {
      codeContainerRef.current.scrollTop = codeContainerRef.current.scrollHeight;
    }
  }, [streamText, isStreaming, viewMode]);

  // When generation finishes or active file changes, scroll to top of the code
  useEffect(() => {
    if (!isStreaming && codeContainerRef.current) {
      codeContainerRef.current.scrollTop = 0;
    }
  }, [isStreaming, activeFilePath, viewMode]);

  const activeFile = useMemo(() => {
    return files.find((f) => f.path === activeFilePath) || files[0] || null;
  }, [files, activeFilePath]);

  const handleCopy = () => {
    if (!activeFile) return;
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadSingleFile = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile.fileName;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith(".java")) {
      return <FileCode className="w-4 h-4 text-amber-400" />;
    }
    if (fileName.endsWith(".yml") || fileName.endsWith(".yaml")) {
      return <FileText className="w-4 h-4 text-emerald-400" />;
    }
    if (fileName.endsWith(".xml")) {
      return <Code2 className="w-4 h-4 text-cyan-400" />;
    }
    if (fileName.endsWith(".md")) {
      return <FileText className="w-4 h-4 text-blue-400" />;
    }
    return <FileCode className="w-4 h-4 text-slate-400" />;
  };

  // Lightweight syntax colorizer
  const highlightLine = (line: string, type: string) => {
    if (line.trim().startsWith("//") || line.trim().startsWith("#") || line.trim().startsWith("<!--")) {
      return <span className="text-slate-500 italic">{line}</span>;
    }

    if (type === "yaml") {
      const match = line.match(/^(\s*)([a-zA-Z0-9_-]+):(.*)$/);
      if (match) {
        return (
          <span>
            {match[1]}
            <span className="text-emerald-400 font-semibold">{match[2]}</span>:
            <span className="text-amber-300">{match[3]}</span>
          </span>
        );
      }
    }

    if (type === "java") {
      if (line.trim().startsWith("@")) {
        return <span className="text-amber-400 font-semibold">{line}</span>;
      }
      if (
        line.includes("public ") ||
        line.includes("private ") ||
        line.includes("protected ") ||
        line.includes("class ") ||
        line.includes("import ") ||
        line.includes("package ")
      ) {
        return <span className="text-slate-100">{line}</span>;
      }
    }

    return <span>{line}</span>;
  };

  // Render file with line numbers
  const renderHighlightedContent = (content: string) => {
    if (!content) return <span className="text-slate-500">// Oczekiwanie na kod...</span>;

    const lines = content.split("\n");
    return (
      <div className="table w-full font-mono text-xs leading-relaxed select-text">
        {lines.map((line, lineIdx) => {
          return (
            <div key={lineIdx} className="table-row hover:bg-slate-800/40">
              <span className="table-cell text-right pr-4 pl-2 py-0.5 select-none text-slate-600 border-r border-slate-800/80 w-12 text-[11px]">
                {lineIdx + 1}
              </span>
              <span className="table-cell pl-4 pr-2 py-0.5 whitespace-pre font-mono text-slate-200">
                {highlightLine(line, activeFile?.type || "java")}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Render live stream typewriter
  const renderLiveStreamContent = () => {
    const lines = streamText ? streamText.split("\n") : ["Inicjalizacja generowania kodu Java..."];
    return (
      <div className="space-y-3">
        {/* Live status bar */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/40 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                <Cpu className="w-4 h-4 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>FifaAI Engine pisze kod w czasie rzeczywistym</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-mono border border-emerald-500/40">
                  LIVE
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                <span>Strumień tokenów: {streamText.length} znaków</span>
                <span>•</span>
                <span>{lines.length} linii kodu</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-emerald-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-emerald-500/30">
              Paper API 1.20+
            </span>
          </div>
        </div>

        {/* Streaming Code Window */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 shadow-2xl relative">
          <div className="table w-full font-mono text-xs leading-relaxed select-text">
            {lines.map((line, lineIdx) => {
              const isLastLine = lineIdx === lines.length - 1;
              return (
                <div key={lineIdx} className="table-row hover:bg-slate-900/40">
                  <span className="table-cell text-right pr-4 pl-2 py-0.5 select-none text-slate-600 border-r border-slate-800/80 w-12 text-[11px]">
                    {lineIdx + 1}
                  </span>
                  <span className="table-cell pl-4 pr-2 py-0.5 whitespace-pre font-mono text-emerald-300">
                    {line}
                    {isLastLine && isStreaming && (
                      <span className="inline-block w-2 h-4 ml-1 bg-emerald-400 animate-pulse align-middle" />
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col transition-all ${
        isFullscreen ? "fixed inset-4 z-50 shadow-2xl border-emerald-500/50" : "h-full min-h-[500px]"
      }`}
    >
      {/* Tab Navigation Bar */}
      <div className="bg-slate-900 border-b border-slate-800 flex items-center justify-between px-2 overflow-x-auto">
        <div className="flex items-center gap-1 py-1.5 overflow-x-auto max-w-full">
          {/* Live Stream Tab (shown during streaming) */}
          {isStreaming ? (
            <div className="flex items-center gap-2 px-2">
              <div className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 bg-emerald-950 text-emerald-300 border border-emerald-500 shadow-md">
                <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>🔴 Generowanie kodu na żywo</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono animate-pulse">
                Tworzenie klas Java i plików konfiguracyjnych...
              </span>
            </div>
          ) : (
            /* Project File Tabs when not streaming */
            files.map((file) => {
              const isActive = viewMode === "code" && activeFile?.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => {
                    setViewMode("code");
                    onSelectFile(file.path);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap border cursor-pointer ${
                    isActive
                      ? "bg-slate-950 text-emerald-400 border-emerald-500/50 shadow-sm font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border-transparent"
                  }`}
                  title={file.path}
                >
                  {getFileIcon(file.fileName)}
                  <span>{file.fileName}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 pl-2 border-l border-slate-800 shrink-0">
          {onDownloadJar && (
            <button
              onClick={onDownloadJar}
              className="px-3 py-1 rounded-md text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer"
              title="Pobierz gotowy skompilowany plik .JAR dla Twojego serwera Minecraft"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Pobierz .JAR</span>
            </button>
          )}

          {activeFile && viewMode === "code" && !isStreaming && (
            <button
              onClick={() => onAskAiAboutFile(activeFile)}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Wyjaśnij kod lub zmodyfikuj z AI"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Wyjaśnij z AI</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            disabled={(!activeFile && viewMode === "code") || isStreaming}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer disabled:opacity-30"
            title="Kopiuj zawartość"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {activeFile && viewMode === "code" && !isStreaming && (
            <button
              onClick={handleDownloadSingleFile}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Pobierz ten plik źródłowy"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors hidden sm:block cursor-pointer"
            title={isFullscreen ? "Wyjdź z pełnego ekranu" : "Pełny ekran"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* File Path / Status bar */}
      {viewMode === "code" && activeFile && !isStreaming && (
        <div className="px-4 py-1.5 bg-slate-900/40 border-b border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5 truncate">
            <Folder className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-300 font-semibold">{activeFile.path}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span>{activeFile.content.split("\n").length} linii</span>
            <span>{new Blob([activeFile.content]).size} B</span>
            <span className="uppercase text-emerald-400/80 px-1 rounded bg-slate-900 border border-slate-800">
              {activeFile.type}
            </span>
          </div>
        </div>
      )}

      {/* Code / Stream Content Box */}
      <div ref={codeContainerRef} className="flex-1 overflow-auto p-3 bg-slate-950 relative">
        {viewMode === "live_stream" || isStreaming || !activeFile ? (
          renderLiveStreamContent()
        ) : (
          renderHighlightedContent(activeFile.content)
        )}
      </div>
    </div>
  );
};
