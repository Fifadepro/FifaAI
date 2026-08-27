import React, { useState } from "react";
import {
  X,
  Download,
  Copy,
  Check,
  FileCode,
  FileText,
  FileImage,
  AlertCircle,
  File,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { MessageAttachment, formatFileSize } from "../utils/fileHelper";

interface AttachmentViewerModalProps {
  attachment: MessageAttachment | null;
  onClose: () => void;
}

export const AttachmentViewerModal: React.FC<AttachmentViewerModalProps> = ({
  attachment,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!attachment) return null;

  const handleCopyContent = () => {
    if (attachment.content) {
      navigator.clipboard.writeText(attachment.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    if (attachment.base64) {
      link.href = attachment.base64;
    } else if (attachment.content) {
      const blob = new Blob([attachment.content], { type: attachment.mimeType || "text/plain" });
      link.href = URL.createObjectURL(blob);
    }
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isImage = attachment.type === "image" || attachment.mimeType.startsWith("image/");
  const hasTextContent = !!attachment.content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 shrink-0">
              {isImage ? (
                <FileImage className="w-4 h-4" />
              ) : attachment.type === "log" ? (
                <AlertCircle className="w-4 h-4 text-amber-400" />
              ) : attachment.type === "code" ? (
                <FileCode className="w-4 h-4 text-cyan-400" />
              ) : (
                <FileText className="w-4 h-4 text-slate-300" />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="font-bold text-sm text-white truncate">{attachment.name}</h3>
              <p className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>{formatFileSize(attachment.size)}</span>
                <span>•</span>
                <span className="uppercase text-[10px] font-mono text-slate-400">{attachment.type}</span>
                {attachment.mimeType && (
                  <>
                    <span>•</span>
                    <span className="text-[10px] text-slate-500 font-mono">{attachment.mimeType}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {hasTextContent && (
              <button
                onClick={handleCopyContent}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Kopiuj zawartość"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? "Skopiowano" : "Kopiuj"}</span>
              </button>
            )}

            <button
              onClick={handleDownload}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Pobierz plik"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pobierz</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Zamknij"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Preview */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/60 min-h-[300px]">
          {isImage ? (
            <div className="relative flex flex-col items-center justify-center w-full h-full max-h-[70vh]">
              {/* Zoom Controls */}
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-lg p-1 z-10 backdrop-blur-sm shadow-md">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Pomniejsz"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono px-1.5 text-slate-400">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Powiększ"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Resetuj powiększenie"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-auto max-w-full max-h-full flex items-center justify-center p-2">
                <img
                  src={attachment.previewUrl || attachment.base64}
                  alt={attachment.name}
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center center" }}
                  className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-150 border border-slate-800"
                />
              </div>
            </div>
          ) : hasTextContent ? (
            <div className="w-full h-full max-h-[70vh] flex flex-col">
              <div className="flex items-center justify-between text-xs text-slate-400 pb-2 px-1 font-mono">
                <span>Podgląd tekstu / kodu:</span>
                <span>{attachment.content?.split("\n").length || 0} linii</span>
              </div>
              <pre className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-300/90 overflow-auto whitespace-pre-wrap leading-relaxed shadow-inner select-text">
                {attachment.content}
              </pre>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 text-slate-400">
              <File className="w-12 h-12 text-slate-600 animate-pulse" />
              <p className="text-sm font-medium text-slate-300">Plik binarny ({attachment.name})</p>
              <p className="text-xs text-slate-500 max-w-xs">
                Ten format pliku nie posiada podglądu tekstowego. Został załączony i przekazany do analizy botowi.
              </p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Pobierz plik na dysk</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
