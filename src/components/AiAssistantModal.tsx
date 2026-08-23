import React, { useState } from "react";
import { X, Sparkles, Send, Loader2, Bot, Check, Copy } from "lucide-react";
import { ProjectFile } from "../types";

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: ProjectFile | null;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  file,
}) => {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !file) return null;

  const handleAsk = async (e?: React.FormEvent, customQ?: string) => {
    if (e) e.preventDefault();
    const query = customQ || question;
    if (!query.trim() || isLoading) return;

    setIsLoading(true);
    setAnswer("");

    try {
      const res = await fetch("/api/explain-fix-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: file.content,
          fileType: file.type,
          question: query,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAnswer(data.answer);
      } else {
        setAnswer("Błąd: " + (data.error || "Nie udało się uzyskać odpowiedzi"));
      }
    } catch (err: any) {
      setAnswer("Wystąpił problem z połączeniem: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const presetQuestions = [
    "Wyjaśnij co krok po kroku robi ten plik",
    "Sprawdź czy są potencjalne błędy i luki wydajnościowe",
    "Jak mogę dodać dźwięk i cząsteczki do tego kodu?",
    "Jak skompilować ten plugin do pliku .jar?",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-emerald-500/40 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-500/30 text-emerald-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white flex items-center gap-1.5">
                <span>Asystent AI Pluginu:</span>
                <span className="font-mono text-emerald-400 text-xs">{file.fileName}</span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {/* Quick preset questions */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              Szybkie pytania:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presetQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuestion(q);
                    handleAsk(undefined, q);
                  }}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 border border-slate-700 transition-colors text-left disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* AI Response */}
          {isLoading && (
            <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center gap-2 text-xs text-slate-400 animate-pulse">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span>Analizowanie kodu i przygotowywanie odpowiedzi...</span>
            </div>
          )}

          {answer && !isLoading && (
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2 relative">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Odpowiedź Eksperta Minecraft:
                </span>
                <button
                  onClick={handleCopy}
                  className="p-1 rounded text-slate-400 hover:text-white transition-colors text-xs flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Skopiowano" : "Kopiuj"}</span>
                </button>
              </div>
              <div className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-sans">
                {answer}
              </div>
            </div>
          )}
        </div>

        {/* Question Form */}
        <form onSubmit={handleAsk} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Zadaj dowolne pytanie o kod lub jak dodać nową funkcję..."
            disabled={isLoading}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Zapytaj</span>
          </button>
        </form>
      </div>
    </div>
  );
};
