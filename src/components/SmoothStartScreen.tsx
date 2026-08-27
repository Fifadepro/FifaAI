import React, { useState, useRef } from "react";
import {
  Sparkles,
  ArrowRight,
  Zap,
  Compass,
  Shield,
  Gift,
  Terminal,
  Trash2,
  History,
  Package,
  Calendar,
  MessageSquare,
  Paperclip,
  X,
  UploadCloud,
  FileCode,
  AlertCircle,
  FileText,
  Loader2,
} from "lucide-react";
import { motion } from "motion/react";
import { ConversationSession, MessageAttachment } from "../types";
import { processUploadedFile, formatFileSize } from "../utils/fileHelper";

interface SmoothStartScreenProps {
  onStart: (prompt: string, attachments?: MessageAttachment[]) => void;
  isGenerating?: boolean;
  recentSessions?: ConversationSession[];
  onSelectSession?: (session: ConversationSession) => void;
  onOpenHistory?: () => void;
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
  recentSessions = [],
  onSelectSession,
  onOpenHistory,
}) => {
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const filesToProcess: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) filesToProcess.push(file);
      }
    }
    if (filesToProcess.length > 0) {
      e.preventDefault();
      await handleFileUpload(filesToProcess);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!prompt.trim() && attachments.length === 0) || isGenerating || isReadingFiles) return;
    const p = prompt.trim() || "Stwórz plugin na podstawie załączonych materiałów/zdjęć:";
    onStart(p, attachments);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = Math.max(0, now - timestamp);
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return "przed chwilą";
    if (mins < 60) return `${mins} min temu`;
    if (hours < 24) return `${hours}h temu`;
    return `${days}d temu`;
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-140px)] px-4 py-8 max-w-4xl mx-auto w-full relative"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-emerald-950/80 backdrop-blur-sm border-2 border-dashed border-emerald-400 rounded-3xl flex flex-col items-center justify-center gap-3 text-white pointer-events-none animate-in fade-in">
          <div className="p-4 rounded-full bg-emerald-900/90 border border-emerald-400 shadow-2xl animate-bounce">
            <UploadCloud className="w-10 h-10 text-emerald-300" />
          </div>
          <p className="text-lg font-bold text-emerald-200">Upuść pliki lub zdjęcia tutaj</p>
          <p className="text-xs text-slate-300">
            Obsługujemy zrzuty ekranu (.png, .jpg), kody (.java), logi (.log), konfiguracje (.yml, .json)
          </p>
        </div>
      )}

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
            Opisz dowolne komendy, przedmioty, eventy czy mechaniki. Możesz też załączyć pliki, logi błędów lub zdjęcia!
          </p>
        </div>

        {/* Smooth Large Input Card */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl relative mt-2 group"
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

          <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 focus-within:border-emerald-500/80 shadow-2xl transition-all duration-200 overflow-hidden">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              rows={3}
              placeholder="Np. Chcę plugin na różdżkę zamrażania graczy na 3 sekundy po trafieniu śnieżką z komendą /freezerod... (możesz też wkleić screen lub załączyć plik)"
              className="w-full bg-transparent px-4 py-4 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
              autoFocus
            />

            {/* Pending Attachments Draft Tray */}
            {attachments.length > 0 && (
              <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
                <span className="text-[11px] font-semibold text-emerald-400 shrink-0 flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5" />
                  Załączniki ({attachments.length}):
                </span>

                <div className="flex items-center gap-1.5">
                  {attachments.map((att) => {
                    const isImg = att.type === "image" || att.mimeType.startsWith("image/");
                    return (
                      <div
                        key={att.id}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-200 text-xs shadow-sm shrink-0"
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
                        <span className="truncate max-w-[110px] text-[11px]">{att.name}</span>
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
                  Wyczyść
                </button>
              </div>
            )}

            <div className="flex items-center justify-between px-4 py-3 bg-slate-950/60 border-t border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating || isReadingFiles}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700/80 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-sans disabled:opacity-40"
                  title="Załącz plik lub zdjęcie"
                >
                  {isReadingFiles ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  ) : (
                    <Paperclip className="w-3.5 h-3.5" />
                  )}
                  <span>Załącz plik / zdjęcie</span>
                </button>

                <span className="hidden sm:inline text-slate-600">|</span>
                <span className="hidden sm:inline text-[11px]">Enter = wygeneruj</span>
              </div>

              <button
                type="submit"
                disabled={(!prompt.trim() && attachments.length === 0) || isGenerating || isReadingFiles}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all transform active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Wygeneruj plugin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>

        {/* Recent Conversations / Projects if available */}
        {recentSessions.length > 0 && onSelectSession && (
          <div className="w-full max-w-2xl pt-1 space-y-2 text-left">
            <div className="flex items-center justify-between px-1">
              <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ostatnie rozmowy i projekty:</span>
              </div>
              {onOpenHistory && (
                <button
                  type="button"
                  onClick={onOpenHistory}
                  className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium cursor-pointer"
                >
                  Zobacz całą historię ({recentSessions.length}) →
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recentSessions.slice(0, 4).map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => onSelectSession(session)}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all text-left group flex items-start justify-between gap-2 shadow-sm cursor-pointer"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 transition-colors truncate">
                      {session.title || session.project.pluginName}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="text-emerald-400 font-mono font-medium">
                        {session.project.pluginName}
                      </span>
                      <span>•</span>
                      <span>{session.messages.length} wiadomości</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {formatTimeAgo(session.updatedAt)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Minimalist Starter Ideas */}
        <div className="w-full max-w-2xl pt-1 space-y-2.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-left pl-1">
            Przykładowe pomysły:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {STARTER_IDEAS.map((idea, idx) => (
              <button
                key={idea.label}
                type="button"
                onClick={() => onStart(idea.prompt)}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-900 transition-all text-left group flex items-start gap-3 cursor-pointer"
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

