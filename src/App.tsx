import React, { useState, useEffect, useCallback } from "react";
import { SmoothStartScreen } from "./components/SmoothStartScreen";
import { ConversationWorkspace } from "./components/ConversationWorkspace";
import { ProjectSettingsModal } from "./components/ProjectSettingsModal";
import { AiAssistantModal } from "./components/AiAssistantModal";
import { CompileGuideModal } from "./components/CompileGuideModal";
import { ConversationHistoryModal } from "./components/ConversationHistoryModal";
import {
  PluginProject,
  GenerationSettings,
  ProjectFile,
  ConversationMessage,
  ConversationSession,
  MessageAttachment,
} from "./types";
import { DEFAULT_PLUGIN } from "./utils/defaultPlugin";
import { exportProjectToJar, exportProjectToZip } from "./utils/zipExporter";
import { safeJsonParse } from "./utils/jsonHelper";
import {
  loadAllSessions,
  saveSession,
  deleteSession as deleteSessionStorage,
  renameSession as renameSessionStorage,
  clearAllSessions as clearAllSessionsStorage,
  getStoredActiveSessionId,
  setStoredActiveSessionId,
} from "./utils/historyStorage";
import { ThemeSwitch } from "./components/ThemeSwitch";
import { Sparkles, Terminal, CheckCircle2, AlertCircle, HelpCircle, History } from "lucide-react";

export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const saved = localStorage.getItem("fifaai_theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch (e) {}
    return "dark";
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("fifaai_theme", next);
      } catch (e) {}
      return next;
    });
  };

  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

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

  // Load sessions from storage on mount
  useEffect(() => {
    const loaded = loadAllSessions();
    setSessions(loaded);

    // Check if there was an active session saved
    const lastActiveId = getStoredActiveSessionId();
    if (lastActiveId) {
      const activeSession = loaded.find((s) => s.id === lastActiveId);
      if (activeSession && activeSession.messages.length > 0) {
        setCurrentSessionId(activeSession.id);
        setProject(activeSession.project);
        setMessages(activeSession.messages);
        setSettings(activeSession.settings || settings);
        if (activeSession.activeFilePath) {
          setActiveFilePath(activeSession.activeFilePath);
        }
        setIsStarted(true);
      }
    }
  }, []);

  // Reload sessions helper
  const refreshSessions = useCallback(() => {
    const loaded = loadAllSessions();
    setSessions(loaded);
  }, []);

  // Auto clear toasts
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Save active session when project or messages update
  const persistSession = (
    sessionId: string,
    msgs: ConversationMessage[],
    proj: PluginProject,
    currentSettings: GenerationSettings,
    filePath?: string
  ) => {
    if (msgs.length === 0) return;
    const sessionObj: ConversationSession = {
      id: sessionId,
      title: proj.pluginName || "Nowy plugin",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: msgs,
      project: proj,
      settings: currentSettings,
      activeFilePath: filePath || proj.files[0]?.path,
    };
    saveSession(sessionObj);
    refreshSessions();
  };

  const handleStartOrSendMessage = async (
    promptText: string,
    attachments?: MessageAttachment[]
  ) => {
    const isFirstPrompt = !isStarted;
    setIsStarted(true);

    const sessionId =
      currentSessionId ||
      `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    if (!currentSessionId) {
      setCurrentSessionId(sessionId);
      setStoredActiveSessionId(sessionId);
    }

    const userMessageId = "user-" + Date.now();
    const newUserMsg: ConversationMessage = {
      id: userMessageId,
      role: "user",
      content: promptText,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessagesWithUser = [...messages, newUserMsg];
    setMessages(updatedMessagesWithUser);
    setIsGenerating(true);
    setErrorMessage(null);
    setStreamText("");

    // Initial save of the user prompt
    persistSession(sessionId, updatedMessagesWithUser, project, settings, activeFilePath);

    try {
      const response = await fetch("/api/generate-plugin-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          attachments: attachments && attachments.length > 0 ? attachments : undefined,
          pluginName: isFirstPrompt ? undefined : project.pluginName,
          packageName: isFirstPrompt ? undefined : project.packageName,
          platform: settings.platform,
          minecraftVersion: settings.minecraftVersion,
          existingFiles: isFirstPrompt ? [] : project.files,
          mode: isFirstPrompt ? "new" : "modify",
          conversationHistory: updatedMessagesWithUser.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Serwer nie zwrócił strumienia odpowiedzi.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedStreamText = "";
      let sseBuffer = "";
      let hasHandledResult = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const parts = sseBuffer.split("\n\n");
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
                } else if (data.type === "stream_reset") {
                  // Server restarted model stream; clean buffer
                  accumulatedStreamText = "";
                  setStreamText("");
                } else if (data.type === "complete" && data.result) {
                  hasHandledResult = true;
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
                  const updatedSettings = {
                    ...settings,
                    pluginName: newProject.pluginName,
                    packageName: newProject.packageName,
                  };
                  setSettings(updatedSettings);

                  const firstFilePath =
                    newProject.files.length > 0 ? newProject.files[0].path : activeFilePath;
                  if (newProject.files.length > 0) {
                    setActiveFilePath(firstFilePath);
                  }

                  const assistantMsg: ConversationMessage = {
                    id: "ai-" + Date.now(),
                    role: "assistant",
                    content:
                      res.summary ||
                      `Wygenerowałem dla Ciebie plugin **${newProject.pluginName}** z kompletną strukturą klas Java, konfiguracją i komendami.`,
                    timestamp: new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                    projectSnapshot: newProject,
                  };

                  const finalMessages = [...updatedMessagesWithUser, assistantMsg];
                  setMessages(finalMessages);
                  setSuccessToast(`Zaktualizowano plugin: ${newProject.pluginName}!`);

                  // Save complete session
                  persistSession(
                    sessionId,
                    finalMessages,
                    newProject,
                    updatedSettings,
                    firstFilePath
                  );
                } else if (data.type === "complete_raw" && data.text) {
                  try {
                    const parsed = safeJsonParse(data.text);
                    hasHandledResult = true;
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
                    const firstFilePath =
                      newProj.files.length > 0 ? newProj.files[0].path : activeFilePath;
                    if (newProj.files.length > 0) {
                      setActiveFilePath(firstFilePath);
                    }
                    const assistantMsg: ConversationMessage = {
                      id: "ai-" + Date.now(),
                      role: "assistant",
                      content:
                        parsed.summary ||
                        `Przygotowałem gotowy kod pluginu **${newProj.pluginName}**.`,
                      timestamp: new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                      projectSnapshot: newProj,
                    };
                    const finalMsgs = [...updatedMessagesWithUser, assistantMsg];
                    setMessages(finalMsgs);
                    setSuccessToast(`Wygenerowano plugin: ${newProj.pluginName}!`);

                    persistSession(
                      sessionId,
                      finalMsgs,
                      newProj,
                      settings,
                      firstFilePath
                    );
                  } catch (e) {
                    console.error("Parse complete_raw error:", e);
                  }
                } else if (data.type === "error") {
                  hasHandledResult = true;
                  setErrorMessage(data.error);
                  const errorAssistantMsg: ConversationMessage = {
                    id: "ai-err-" + Date.now(),
                    role: "assistant",
                    content: `⚠️ **Komunikat:** ${data.error || "Wystąpił problem z serwerem AI."}\n\nAutomatycznie zoptymalizowano połączenie zapasowe. Możesz ponowić próbę.`,
                    timestamp: new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  };
                  const finalMsgs = [...updatedMessagesWithUser, errorAssistantMsg];
                  setMessages(finalMsgs);
                  persistSession(sessionId, finalMsgs, project, settings, activeFilePath);
                }
              } catch (e) {
                // Ignore non JSON lines
              }
            }
          }
        }
      }

      // If stream ended without explicit completion event (e.g. cut off during long message), run recovery
      if (!hasHandledResult) {
        if (accumulatedStreamText.trim().length > 30) {
          try {
            const parsed = safeJsonParse(accumulatedStreamText);
            if (parsed && (parsed.files?.length > 0 || parsed.summary)) {
              hasHandledResult = true;
              const newProj: PluginProject = {
                pluginName: parsed.pluginName || settings.pluginName,
                packageName: parsed.packageName || settings.packageName,
                version: parsed.version || "1.0.0",
                platform: parsed.platform || settings.platform,
                minecraftVersion: settings.minecraftVersion,
                summary: parsed.summary || "Zrekonstruowano i wygenerowano kompletny kod pluginu.",
                commands: parsed.commands || [],
                permissions: parsed.permissions || [],
                files: parsed.files || [],
                testScenarios: parsed.testScenarios || [],
              };
              setProject(newProj);
              const firstFilePath =
                newProj.files.length > 0 ? newProj.files[0].path : activeFilePath;
              if (newProj.files.length > 0) {
                setActiveFilePath(firstFilePath);
              }
              const assistantMsg: ConversationMessage = {
                id: "ai-" + Date.now(),
                role: "assistant",
                content:
                  newProj.summary ||
                  `Pomyślnie wygenerowałem i zabezpieczyłem kod pluginu **${newProj.pluginName}**.`,
                timestamp: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                projectSnapshot: newProj,
              };
              const finalMsgs = [...updatedMessagesWithUser, assistantMsg];
              setMessages(finalMsgs);
              setSuccessToast(`Wygenerowano plugin: ${newProj.pluginName}!`);
              persistSession(sessionId, finalMsgs, newProj, settings, firstFilePath);
            }
          } catch (recoveryErr) {
            console.warn("Stream text repair attempt failed:", recoveryErr);
          }
        }

        // If still not handled, invoke fallback endpoint
        if (!hasHandledResult) {
          throw new Error("Strumień zakończył się przedwcześnie — uruchamiam awaryjne generowanie...");
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
            attachments: attachments && attachments.length > 0 ? attachments : undefined,
            pluginName: isFirstPrompt ? undefined : project.pluginName,
            packageName: isFirstPrompt ? undefined : project.packageName,
            platform: settings.platform,
            minecraftVersion: settings.minecraftVersion,
            existingFiles: isFirstPrompt ? [] : project.files,
            mode: isFirstPrompt ? "new" : "modify",
            conversationHistory: updatedMessagesWithUser.map((m) => ({
              role: m.role,
              content: m.content,
            })),
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
          const firstFilePath =
            newProject.files.length > 0 ? newProject.files[0].path : activeFilePath;
          if (newProject.files.length > 0) {
            setActiveFilePath(firstFilePath);
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
          const finalMsgs = [...updatedMessagesWithUser, assistantMsg];
          setMessages(finalMsgs);
          setSuccessToast(`Wygenerowano plugin: ${newProject.pluginName}!`);

          persistSession(sessionId, finalMsgs, newProject, settings, firstFilePath);
        } else {
          const errText = fallbackData.error || "Wystąpił problem z wygenerowaniem kodu.";
          setErrorMessage(errText);
          const errMsgs = [
            ...updatedMessagesWithUser,
            {
              id: "ai-err-" + Date.now(),
              role: "assistant",
              content: `⚠️ **Informacja:** ${errText}\n\nSpróbuj ponownie za moment.`,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            } as ConversationMessage,
          ];
          setMessages(errMsgs);
          persistSession(sessionId, errMsgs, project, settings, activeFilePath);
        }
      } catch (fallbackErr: any) {
        const netErr = "Błąd połączenia: " + fallbackErr.message;
        setErrorMessage(netErr);
        const errMsgs = [
          ...updatedMessagesWithUser,
          {
            id: "ai-err-" + Date.now(),
            role: "assistant",
            content: `⚠️ ${netErr}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          } as ConversationMessage,
        ];
        setMessages(errMsgs);
        persistSession(sessionId, errMsgs, project, settings, activeFilePath);
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
        result.message ||
          `Pomyślnie skompilowano i pobrano ${project.pluginName}-${project.version || "1.0.0"}.jar (bajtkod .class dla Paper/Spigot)!`
      );
    } catch (err: any) {
      console.error("Download jar error:", err);
      const errMsg = err.message || "Wystąpił błąd podczas kompilacji Javy.";
      setErrorMessage(errMsg);
      setMessages((prev) => [
        ...prev,
        {
          id: "ai-comp-err-" + Date.now(),
          role: "assistant",
          content: `❌ **Błąd kompilacji kodu Javy do .JAR:**\n\`\`\`text\n${errMsg}\n\`\`\`\n\nNapisz na czacie np. *"napraw błędy kompilacji"*, a automatycznie dostosuję i naprawię kod pluginu!`,
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

  // Start fresh conversation / plugin
  const handleResetToNew = () => {
    setIsStarted(false);
    setCurrentSessionId(null);
    setStoredActiveSessionId(null);
    setMessages([]);
    setProject(DEFAULT_PLUGIN);
    setActiveFilePath(DEFAULT_PLUGIN.files[0]?.path || "");
    setStreamText("");
    setErrorMessage(null);
  };

  // Switch to selected session
  const handleSelectSession = (selectedSession: ConversationSession) => {
    setCurrentSessionId(selectedSession.id);
    setStoredActiveSessionId(selectedSession.id);
    setProject(selectedSession.project);
    setMessages(selectedSession.messages);
    setSettings(selectedSession.settings || settings);
    if (selectedSession.activeFilePath) {
      setActiveFilePath(selectedSession.activeFilePath);
    } else if (selectedSession.project.files.length > 0) {
      setActiveFilePath(selectedSession.project.files[0].path);
    }
    setIsStarted(true);
    setErrorMessage(null);
    setStreamText("");
    setSuccessToast(`Wczytano projekt: ${selectedSession.project.pluginName}`);
  };

  const handleDeleteSession = (id: string) => {
    const updated = deleteSessionStorage(id);
    setSessions(updated);
    if (currentSessionId === id) {
      handleResetToNew();
    }
    setSuccessToast("Usunięto rozmowę z historii.");
  };

  const handleRenameSession = (id: string, newTitle: string) => {
    const updated = renameSessionStorage(id, newTitle);
    setSessions(updated);
    setSuccessToast("Zmieniono nazwę rozmowy.");
  };

  const handleClearAllHistory = () => {
    clearAllSessionsStorage();
    setSessions([]);
    handleResetToNew();
    setSuccessToast("Wyczyszczono całą historię rozmów.");
  };

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("theme-light");
      document.body.classList.add("theme-light");
    } else {
      document.documentElement.classList.remove("theme-light");
      document.body.classList.remove("theme-light");
    }
  }, [theme]);

  return (
    <div
      className={`bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black transition-colors duration-300 ${
        theme === "light" ? "theme-light" : ""
      } ${
        isStarted ? "h-screen max-h-screen overflow-hidden" : "min-h-screen"
      }`}
    >
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

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Switch (Dark / Light toggle) */}
          <ThemeSwitch theme={theme} onToggle={toggleTheme} />

          <div className="h-5 w-px bg-slate-800/80 mx-0.5 hidden sm:block" />

          {/* History Button */}
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-emerald-500/40 bg-slate-900/80 hover:bg-slate-900 transition-all flex items-center gap-1.5 cursor-pointer font-medium shadow-sm"
            title="Otwórz historię wszystkich rozmów i pluginów"
          >
            <History className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Historia</span>
            {sessions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                {sessions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsCompileGuideOpen(true)}
            className="text-xs text-amber-300 hover:text-amber-200 px-2.5 py-1.5 rounded-lg border border-amber-500/40 hover:border-amber-500/60 bg-amber-950/40 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
            title="Jak skompilować plugin i naprawić błąd na serwerze"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Instrukcja instalacji</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 transition-colors cursor-pointer"
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
          recentSessions={sessions}
          onSelectSession={handleSelectSession}
          onOpenHistory={() => setIsHistoryOpen(true)}
        />
      ) : (
        <ConversationWorkspace
          messages={messages}
          currentProject={project}
          activeFilePath={activeFilePath}
          onSelectFile={(path) => {
            setActiveFilePath(path);
            if (currentSessionId) {
              persistSession(currentSessionId, messages, project, settings, path);
            }
          }}
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
          onOpenHistory={() => setIsHistoryOpen(true)}
          onAskAiAboutFile={(file) => setAiModalFile(file)}
          settings={settings}
        />
      )}

      {/* Conversation History Modal */}
      <ConversationHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleResetToNew}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onClearAll={handleClearAllHistory}
        onReloadSessions={refreshSessions}
      />

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
