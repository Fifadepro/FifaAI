import React, { useState } from "react";
import {
  History,
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  Search,
  MessageSquare,
  Package,
  Calendar,
  Layers,
  ArrowRight,
  Download,
  Upload,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { ConversationSession } from "../types";
import {
  exportSessionsToJson,
  importSessionsFromJson,
} from "../utils/historyStorage";

interface ConversationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ConversationSession[];
  currentSessionId: string | null;
  onSelectSession: (session: ConversationSession) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onClearAll: () => void;
  onReloadSessions: () => void;
}

export const ConversationHistoryModal: React.FC<ConversationHistoryModalProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  onClearAll,
  onReloadSessions,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredSessions = sessions.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    if (s.title.toLowerCase().includes(q)) return true;
    if (s.project.pluginName.toLowerCase().includes(q)) return true;
    if (s.project.summary?.toLowerCase().includes(q)) return true;
    return s.messages.some((m) => m.content.toLowerCase().includes(q));
  });

  const handleStartRename = (session: ConversationSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteSession(id);
    setConfirmDeleteId(null);
  };

  const handleExport = () => {
    const jsonStr = exportSessionsToJson();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fifaai-historia-rozmow-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importSessionsFromJson(content);
      if (res.success) {
        onReloadSessions();
      } else {
        setImportError(res.error || "Błąd podczas importowania pliku.");
      }
    };
    reader.readAsText(file);
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = Math.max(0, now - timestamp);
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return "Przed chwilą";
    if (mins < 60) return `${mins} min temu`;
    if (hours < 24) return `${hours} godz. temu`;
    if (days === 1) return "Wczoraj";
    if (days < 7) return `${days} dni temu`;
    return new Date(timestamp).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Historia rozmów i pluginów</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-medium">
                  {sessions.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Wszystkie Twoje wygenerowane pluginy i czaty są automatycznie zapisywane
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onNewSession();
                onClose();
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nowa rozmowa</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/40 flex items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj po nazwie pluginu, komendach lub treści wiadomości..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {importError && (
          <div className="mx-6 mt-3 px-3 py-2 bg-rose-950/70 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{importError}</span>
          </div>
        )}

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="text-sm font-medium text-slate-300">
                {searchQuery ? "Brak wyników dla podanej frazy" : "Brak zapisanych rozmów"}
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? "Spróbuj wpisać inną nazwę pluginu lub komendy."
                  : "Rozpocznij tworzenie nowego pluginu na czacie, a historia pojawi się tutaj automatycznie."}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => {
                    onNewSession();
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-emerald-950"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Rozpocznij pierwszy plugin</span>
                </button>
              )}
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isCurrent = session.id === currentSessionId;
              const isEditing = editingId === session.id;
              const isDeleting = confirmDeleteId === session.id;
              const firstPrompt = session.messages.find((m) => m.role === "user")?.content || "";

              return (
                <div
                  key={session.id}
                  onClick={() => {
                    if (!isEditing && !isDeleting) {
                      onSelectSession(session);
                      onClose();
                    }
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${
                    isCurrent
                      ? "bg-emerald-950/20 border-emerald-500/50 shadow-md shadow-emerald-950/50 ring-1 ring-emerald-500/30"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left details */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isEditing ? (
                          <form
                            onSubmit={(e) => handleSaveRename(session.id, e)}
                            className="flex items-center gap-1.5 flex-1 max-w-md"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              autoFocus
                              className="bg-slate-900 border border-emerald-500 rounded px-2 py-0.5 text-xs text-white focus:outline-none flex-1"
                            />
                            <button
                              type="button"
                              onClick={(e) => handleSaveRename(session.id, e)}
                              className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(null);
                              }}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        ) : (
                          <>
                            <span className="font-bold text-sm text-white truncate hover:text-emerald-300 transition-colors">
                              {session.title || session.project.pluginName}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                Aktywny teraz
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Snippet / prompt */}
                      {firstPrompt && (
                        <p className="text-xs text-slate-400 line-clamp-1 italic">
                          "{firstPrompt}"
                        </p>
                      )}

                      {/* Badges / Metadata */}
                      <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-slate-800/80 text-emerald-400 font-mono border border-slate-700/60 font-semibold flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          {session.project.pluginName}
                        </span>

                        <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60 font-medium">
                          {session.project.platform} {session.project.minecraftVersion}
                        </span>

                        <span className="px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-400 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-500" />
                          {session.project.files.length} plików
                        </span>

                        <span className="px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-400 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-slate-500" />
                          {session.messages.length} wiadomości
                        </span>

                        <span className="text-slate-500 ml-auto flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatTimeAgo(session.updatedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Right actions */}
                    <div
                      className="flex items-center gap-1 shrink-0 ml-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!isEditing && (
                        <button
                          onClick={(e) => handleStartRename(session, e)}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
                          title="Zmień nazwę"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {isDeleting ? (
                        <div className="flex items-center gap-1 bg-rose-950/90 border border-rose-500/50 rounded-lg p-1">
                          <span className="text-[10px] text-rose-300 font-bold px-1">Usunąć?</span>
                          <button
                            onClick={(e) => handleDelete(session.id, e)}
                            className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded cursor-pointer"
                          >
                            Tak
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                            className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded cursor-pointer"
                          >
                            Nie
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(session.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-950/60 hover:text-rose-400 text-slate-500 transition-colors opacity-80 group-hover:opacity-100 cursor-pointer"
                          title="Usuń tę rozmowę"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          onSelectSession(session);
                          onClose();
                        }}
                        className="ml-1 p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white transition-all cursor-pointer"
                        title="Otwórz plugin"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400 shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={sessions.length === 0}
              className="hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title="Pobierz kopię zapasową historii w pliku JSON"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Eksportuj (JSON)</span>
            </button>

            <label className="hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Importuj</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex items-center gap-2">
            {confirmClearAll ? (
              <div className="flex items-center gap-1.5 bg-rose-950/80 border border-rose-500/40 rounded-lg px-2 py-1">
                <span className="text-[11px] text-rose-300 font-medium">Usunąć całą historię?</span>
                <button
                  onClick={() => {
                    onClearAll();
                    setConfirmClearAll(false);
                  }}
                  className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold cursor-pointer"
                >
                  Tak, wyczyść
                </button>
                <button
                  onClick={() => setConfirmClearAll(false)}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] cursor-pointer"
                >
                  Anuluj
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClearAll(true)}
                disabled={sessions.length === 0}
                className="text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-[11px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Wyczyść historię</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
