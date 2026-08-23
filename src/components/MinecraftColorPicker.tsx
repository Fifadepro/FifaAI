import React, { useState } from "react";
import { Palette, Copy, Check, Info } from "lucide-react";

export const MinecraftColorPicker: React.FC = () => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const colors = [
    { code: "&0", hex: "#000000", name: "Black", text: "#FFFFFF" },
    { code: "&1", hex: "#0000AA", name: "Dark Blue", text: "#FFFFFF" },
    { code: "&2", hex: "#00AA00", name: "Dark Green", text: "#FFFFFF" },
    { code: "&3", hex: "#00AAAA", name: "Dark Aqua", text: "#FFFFFF" },
    { code: "&4", hex: "#AA0000", name: "Dark Red", text: "#FFFFFF" },
    { code: "&5", hex: "#AA00AA", name: "Dark Purple", text: "#FFFFFF" },
    { code: "&6", hex: "#FFAA00", name: "Gold", text: "#000000" },
    { code: "&7", hex: "#AAAAAA", name: "Gray", text: "#000000" },
    { code: "&8", hex: "#555555", name: "Dark Gray", text: "#FFFFFF" },
    { code: "&9", hex: "#5555FF", name: "Blue", text: "#FFFFFF" },
    { code: "&a", hex: "#55FF55", name: "Green", text: "#000000" },
    { code: "&b", hex: "#55FFFF", name: "Aqua", text: "#000000" },
    { code: "&c", hex: "#FF5555", name: "Red", text: "#000000" },
    { code: "&d", hex: "#FF55FF", name: "Light Purple", text: "#000000" },
    { code: "&e", hex: "#FFFF55", name: "Yellow", text: "#000000" },
    { code: "&f", hex: "#FFFFFF", name: "White", text: "#000000" },
  ];

  const formats = [
    { code: "&l", label: "Pogrubienie (Bold)", style: "font-bold" },
    { code: "&o", label: "Kursywa (Italic)", style: "italic" },
    { code: "&n", label: "Podkreślenie (Underline)", style: "underline" },
    { code: "&m", label: "Przekreślenie (Strikethrough)", style: "line-through" },
    { code: "&r", label: "Reset formatowania", style: "font-normal" },
  ];

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg text-slate-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Kody Kolorów Minecraft (& / §)
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">Kliknij kod aby skopiować</span>
      </div>

      {/* Colors Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 mb-3">
        {colors.map((c) => (
          <button
            key={c.code}
            onClick={() => handleCopy(c.code)}
            className="p-1.5 rounded-lg border border-slate-700/80 hover:scale-105 active:scale-95 transition-all text-center group flex flex-col items-center justify-center relative overflow-hidden"
            style={{ backgroundColor: c.hex }}
            title={`${c.name} (${c.code})`}
          >
            <span
              className="font-mono text-xs font-bold leading-tight"
              style={{ color: c.text, textShadow: "0 0 2px rgba(0,0,0,0.5)" }}
            >
              {copiedCode === c.code ? <Check className="w-3.5 h-3.5 inline" /> : c.code}
            </span>
          </button>
        ))}
      </div>

      {/* Formats row */}
      <div className="flex flex-wrap gap-1.5 text-xs">
        {formats.map((f) => (
          <button
            key={f.code}
            onClick={() => handleCopy(f.code)}
            className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px] flex items-center gap-1.5 transition-colors"
          >
            <span className="text-emerald-400 font-bold">{f.code}</span>
            <span className={`text-slate-400 ${f.style}`}>{f.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
