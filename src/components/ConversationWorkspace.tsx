import React, { useState, useRef, useEffect, useCallback } from "react";
import Markdown from "react-markdown";
import {
  Sparkles,
  Send,
  Loader2,
  Code2,
  Terminal,
  Download,
  Copy,
  Check,
  RotateCcw,
  Bot,
  User,
  Settings,
  Play,
  ArrowDown,
  FileCode,
  Package,
  Layers,
  ChevronDown,
  HelpCircle,
} from "lucide-react";
import { ConversationMessage, PluginProject, ProjectFile, GenerationSettings } from "../types";
import { CodeViewer } from "./CodeViewer";
import { MinecraftChatSimulator } from "./MinecraftChatSimulator";
import { CommandsList } from "./CommandsList";
import { MinecraftColorPicker } from "./MinecraftColorPicker";

interface ConversationWorkspaceProps {
  messages: ConversationMessage[];
  currentProject: PluginProject;
  activeFilePath: string;
  onSelectFile: (path: string) => void;
  isGenerating: boolean;
  isCompilingJar?: boolean;
  streamText?: string;
  onSendMessage: (prompt: string) => void;
  onDownloadJar: () => void;
  onDownloadZip: () => void;
  onOpenCompileGuide: () => void;
  onCopyCode: () => void;
  copied: boolean;
  onOpenSettings: () => void;
  onNewPlugin: () => void;
  onAskAiAboutFile: (file: ProjectFile) => void;
  settings: GenerationSettings;
}

export const ConversationWorkspace: React.FC<ConversationWorkspaceProps> = ({
  messages,
  currentProject,
  activeFilePath,
  onSelectFile,
  isGenerating,
  isCompilingJar = false,
  streamText,
  onSendMessage,
  onDownloadJar,
  onDownloadZip,
  onOpenCompileGuide,
  onCopyCode,
  copied,
  onOpenSettings,
  onNewPlugin,
  onAskAiAboutFile,
  settings,
}) => {
  const [inputText, setInputText] = useState("");
  const [activeTab, setActiveTab] = useState<"code" | "simulator" | "commands">("code");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check scroll position to determine if user manually scrolled up
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    // If user is further than 70px from the bottom, consider them scrolled up
    const isScrolledUp = distanceFromBottom > 70;
    setIsUserScrolledUp(isScrolledUp);
  }, []);

  // Only auto-scroll down if user hasn't scrolled up!
  useEffect(() => {
    if (!isUserScrolledUp && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isGenerating, isUserScrolledUp]);

  // When a new message from the user is sent, force scroll to bottom and reset isUserScrolledUp
  const scrollToBottom = () => {
    setIsUserScrolledUp(false);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    onSendMessage(inputText.trim());
    setInputText("");
    scrollToBottom();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const QUICK_SUGGESTIONS = [
    "Dodaj uprawnienie administratora",
    "Zmień cooldown na 5 sekund",
    "Dodaj komendę przeładowania /reload",
    "Dodaj dźwięki i cząsteczki",
  ];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-slate-950">
      {/* Top Action Bar */}
      <div className="h-14 border-b border-slate-800/90 bg-slate-900/90 px-4 flex items-center justify-between gap-3 shrink-0 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onNewPlugin}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            title="Rozpocznij nowy plugin od zera"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nowy plugin</span>
          </button>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {currentProject.pluginName}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-mono hidden sm:inline">
              {currentProject.platform} {currentProject.minecraftVersion}
            </span>
          </div>
        </div>

        {/* View mode switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab("code")}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "code"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Kod projektu</span>
          </button>

          <button
            onClick={() => setActiveTab("simulator")}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "simulator"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Symulator czatu</span>
          </button>

          <button
            onClick={() => setActiveTab("commands")}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "commands"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Komendy</span>
            <span>({currentProject.commands.length})</span>
          </button>
        </div>

        {/* Action buttons with primary Pobierz .JAR */}
        <div className="flex items-center gap-2 relative">
          <button
            onClick={onCopyCode}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Kopiuj aktywny plik"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Primary .JAR Download Button with split menu for .ZIP */}
          <div className="relative flex items-center">
            <button
              onClick={onDownloadJar}
              disabled={isCompilingJar}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md transition-colors cursor-pointer border-r border-emerald-700/60"
              title="Kompiluj i pobierz gotowy plik .JAR dla serwera Minecraft"
            >
              {isCompilingJar ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-200" />
              ) : (
                <Package className="w-3.5 h-3.5" />
              )}
              <span>{isCompilingJar ? "Kompilacja .JAR..." : "Pobierz .JAR"}</span>
            </button>

            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              disabled={isCompilingJar}
              className="px-1.5 py-1.5 rounded-r-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer"
              title="Więcej opcji pobierania"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown for download options */}
            {showDownloadMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                <button
                  onClick={() => {
                    setShowDownloadMenu(false);
                    onDownloadJar();
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-emerald-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Package className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-semibold">Plik .JAR (Serwer)</div>
                    <div className="text-[10px] text-slate-400">Gotowy do /plugins</div>
                  </div>
                </button>

                <div className="h-px bg-slate-800 my-1" />

                <button
                  onClick={() => {
                    setShowDownloadMenu(false);
                    onDownloadZip();
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-slate-400" />
                  <div>
                    <div className="font-semibold">Źródła Maven (.ZIP)</div>
                    <div className="text-[10px] text-slate-400">Do kompilacji mvn/IDEA</div>
                  </div>
                </button>

                <div className="h-px bg-slate-800 my-1" />

                <button
                  onClick={() => {
                    setShowDownloadMenu(false);
                    onOpenCompileGuide();
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-medium text-amber-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="font-semibold">Błąd na serwerze?</div>
                    <div className="text-[10px] text-slate-400">Instrukcja kompilacji</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onOpenCompileGuide}
            className="p-2 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 text-amber-400 border border-amber-500/30 transition-colors cursor-pointer"
            title="Instrukcja uruchomienia i naprawy błędu ClassNotFoundException"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Ustawienia generowania"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 2-Panel Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left: Chat Conversation (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col h-full border-r border-slate-800/80 bg-slate-950/60 relative">
          {/* Messages Stream Container with Scroll Detection */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-4 relative"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs leading-relaxed ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] rounded-2xl p-3.5 shadow-md ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white rounded-tr-sm font-medium whitespace-pre-wrap"
                      : "bg-slate-900 border border-slate-800/90 text-slate-200 rounded-tl-sm space-y-2.5"
                  }`}
                >
                  {msg.role === "user" ? (
                    <div>{msg.content}</div>
                  ) : (
                    <div className="prose prose-invert prose-emerald text-xs leading-relaxed max-w-none break-words">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  )}

                  {/* Summary / Commands pill if available in assistant snapshot */}
                  {msg.projectSnapshot && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-2">
                      {msg.projectSnapshot.commands.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 font-semibold">Komendy:</span>
                          {msg.projectSnapshot.commands.map((c, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-slate-950 border border-emerald-500/30 text-emerald-300 font-mono text-[10px]"
                            >
                              /{c.name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button
                          onClick={onDownloadJar}
                          disabled={isCompilingJar}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 transition-all shadow-md cursor-pointer"
                        >
                          <Package className="w-3 h-3" />
                          <span>Pobierz .JAR</span>
                        </button>

                        <button
                          onClick={() => setActiveTab("simulator")}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>Otwórz w symulatorze</span>
                        </button>

                        <button
                          onClick={onDownloadZip}
                          className="px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          title="Pobierz pełne źródła Java z pom.xml"
                        >
                          <Layers className="w-2.5 h-2.5 text-slate-400" />
                          <span>Źródła (.ZIP)</span>
                        </button>

                        <button
                          onClick={onOpenCompileGuide}
                          className="px-2 py-1 rounded bg-amber-950/70 hover:bg-amber-900 border border-amber-500/40 text-amber-300 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <HelpCircle className="w-2.5 h-2.5" />
                          <span>Instrukcja</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Live Streaming State with Visual Generator Progress */}
            {isGenerating && (
              <div className="flex gap-3 text-xs leading-relaxed justify-start animate-in fade-in">
                <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Bot className="w-4 h-4 animate-pulse" />
                </div>
                <div className="w-full max-w-[90%] rounded-2xl rounded-tl-sm p-4 bg-slate-900 border border-emerald-500/50 text-slate-200 shadow-xl space-y-3">
                  {/* Status header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Generowanie kodu pluginu Minecraft...</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 animate-pulse">
                      LIVE STREAM
                    </span>
                  </div>

                  {/* Animated step list */}
                  <div className="space-y-1 text-[11px] font-medium text-slate-300 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Analiza komend i struktury projektu Java</span>
                    </div>
                    <div className="flex items-center gap-2 text-teal-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                      <span>Tworzenie klas Java (Plugin, CommandExecutor, Listener)</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      <span>Generowanie plugin.yml, config.yml & pom.xml</span>
                    </div>
                  </div>

                  {/* Live Stream Terminal Preview */}
                  {streamText && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                        <span className="font-semibold text-emerald-400">Podgląd generowanego kodu na żywo:</span>
                        <span>{streamText.length} znaków</span>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300/95 max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                        {streamText}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Floating Scroll-To-Bottom Button (shown when user scrolled up) */}
          {isUserScrolledUp && (
            <div className="absolute bottom-28 right-6 z-30 animate-in fade-in zoom-in-95">
              <button
                onClick={scrollToBottom}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xl border border-emerald-400/50 transition-all transform hover:scale-105 cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Przewiń na dół</span>
              </button>
            </div>
          )}

          {/* Quick Suggestions */}
          <div className="px-3 py-1.5 border-t border-slate-900 bg-slate-950/80 flex items-center gap-1.5 overflow-x-auto shrink-0">
            {QUICK_SUGGESTIONS.map((sug, i) => (
              <button
                key={i}
                onClick={() => {
                  onSendMessage(sug);
                  scrollToBottom();
                }}
                disabled={isGenerating}
                className="px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 text-[11px] whitespace-nowrap border border-slate-800/80 transition-colors disabled:opacity-40 cursor-pointer"
              >
                + {sug}
              </button>
            ))}
          </div>

          {/* Bottom Chat Input */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-slate-900/90 border-t border-slate-800/90 flex items-center gap-2 shrink-0"
          >
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Napisz co chcesz zmienić, dodać do pluginu lub naprawić..."
              disabled={isGenerating}
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isGenerating}
              className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all transform active:scale-95 shrink-0 cursor-pointer"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>

        {/* Right: Live Interactive View (Code, Simulator, Commands) (7 cols on lg) */}
        <div className="lg:col-span-7 h-full flex flex-col p-3 overflow-hidden bg-slate-950">
          {activeTab === "code" && (
            <CodeViewer
              files={currentProject.files}
              activeFilePath={activeFilePath}
              onSelectFile={onSelectFile}
              isStreaming={isGenerating}
              streamText={streamText}
              onAskAiAboutFile={onAskAiAboutFile}
              onDownloadJar={onDownloadJar}
            />
          )}

          {activeTab === "simulator" && (
            <div className="h-full flex flex-col gap-3 overflow-y-auto">
              <MinecraftChatSimulator
                project={currentProject}
                onExecuteCommand={(cmd) => {}}
              />
              <MinecraftColorPicker />
            </div>
          )}

          {activeTab === "commands" && (
            <div className="h-full flex flex-col gap-3 overflow-y-auto">
              <CommandsList
                commands={currentProject.commands}
                permissions={currentProject.permissions}
                onTestCommand={(cmd) => {
                  setActiveTab("simulator");
                }}
              />
              <MinecraftColorPicker />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
