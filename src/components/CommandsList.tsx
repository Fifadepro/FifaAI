import React, { useState } from "react";
import { Terminal, Shield, Key, Copy, Check, ChevronRight, Play } from "lucide-react";
import { CommandInfo, PermissionInfo } from "../types";

interface CommandsListProps {
  commands: CommandInfo[];
  permissions: PermissionInfo[];
  onTestCommand?: (command: string) => void;
}

export const CommandsList: React.FC<CommandsListProps> = ({
  commands,
  permissions,
  onTestCommand,
}) => {
  const [activeTab, setActiveTab] = useState<"commands" | "permissions">("commands");
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
      {/* Tabs */}
      <div className="flex items-center border-b border-slate-800 bg-slate-950 px-2">
        <button
          onClick={() => setActiveTab("commands")}
          className={`px-3 py-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === "commands"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Komendy ({commands.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("permissions")}
          className={`px-3 py-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
            activeTab === "permissions"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Uprawnienia ({permissions.length})</span>
        </button>
      </div>

      {/* Content */}
      <div className="p-3 max-h-[340px] overflow-y-auto space-y-2">
        {activeTab === "commands" ? (
          commands.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              Brak zarejestrowanych komend w projekcie.
            </div>
          ) : (
            commands.map((cmd, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-colors flex flex-col gap-1.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      /{cmd.name}
                    </span>
                    {cmd.aliases && cmd.aliases.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        (aliasy: {cmd.aliases.map((a) => `/${a}`).join(", ")})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {onTestCommand && (
                      <button
                        onClick={() => onTestCommand(`/${cmd.name}`)}
                        className="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 font-medium text-[10px] flex items-center gap-1 transition-colors"
                        title="Przetestuj w symulatorze"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Test</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleCopy(`/${cmd.name}`, `cmd-${idx}`)}
                      className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                      title="Kopiuj komendę"
                    >
                      {copiedIndex === `cmd-${idx}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {cmd.description && (
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {cmd.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-900/80 pt-1 mt-0.5 font-mono">
                  <span>Użycie: <span className="text-slate-300">{cmd.usage || `/${cmd.name}`}</span></span>
                  {cmd.permission && (
                    <span className="text-emerald-400/90 font-mono bg-slate-900 px-1 rounded">
                      perm: {cmd.permission}
                    </span>
                  )}
                </div>
              </div>
            ))
          )
        ) : permissions.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            Brak zdefiniowanych uprawnień.
          </div>
        ) : (
          permissions.map((perm, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-colors flex flex-col gap-1 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-emerald-300">
                  {perm.node || (perm as any).name}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                  domyślnie: {perm.default || "op"}
                </span>
              </div>
              {perm.description && (
                <p className="text-[11px] text-slate-400">{perm.description}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
