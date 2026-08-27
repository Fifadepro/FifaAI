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
  ArrowUp,
  FileCode,
  Package,
  Layers,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  PanelRightClose,
  PanelRightOpen,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronsLeft,
  ChevronsRight,
  History,
  Paperclip,
  Image as ImageIcon,
  FileText,
  FileImage,
  AlertCircle,
  X,
  UploadCloud,
  Eye,
  MessageSquare,
} from "lucide-react";
import {
  ConversationMessage,
  PluginProject,
  ProjectFile,
  GenerationSettings,
  MessageAttachment,
} from "../types";
import { CodeViewer } from "./CodeViewer";
import { MinecraftChatSimulator } from "./MinecraftChatSimulator";
import { CommandsList } from "./CommandsList";
import { MinecraftColorPicker } from "./MinecraftColorPicker";
import { processUploadedFile, formatFileSize } from "../utils/fileHelper";
import { AttachmentViewerModal } from "./AttachmentViewerModal";

interface ConversationWorkspaceProps {
  messages: ConversationMessage[];
  currentProject: PluginProject;
  activeFilePath: string;
  onSelectFile: (path: string) => void;
  isGenerating: boolean;
  isCompilingJar?: boolean;
  streamText?: string;
  onSendMessage: (prompt: string, attachments?: MessageAttachment[]) => void;
  onDownloadJar: () => void;
  onDownloadZip: () => void;
  onOpenCompileGuide: () => void;
  onCopyCode: () => void;
  copied: boolean;
  onOpenSettings: () => void;
  onNewPlugin: () => void;
  onOpenHistory?: () => void;
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
  onOpenHistory,
  onAskAiAboutFile,
  settings,
}) => {
  const [inputText, setInputText] = useState("");
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [previewAttachment, setPreviewAttachment] = useState<MessageAttachment | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isReadingFiles, setIsReadingFiles] = useState(false);

  const [activeTab, setActiveTab] = useState<"code" | "simulator" | "commands">("code");
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check scroll position to determine if user manually scrolled up
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setIsUserScrolledUp(distanceFromBottom > 70);
  }, []);

  // Only auto-scroll down if user hasn't scrolled up!
  useEffect(() => {
    if (!isUserScrolledUp && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isGenerating, isUserScrolledUp]);

  const scrollToBottom = () => {
    setIsUserScrolledUp(false);
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToTop = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsReadingFiles(true);
    const newAtts: MessageAttachment[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const processed = await processUploadedFile(file);
        newAtts.push(processed);
      }
      setAttachments((prev) => [...prev, ...newAtts]);
    } catch (err) {
      console.error("Failed to process uploaded file:", err);
    } finally {
      setIsReadingFiles(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files);
      e.target.value = "";
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const filesToUpload: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          filesToUpload.push(file);
        }
      }
    }

    if (filesToUpload.length > 0) {
      e.preventDefault();
      handleFileUpload(filesToUpload);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && attachments.length === 0) || isGenerating || isReadingFiles) return;

    const messagePrompt = inputText.trim() || (attachments.length > 0 ? "Oto załączone pliki/zdjęcia do analizy:" : "");
    onSendMessage(messagePrompt, attachments);
    setInputText("");
    setAttachments([]);
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
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 flex flex-col h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] overflow-hidden bg-slate-950 relative min-h-0"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-emerald-950/80 backdrop-blur-sm border-2 border-dashed border-emerald-400 flex flex-col items-center justify-center gap-3 text-white pointer-events-none animate-in fade-in">
          <div className="p-4 rounded-full bg-emerald-900/90 border border-emerald-400 shadow-2xl animate-bounce">
            <UploadCloud className="w-10 h-10 text-emerald-300" />
          </div>
          <p className="text-lg font-bold text-emerald-200">Upuść zdjęcia lub pliki tutaj</p>
          <p className="text-xs text-slate-300">
            Obsługiwane: zrzuty ekranu (.png, .jpg), kody (.java), logi błędów (.log), konfiguracje (.yml, .json)
          </p>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="h-14 border-b border-slate-800/90 bg-slate-900/90 px-4 flex items-center justify-between gap-3 shrink-0 backdrop-blur-md z-20">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onNewPlugin}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            title="Rozpocznij nowy plugin od zera"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nowy plugin</span>
          </button>

          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 text-xs font-medium transition-colors cursor-pointer"
              title="Otwórz historię rozmów i projektów"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Historia</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white flex items-center gap-1.5 truncate max-w-[140px] sm:max-w-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="truncate">{currentProject.pluginName}</span>
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-mono hidden md:inline">
              {currentProject.platform} {currentProject.minecraftVersion}
            </span>
          </div>
        </div>

        {/* View mode switcher */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => {
              setActiveTab("code");
              setIsRightPanelCollapsed(false);
            }}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "code" && !isRightPanelCollapsed
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Kod projektu</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("simulator");
              setIsRightPanelCollapsed(false);
            }}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "simulator" && !isRightPanelCollapsed
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Symulator pluginu</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("commands");
              setIsRightPanelCollapsed(false);
            }}
            className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "commands" && !isRightPanelCollapsed
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Komendy</span>
            <span>({currentProject.commands.length})</span>
          </button>
        </div>

        {/* Action buttons with primary Pobierz .JAR and panel collapse toggle */}
        <div className="flex items-center gap-2 relative">
          {/* Toggle Left Chat Panel (Collapse / Expand Chat) */}
          <button
            onClick={() => {
              const nextState = !isChatCollapsed;
              setIsChatCollapsed(nextState);
              if (nextState) setIsRightPanelCollapsed(false);
            }}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              isChatCollapsed
                ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900 shadow-md"
                : "bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700"
            }`}
            title={isChatCollapsed ? "Rozwiń czat z asystentem" : "Zwiń czat z botem (pełny widok kodu)"}
          >
            {isChatCollapsed ? (
              <>
                <PanelLeftOpen className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline font-semibold">Rozwiń czat</span>
              </>
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Zwiń czat</span>
              </>
            )}
          </button>

          {/* Toggle Right Panel (Collapse / Expand Code) */}
          <button
            onClick={() => {
              const nextState = !isRightPanelCollapsed;
              setIsRightPanelCollapsed(nextState);
              if (nextState) setIsChatCollapsed(false);
            }}
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              isRightPanelCollapsed
                ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900 shadow-md"
                : "bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700"
            }`}
            title={isRightPanelCollapsed ? "Rozwiń panel z kodem i symulatorem" : "Zwiń panel z kodem"}
          >
            {isRightPanelCollapsed ? (
              <>
                <PanelRightOpen className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline font-semibold">Rozwiń kod</span>
              </>
            ) : (
              <>
                <PanelRightClose className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Zwiń kod</span>
              </>
            )}
          </button>

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
                  className="w-full px-3 py-2 text-left text-xs font-medium text-emerald-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
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
                  className="w-full px-3 py-2 text-left text-xs font-medium text-slate-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
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
                  className="w-full px-3 py-2 text-left text-xs font-medium text-amber-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
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

      {/* Main 2-Panel Area: Equal Height & Lock Boundaries */}
      <div className="flex-1 flex overflow-hidden relative min-h-0 h-full">
        {/* Left: Chat Conversation (Expandable / Collapsible) */}
        {!isChatCollapsed ? (
          <div
            className={`flex flex-col h-full min-h-0 border-r border-slate-800/80 bg-slate-950/60 relative transition-all duration-200 ${
              isRightPanelCollapsed ? "w-full flex-1" : "w-full lg:w-5/12 shrink-0"
            }`}
          >
            {/* Top Sub-Bar for Chat with Quick Collapse & Navigation */}
            <div className="h-9 px-3 bg-slate-900/70 border-b border-slate-800/80 flex items-center justify-between shrink-0 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-slate-300 text-[11px]">Asystent AI</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  ({messages.length} {messages.length === 1 ? "wiadomość" : "wiadomości"})
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Scroll to top (Older messages) */}
                {messages.length > 2 && (
                  <button
                    onClick={scrollToTop}
                    className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-emerald-300 text-[10px] flex items-center gap-1 transition-colors cursor-pointer font-medium"
                    title="Przewiń do najstarszych wiadomości na górze"
                  >
                    <ArrowUp className="w-3 h-3 text-emerald-400" />
                    <span>Starsze</span>
                  </button>
                )}

                {/* Scroll to bottom */}
                {isUserScrolledUp && (
                  <button
                    onClick={scrollToBottom}
                    className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900 text-[10px] flex items-center gap-1 transition-colors cursor-pointer font-medium"
                    title="Przewiń na sam dół do najnowszych wiadomości"
                  >
                    <ArrowDown className="w-3 h-3 text-emerald-400" />
                    <span>Najnowsze</span>
                  </button>
                )}

                {/* Collapse Chat button */}
                <button
                  onClick={() => setIsChatCollapsed(true)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                  title="Zwiń czat (pełny widok kodu)"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Messages Stream Container with Scroll Detection (Locked to exact same height as code preview) */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 space-y-4 relative min-h-0 custom-scrollbar"
            >
              {/* Top Hint if there are many messages */}
              {messages.length > 3 && (
                <div className="text-center py-1">
                  <span className="text-[10px] text-slate-500 bg-slate-900/90 border border-slate-800/80 px-2.5 py-1 rounded-full font-mono">
                    ⬆️ Początek rozmowy • Przewijaj kółkiem myszy lub gładzikiem
                  </span>
                </div>
              )}

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
                        ? "bg-emerald-600 text-white rounded-tr-sm font-medium whitespace-pre-wrap space-y-2.5"
                        : "bg-slate-900 border border-slate-800/90 text-slate-200 rounded-tl-sm space-y-2.5"
                    }`}
                  >
                    {/* Message Content */}
                    {msg.role === "user" ? (
                      <div>{msg.content}</div>
                    ) : (
                      <div className="space-y-2">
                        <div className="prose prose-invert prose-emerald text-xs leading-relaxed max-w-none break-words">
                          <Markdown>{msg.content}</Markdown>
                        </div>
                        {msg.projectSnapshot && msg.projectSnapshot.commands && msg.projectSnapshot.commands.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] text-slate-400 font-medium">Komendy:</span>
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
                      </div>
                    )}

                    {/* Render Message Attachments (Photos / Code / Logs / Configs) */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="pt-2 border-t border-emerald-500/30 flex flex-wrap gap-2">
                        {msg.attachments.map((att) => {
                          const isImg = att.type === "image" || att.mimeType.startsWith("image/");
                          return (
                            <div
                              key={att.id}
                              onClick={() => setPreviewAttachment(att)}
                              className="group relative flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 cursor-pointer transition-all shadow-sm"
                              title="Kliknij, aby wyświetlić podgląd"
                            >
                              {isImg ? (
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 border border-white/10 shrink-0 relative">
                                  <img
                                    src={att.previewUrl || att.base64}
                                    alt={att.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Eye className="w-3.5 h-3.5 text-white" />
                                  </div>
                                </div>
                              ) : (
                                <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 shrink-0">
                                  {att.type === "log" ? (
                                    <AlertCircle className="w-4 h-4 text-amber-300" />
                                  ) : att.type === "code" ? (
                                    <FileCode className="w-4 h-4 text-cyan-300" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-slate-200" />
                                  )}
                                </div>
                              )}

                              <div className="min-w-0 max-w-[130px] sm:max-w-[160px]">
                                <p className="text-[11px] font-semibold truncate text-white leading-tight">{att.name}</p>
                                <p className="text-[10px] text-emerald-100/75 flex items-center gap-1 font-mono">
                                  <span>{formatFileSize(att.size)}</span>
                                  <span>•</span>
                                  <span className="uppercase text-[9px]">{att.type}</span>
                                </p>
                              </div>
                            </div>
                          );
                        })}
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
                        <span>Analiza komend, załączników i struktury projektu Java</span>
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
                        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300/95 max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner custom-scrollbar">
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

            {/* Pending Attachments Draft Tray */}
            {attachments.length > 0 && (
              <div className="px-3 py-2 bg-slate-900 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto shrink-0">
                <span className="text-[11px] font-semibold text-emerald-400 shrink-0 flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5" />
                  Załączone pliki ({attachments.length}):
                </span>

                <div className="flex items-center gap-1.5">
                  {attachments.map((att) => {
                    const isImg = att.type === "image" || att.mimeType.startsWith("image/");
                    return (
                      <div
                        key={att.id}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700/80 text-slate-200 text-xs shadow-sm shrink-0"
                      >
                        {isImg ? (
                          <div className="w-5 h-5 rounded overflow-hidden bg-slate-800 shrink-0">
                            <img
                              src={att.previewUrl || att.base64}
                              alt={att.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                        <span className="truncate max-w-[100px] text-[11px]">{att.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({formatFileSize(att.size)})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="p-0.5 rounded hover:bg-rose-950/80 hover:text-rose-300 text-slate-400 transition-colors cursor-pointer"
                          title="Usuń plik"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setAttachments([])}
                  className="text-[10px] text-slate-500 hover:text-rose-400 ml-auto shrink-0 cursor-pointer"
                >
                  Wyczyść wszystko
                </button>
              </div>
            )}

            {/* Bottom Chat Input Form */}
            <form
              onSubmit={handleSubmit}
              className="p-3 bg-slate-900/90 border-t border-slate-800/90 flex flex-col gap-2 shrink-0"
            >
              {/* Hidden Multi-file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.java,.yml,.yaml,.json,.xml,.txt,.log,.md,.zip,.jar,.toml,.properties"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="flex items-center gap-2">
                {/* Attachment Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating || isReadingFiles}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700/80 transition-colors shrink-0 cursor-pointer disabled:opacity-40"
                  title="Załącz plik lub zdjęcie (zrzut ekranu, log błędu, kod .java, config)"
                >
                  {isReadingFiles ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <Paperclip className="w-4 h-4" />
                  )}
                </button>

                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  rows={1}
                  placeholder="Napisz do bota, wklej zrzut ekranu (Ctrl+V) lub upuść pliki..."
                  disabled={isGenerating}
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-emerald-500/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
                />

                <button
                  type="submit"
                  disabled={(!inputText.trim() && attachments.length === 0) || isGenerating || isReadingFiles}
                  className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all transform active:scale-95 shrink-0 cursor-pointer shadow-md shadow-emerald-900/30"
                  title="Wyślij wiadomość i załączniki do bota"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 font-mono">
                <span>💡 Kółkiem myszy zobaczysz starsze wiadomości</span>
                <span>Enter = wyślij</span>
              </div>
            </form>
          </div>
        ) : (
          /* Collapsed Left Chat Strip with quick expand triggers */
          <div className="hidden lg:flex flex-col items-center justify-between py-3 px-1.5 bg-slate-900 border-r border-slate-800/90 transition-all shrink-0 select-none w-14">
            <button
              onClick={() => setIsChatCollapsed(false)}
              className="p-2.5 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-400 hover:text-emerald-300 transition-colors shadow-lg cursor-pointer group"
              title="Rozwiń czat z asystentem AI"
            >
              <Bot className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>

            <button
              onClick={() => setIsChatCollapsed(false)}
              className="my-auto py-6 px-1 flex flex-col items-center gap-2 hover:bg-slate-800/60 rounded-lg cursor-pointer transition-colors text-slate-400 hover:text-emerald-400 group"
              title="Kliknij, aby rozwinąć czat"
            >
              <MessageSquare className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span
                className="text-[10px] font-mono font-bold tracking-widest uppercase text-slate-400 group-hover:text-emerald-300"
                style={{ writingMode: "vertical-rl" }}
              >
                Rozwiń Czat ({messages.length})
              </span>
            </button>

            <button
              onClick={() => setIsChatCollapsed(false)}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
              title="Rozwiń panel czatu"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Right: Live Interactive View (Code, Simulator, Commands) */}
        {!isRightPanelCollapsed ? (
          <div className="hidden lg:flex flex-1 h-full min-h-0 flex-col p-3 overflow-hidden bg-slate-950 transition-all duration-200">
            {activeTab === "code" && (
              <CodeViewer
                files={currentProject.files}
                activeFilePath={activeFilePath}
                onSelectFile={onSelectFile}
                isStreaming={isGenerating}
                streamText={streamText}
                onAskAiAboutFile={onAskAiAboutFile}
                onDownloadJar={onDownloadJar}
                onToggleCollapse={() => setIsRightPanelCollapsed(true)}
                isCollapsed={isRightPanelCollapsed}
              />
            )}

            {activeTab === "simulator" && (
              <div className="h-full flex flex-col gap-3 overflow-y-auto min-h-0 custom-scrollbar">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-slate-300">Symulator pluginu & interaktywne GUI</span>
                  <button
                    onClick={() => setIsRightPanelCollapsed(true)}
                    className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Zwiń panel"
                  >
                    <PanelRightClose className="w-3.5 h-3.5" />
                    <span>Zwiń</span>
                  </button>
                </div>
                <MinecraftChatSimulator
                  project={currentProject}
                  onExecuteCommand={(cmd) => {}}
                />
                <MinecraftColorPicker />
              </div>
            )}

            {activeTab === "commands" && (
              <div className="h-full flex flex-col gap-3 overflow-y-auto min-h-0 custom-scrollbar">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-slate-300">Komendy i uprawnienia pluginu</span>
                  <button
                    onClick={() => setIsRightPanelCollapsed(true)}
                    className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Zwiń panel"
                  >
                    <PanelRightClose className="w-3.5 h-3.5" />
                    <span>Zwiń</span>
                  </button>
                </div>
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
        ) : (
          /* Collapsed Right Side Strip with quick expand triggers */
          <div className="hidden lg:flex flex-col items-center justify-between py-3 px-1.5 bg-slate-900 border-l border-slate-800/90 transition-all shrink-0 select-none w-14">
            <button
              onClick={() => setIsRightPanelCollapsed(false)}
              className="p-2 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-400 hover:text-emerald-300 transition-colors shadow-lg cursor-pointer group"
              title="Rozwiń panel kodu i podglądu"
            >
              <PanelRightOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>

            <button
              onClick={() => setIsRightPanelCollapsed(false)}
              className="my-auto py-6 px-1 flex flex-col items-center gap-2 hover:bg-slate-800/60 rounded-lg cursor-pointer transition-colors text-slate-400 hover:text-emerald-400 group"
              title="Kliknij, aby rozwinąć kod"
            >
              <Code2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span
                className="text-[10px] font-mono font-bold tracking-widest uppercase text-slate-400 group-hover:text-emerald-300"
                style={{ writingMode: "vertical-rl" }}
              >
                Rozwiń kod ({currentProject.files.length} plików)
              </span>
            </button>

            <button
              onClick={() => setIsRightPanelCollapsed(false)}
              className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
              title="Rozwiń panel"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Attachment Fullscreen / Content Preview Lightbox Modal */}
      <AttachmentViewerModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </div>
  );
};
