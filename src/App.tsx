import React, { useState, useEffect } from "react";
import { SmoothStartScreen } from "./components/SmoothStartScreen";
import { ConversationWorkspace } from "./components/ConversationWorkspace";
import { ProjectSettingsModal } from "./components/ProjectSettingsModal";
import { AiAssistantModal } from "./components/AiAssistantModal";
import { CompileGuideModal } from "./components/CompileGuideModal";
import { PluginProject, GenerationSettings, ProjectFile, ConversationMessage } from "./types";
import { DEFAULT_PLUGIN } from "./utils/defaultPlugin";
import { exportProjectToJar, exportProjectToZip } from "./utils/zipExporter";
import { Sparkles, Terminal, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";

export default function App() {
  const [isStarted, setIsStarted] = useState(false);
  const [project, setProject] = useState<PluginProject>(DEFAULT_PLUGIN);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>(
    DEFAULT_PLUGIN.files[0]?.path || ""
  );

  const [settings, setSettings] = useState<GenerationSettings>({
    pluginName: DEFAULT_PLUGIN.pluginName,
    packageName: DEFAULT_PLUGIN.packageName,
    platform: "Paper",
    minecraftVersion: "1.20.4",
    javaVersion: "Java 17",
    buildTool: "Maven",
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isCompilingJar, setIsCompilingJar] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCompileGuideOpen, setIsCompileGuideOpen] = useState(false);
  const [aiModalFile, setAiModalFile] = useState<ProjectFile | null>(null);

  // Auto clear toasts
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  const handleStartOrSendMessage = async (promptText: string) => {
    const isFirstPrompt = !isStarted;
    setIsStarted(true);

    const userMessageId = "user-" + Date.now();
    const newUserMsg: ConversationMessage = {
      id: userMessageId,
      role: "user",
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setIsGenerating(true);
    setErrorMessage(null);
    setStreamText("");

    try {
      const response = await fetch("/api/generate-plugin-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          pluginName: isFirstPrompt ? undefined : project.pluginName,
          packageName: isFirstPrompt ? undefined : project.packageName,
          platform: settings.platform,
          minecraftVersion: settings.minecraftVersion,
          existingFiles: isFirstPrompt ? [] : project.files,
          mode: isFirstPrompt ? "new" : "modify",
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Serwer nie zwrócił strumienia odpowiedzi.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedStreamText = "";
      let sseBuffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const parts = sseBuffer.split("\n\n");
        // Keep the last partial part in the buffer
        sseBuffer = parts.pop() || "";

        for (const block of parts) {
          const lines = block.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") break;

              try {
                const data = JSON.parse(dataStr);
                if (data.type === "chunk") {
                  accumulatedStreamText += data.text || "";
                  setStreamText(accumulatedStreamText);
                } else if (data.type === "complete" && data.result) {
                  const res = data.result;
                  const newProject: PluginProject = {
                    pluginName: res.pluginName || settings.pluginName,
                    packageName: res.packageName || settings.packageName,
                    version: res.version || "1.0.0",
                    platform: res.platform || settings.platform,
                    minecraftVersion: settings.minecraftVersion,
                    summary: res.summary || "Pomyślnie wygenerowano kod pluginu Minecraft.",
                    commands: res.commands || [],
                    permissions: res.permissions || [],
                    files: res.files || [],
                    testScenarios: res.testScenarios || [],
                  };

                  setProject(newProject);
                  setSettings((prev) => ({
                    ...prev,
                    pluginName: newProject.pluginName,
                    packageName: newProject.packageName,
                  }));
                  if (newProject.files.length > 0) {
                    setActiveFilePath(newProject.files[0].path);
                  }

                  // Add assistant message with snapshot
                  const assistantMsg: ConversationMessage = {
                    id: "ai-" + Date.now(),
                    role: "assistant",
                    content:
                      res.summary ||
                      `Wygenerowałem dla Ciebie plugin **${newProject.pluginName}** z kompletną strukturą klas Java, konfiguracją i komendami. Możesz pobrać gotowy plik **.JAR** dla Twojego serwera Minecraft lub przetestować komendy w symulatorze!`,
                    timestamp: new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                    projectSnapshot: newProject,
                  };
                  setMessages((prev) => [...prev, assistantMsg]);
                  setSuccessToast(`Zaktualizowano plugin: ${newProject.pluginName}!`);
                } else if (data.type === "complete_raw" && data.text) {
                  try {
                    const cleaned = data.text.replace(/```json/g, "").replace(/```/g, "").trim();
                    const parsed = JSON.parse(cleaned);
                    const newProj: PluginProject = {
                      pluginName: parsed.pluginName || settings.pluginName,
                      packageName: parsed.packageName || settings.packageName,
                      version: parsed.version || "1.0.0",
                      platform: parsed.platform || settings.platform,
                      minecraftVersion: settings.minecraftVersion,
                      summary: parsed.summary || "",
                      commands: parsed.commands || [],
                      permissions: parsed.permissions || [],
                      files: parsed.files || [],
                      testScenarios: parsed.testScenarios || [],
                    };
                    setProject(newProj);
                    if (newProj.files.length > 0) {
                      setActiveFilePath(newProj.files[0].path);
                    }
                    const assistantMsg: ConversationMessage = {
                      id: "ai-" + Date.now(),
                      role: "assistant",
                      content:
                        parsed.summary ||
                        `Przygotowałem gotowy kod pluginu **${newProj.pluginName}**. Kliknij **Pobierz .JAR** poniżej, aby wrzucić go bezpośrednio do katalogu plugins/ na serwerze.`,
                      timestamp: new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                      projectSnapshot: newProj,
                    };
                    setMessages((prev) => [...prev, assistantMsg]);
                    setSuccessToast(`Wygenerowano plugin: ${newProj.pluginName}!`);
                  } catch (e) {
                    console.error("Parse complete_raw error:", e);
                  }
                } else if (data.type === "error") {
                  setErrorMessage(data.error);
                  const errorAssistantMsg: ConversationMessage = {
                    id: "ai-err-" + Date.now(),
                    role: "assistant",
                    content: `⚠️ **Komunikat:** ${data.error || "Wystąpił problem z serwerem AI."}\n\nAutomatycznie zoptymalizowano połączenie zapasowe. Możesz ponowić próbę za pomocą pola poniżej.`,
                    timestamp: new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  };
                  setMessages((prev) => [...prev, errorAssistantMsg]);
                }
              } catch (e) {
                // Ignore non JSON lines
              }
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Generation error:", err);
      // Fallback to one-shot API
      try {
        const fallbackRes = await fetch("/api/generate-plugin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: promptText,
            pluginName: settings.pluginName,
            packageName: settings.packageName,
            platform: settings.platform,
            minecraftVersion: settings.minecraftVersion,
            existingFiles: isFirstPrompt ? [] : project.files,
            mode: isFirstPrompt ? "new" : "modify",
          }),
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackData.success && fallbackData.data) {
          const res = fallbackData.data;
          const newProject: PluginProject = {
            pluginName: res.pluginName || settings.pluginName,
            packageName: res.packageName || settings.packageName,
            version: res.version || "1.0.0",
            platform: res.platform || settings.platform,
            minecraftVersion: settings.minecraftVersion,
            summary: res.summary || "",
            commands: res.commands || [],
            permissions: res.permissions || [],
            files: res.files || [],
            testScenarios: res.testScenarios || [],
          };
          setProject(newProject);
          if (newProject.files.length > 0) {
            setActiveFilePath(newProject.files[0].path);
          }
          const assistantMsg: ConversationMessage = {
            id: "ai-" + Date.now(),
            role: "assistant",
            content:
              res.summary ||
              `Wygenerowałem plugin **${newProject.pluginName}**. Możesz go pobrać lub przetestować.`,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            projectSnapshot: newProject,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setSuccessToast(`Wygenerowano plugin: ${newProject.pluginName}!`);
        } else {
          const errText = fallbackData.error || "Wystąpił problem z wygenerowaniem kodu.";
          setErrorMessage(errText);
          setMessages((prev) => [
            ...prev,
            {
              id: "ai-err-" + Date.now(),
              role: "assistant",
              content: `⚠️ **Informacja:** ${errText}\n\nSpróbuj ponownie za moment.`,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }
      } catch (fallbackErr: any) {
        const netErr = "Błąd połączenia: " + fallbackErr.message;
        setErrorMessage(netErr);
        setMessages((prev) => [
          ...prev,
          {
            id: "ai-err-" + Date.now(),
            role: "assistant",
            content: `⚠️ ${netErr}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadJar = async () => {
    setIsCompilingJar(true);
    try {
      const result = await exportProjectToJar(project);
      setSuccessToast(
        `Pomyślnie skompilowano i pobrano ${project.pluginName}-${project.version || "1.0.0"}.jar (ze skompilowanymi plikami .class)!`
      );
    } catch (err: any) {
      const errMsg = err.message || "Wystąpił błąd podczas kompilacji Javy.";
      setErrorMessage(errMsg);
      setMessages((prev) => [
        ...prev,
        {
          id: "ai-comp-err-" + Date.now(),
          role: "assistant",
          content: `❌ **Błąd kompilacji Javy do .JAR:**\n\`\`\`text\n${errMsg}\n\`\`\`\n\nNapisz na czacie np. *"napraw błędy kompilacji"*, a automatycznie dostosuję kod!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsCompilingJar(false);
    }
  };

  const handleDownloadZip = async () => {
    try {
      await exportProjectToZip(project);
      setSuccessToast(`Pobrano archiwum ${project.pluginName}-src.zip!`);
    } catch (err: any) {
      setErrorMessage("Błąd pobierania ZIP: " + err.message);
    }
  };

  const handleCopyCode = () => {
    const current = project.files.find((f) => f.path === activeFilePath) || project.files[0];
    if (!current) return;
    navigator.clipboard.writeText(current.content);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleResetToNew = () => {
    setIsStarted(false);
    setMessages([]);
    setStreamText("");
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-950/95 border border-emerald-500/50 text-emerald-300 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
          <button onClick={() => setSuccessToast(null)} className="ml-2 text-emerald-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 bg-rose-950/95 border border-rose-500/50 text-rose-300 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-in slide-in-from-top-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="ml-2 text-rose-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        <div
          onClick={handleResetToNew}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="font-extrabold text-sm text-white tracking-tight flex items-center gap-1.5">
              <span>FifaAI</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono font-semibold">
                Studio
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Generator Pluginów Minecraft (Paper & Spigot)</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCompileGuideOpen(true)}
            className="text-xs text-amber-300 hover:text-amber-200 px-2.5 py-1.5 rounded-lg border border-amber-500/40 hover:border-amber-500/60 bg-amber-950/40 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
            title="Jak skompilować plugin i naprawić błąd na serwerze"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Instrukcja instalacji / Naprawa</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 transition-colors"
          >
            Silnik: <span className="text-emerald-400 font-medium">{settings.platform} {settings.minecraftVersion}</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      {!isStarted ? (
        <SmoothStartScreen
          onStart={handleStartOrSendMessage}
          isGenerating={isGenerating}
        />
      ) : (
        <ConversationWorkspace
          messages={messages}
          currentProject={project}
          activeFilePath={activeFilePath}
          onSelectFile={setActiveFilePath}
          isGenerating={isGenerating}
          isCompilingJar={isCompilingJar}
          streamText={streamText}
          onSendMessage={handleStartOrSendMessage}
          onDownloadJar={handleDownloadJar}
          onDownloadZip={handleDownloadZip}
          onOpenCompileGuide={() => setIsCompileGuideOpen(true)}
          onCopyCode={handleCopyCode}
          copied={copiedAll}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onNewPlugin={handleResetToNew}
          onAskAiAboutFile={(file) => setAiModalFile(file)}
          settings={settings}
        />
      )}

      {/* Settings Modal */}
      <ProjectSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={(newSettings) => {
          setSettings(newSettings);
          setSuccessToast("Zapisano ustawienia projektu!");
        }}
      />

      {/* AI Explain / Fix Modal */}
      <AiAssistantModal
        isOpen={!!aiModalFile}
        onClose={() => setAiModalFile(null)}
        file={aiModalFile}
      />

      {/* Compile & Fix Guide Modal */}
      <CompileGuideModal
        isOpen={isCompileGuideOpen}
        onClose={() => setIsCompileGuideOpen(false)}
        project={project}
        onDownloadZip={handleDownloadZip}
      />
    </div>
  );
}
