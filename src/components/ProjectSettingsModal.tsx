import React, { useState } from "react";
import { X, Settings, Check, Server, Package, Cpu, FileCode } from "lucide-react";
import { GenerationSettings } from "../types";

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GenerationSettings;
  onSave: (newSettings: GenerationSettings) => void;
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [formData, setFormData] = useState<GenerationSettings>({ ...settings });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-xl max-w-md w-full shadow-2xl overflow-hidden text-slate-200">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-white">Ustawienia Projektu Minecraft</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-emerald-400" />
              Nazwa Pluginu (np. EpicMagic, GuildsX)
            </label>
            <input
              type="text"
              value={formData.pluginName}
              onChange={(e) => setFormData({ ...formData, pluginName: e.target.value.replace(/[^a-zA-Z0-9_-]/g, "") })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              Główny Pakiet Java (Group / Package)
            </label>
            <input
              type="text"
              value={formData.packageName}
              onChange={(e) => setFormData({ ...formData, packageName: e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, "") })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                Silnik Serwera
              </label>
              <select
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="Paper">Paper (Rekomendowany)</option>
                <option value="Spigot">Spigot</option>
                <option value="Purpur">Purpur</option>
                <option value="Bukkit">Bukkit</option>
                <option value="Fabric">Fabric (Mod/Plugin)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                Wersja Minecraft
              </label>
              <select
                value={formData.minecraftVersion}
                onChange={(e) => setFormData({ ...formData, minecraftVersion: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="1.21">1.21 (Najnowsza)</option>
                <option value="1.20.4">1.20.4 (Stabilna)</option>
                <option value="1.20.2">1.20.2</option>
                <option value="1.19.4">1.19.4</option>
                <option value="1.16.5">1.16.5 (Klasyczna)</option>
                <option value="1.12.2">1.12.2 (Legacy)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Wersja Java
              </label>
              <select
                value={formData.javaVersion}
                onChange={(e) => setFormData({ ...formData, javaVersion: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="Java 21">Java 21 (Dla MC 1.20.5+)</option>
                <option value="Java 17">Java 17 (Dla MC 1.17 - 1.20.4)</option>
                <option value="Java 8">Java 8 (Dla MC 1.12 - 1.16)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Narzędzie Budowania
              </label>
              <select
                value={formData.buildTool}
                onChange={(e) => setFormData({ ...formData, buildTool: e.target.value as any })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="Maven">Maven (pom.xml)</option>
                <option value="Gradle">Gradle (build.gradle.kts)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-900/30"
            >
              <Check className="w-3.5 h-3.5" />
              Zapisz Ustawienia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
