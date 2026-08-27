import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  Send,
  User,
  ShieldAlert,
  Sparkles,
  Volume2,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Box,
  Layers,
  Maximize2,
  Eye,
  Sliders,
} from "lucide-react";
import { PluginProject, ChatMessage } from "../types";
import { MinecraftTextRenderer } from "../utils/minecraftColors";
import { MinecraftGuiSimulator, GuiItemData } from "./MinecraftGuiSimulator";
import { extractGuiFromPluginProject } from "../utils/guiParser";

interface MinecraftChatSimulatorProps {
  project: PluginProject;
  onExecuteCommand?: (cmd: string) => void;
}

export const MinecraftChatSimulator: React.FC<MinecraftChatSimulatorProps> = ({
  project,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "Server",
      role: "system",
      text: `&8[&aServer&8]&r Serwer Minecraft uruchomiony z pluginem &a${project.pluginName} v${project.version}&r.`,
      timestamp: "12:00:00",
    },
    {
      id: "2",
      sender: "Steve",
      role: "player",
      text: "&7Wpisz komendę (np. " + (project.commands.map(c => `/${c.name}`).join(", ") || "/help") + ") lub kliknij [🎮 Otwórz GUI pluginu] poniżej!",
      timestamp: "12:00:01",
    },
  ]);

  const [inputVal, setInputVal] = useState("");
  const [senderRole, setSenderRole] = useState<"player" | "console">("player");
  const [lastEffect, setLastEffect] = useState<{ sound?: string; particle?: string } | null>(null);
  const [isGuiOpen, setIsGuiOpen] = useState<boolean>(false);
  const [simulatorViewMode, setSimulatorViewMode] = useState<"both" | "chat" | "gui">("both");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-open GUI if project is clearly a GUI plugin (e.g. drop, kosz, menu) on initial mount
  useEffect(() => {
    const pName = (project.pluginName || "").toLowerCase();
    if (pName.includes("drop") || pName.includes("kosz") || pName.includes("menu") || pName.includes("schowek")) {
      setIsGuiOpen(true);
    }
  }, [project.pluginName]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const triggerSound = (sound: string, particle?: string) => {
    setLastEffect({ sound, particle });
    setTimeout(() => setLastEffect(null), 3000);
  };

  const executeCommand = (cmdStr: string) => {
    const trimmed = cmdStr.trim();
    const isCommand = trimmed.startsWith("/");
    const commandName = isCommand ? trimmed.slice(1).split(" ")[0].toLowerCase() : "";
    const args = isCommand ? trimmed.slice(1).split(" ").slice(1) : [];

    const now = new Date().toLocaleTimeString();

    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: senderRole === "player" ? "Steve" : "CONSOLE",
      role: senderRole,
      text: senderRole === "player" ? (isCommand ? trimmed : `&f<Steve>&r ${trimmed}`) : trimmed,
      timestamp: now,
    };

    setMessages((prev) => [...prev, userMsg]);

    if (!isCommand) return;

    // Simulate response based on plugin data and test scenarios
    setTimeout(() => {
      // Find if command exists in project
      const matchedCmd = project.commands.find(
        (c) => c.name.toLowerCase() === commandName || (c.aliases && c.aliases.map(a => a.toLowerCase()).includes(commandName))
      );

      // Check test scenarios first
      const scenario = project.testScenarios?.find(
        (s) => s.command.toLowerCase().startsWith(`/${commandName}`)
      );

      let responseText = "";
      let simulatedEffect: { sound?: string; particle?: string } | null = null;

      // Check if command triggers an inventory GUI defined in the plugin
      const detectedMenus = extractGuiFromPluginProject(project);
      const matchedMenu = detectedMenus.find(
        (m) =>
          m.triggerCommand?.toLowerCase() === commandName ||
          m.id?.toLowerCase() === commandName ||
          commandName === "gui" ||
          commandName === "menu" ||
          commandName === "panel"
      );

      // Standard GUI Keywords Detection
      const isGuiCmd =
        !!matchedMenu ||
        commandName === "drop" ||
        commandName === "kosz" ||
        commandName === "trash" ||
        commandName === "menu" ||
        commandName === "gui" ||
        commandName === "panel" ||
        commandName === "schowek" ||
        commandName === "depozyt" ||
        commandName === "sklep" ||
        commandName === "shop" ||
        commandName === "craftingi" ||
        commandName === "crafting" ||
        commandName === "nagrody" ||
        commandName === "daily" ||
        commandName === "vip";

      if (isGuiCmd) {
        setIsGuiOpen(true);
        responseText = `&6&l[${project.pluginName}]&a Otwarto menu ekwipunku &e/${commandName}&a (${matchedMenu?.title || project.pluginName}).`;
        simulatedEffect = { sound: "BLOCK_CHEST_OPEN", particle: "VILLAGER_HAPPY" };
      } else if (scenario) {
        responseText = scenario.expectedOutput;
      } else if (matchedCmd) {
        // Generic smart response
        if (commandName === "heal" || commandName === "ulecz") {
          responseText = `&6&l[${project.pluginName}]&a Twoje zdrowie oraz głód zostały odnowione!`;
          simulatedEffect = { sound: "ENTITY_PLAYER_LEVELUP", particle: "HEART" };
        } else if (commandName === "fly" || commandName === "latanie") {
          responseText = `&6&l[${project.pluginName}]&e Tryb latania: &aWŁĄCZONY`;
          simulatedEffect = { sound: "ITEM_ARMOR_EQUIP_ELYTRA" };
        } else if (commandName.includes("thor") || commandName.includes("sword") || commandName.includes("mlot")) {
          responseText = `&6&l[${project.pluginName}]&a Otrzymałeś &eMłot Boga Piorunów&a! Pioruny aktywne!`;
          simulatedEffect = { sound: "ENTITY_LIGHTNING_BOLT_THUNDER", particle: "EXPLOSION_LARGE" };
        } else if (commandName === "god") {
          responseText = `&6&l[${project.pluginName}]&e Tryb boga (nieśmiertelność): &aWŁĄCZONY`;
          simulatedEffect = { sound: "BLOCK_BEACON_ACTIVATE" };
        } else if (commandName === "rtp") {
          const x = Math.floor(Math.random() * 2000) - 1000;
          const z = Math.floor(Math.random() * 2000) - 1000;
          responseText = `&6&l[${project.pluginName}]&a Przeteleportowano na bezpieczne koordynaty: &eX: ${x}, Y: 72, Z: ${z}`;
          simulatedEffect = { sound: "ENTITY_ENDERMAN_TELEPORT", particle: "PORTAL" };
        } else if (commandName === "bal" || commandName === "kasa" || commandName === "money") {
          responseText = `&6&l[${project.pluginName}]&a Twój stan konta wynosi: &e1 250,00 PLN`;
          simulatedEffect = { sound: "ENTITY_EXPERIENCE_ORB_PICKUP" };
        } else {
          responseText = `&6&l[${project.pluginName}]&a Pomyślnie wykonano komendę &e/${commandName}&a. (Wymagane uprawnienie: &7${matchedCmd.permission || "brak"}&a)`;
          simulatedEffect = { sound: "BLOCK_NOTE_BLOCK_PLING" };
        }
      } else if (commandName === "help" || commandName === "pomoc" || commandName === "?") {
        responseText = `&6--- Dostępne komendy pluginu ${project.pluginName} ---\n` +
          (project.commands.map(c => `&e/${c.name}&7 - ${c.description || "Brak opisu"}`).join("\n") || "&7Brak zarejestrowanych komend.");
      } else {
        responseText = `&cNieznana komenda. Wpisz /help lub kliknij jedną z komend pluginu poniżej.`;
      }

      if (simulatedEffect) {
        setLastEffect(simulatedEffect);
        setTimeout(() => setLastEffect(null), 3000);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "Plugin",
          role: "plugin",
          text: responseText,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }, 150);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    executeCommand(inputVal);
    setInputVal("");
  };

  const handleGuiItemClick = (item: GuiItemData, newActiveState?: boolean, commandToRun?: string) => {
    let msgText = `&8[&6${project.pluginName}&8]&a Kliknięto w menu: ${item.name}`;
    if (newActiveState !== undefined) {
      msgText += newActiveState ? " &8(&aStatus: WŁĄCZONY&8)" : " &8(&cStatus: WYŁĄCZONY&8)";
    }
    if (item.actionKey === "clear_trash") {
      msgText = `&8[&c${project.pluginName}&8]&c Kosz został wyczyszczony! Wszystkie przedmioty spalone.`;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "Plugin",
        role: "plugin",
        text: msgText,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    // If an associated command exists, automatically execute it in the chat simulator
    if (commandToRun) {
      setTimeout(() => {
        executeCommand(commandToRun);
      }, 200);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        sender: "Server",
        role: "system",
        text: "&7Wyczyszczono historię wiadomości symulatora.",
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full min-h-[420px]">
      {/* Header */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Symulator pluginu & Gry
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-semibold">
            Live
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* GUI Toggle Button */}
          <button
            onClick={() => setIsGuiOpen(!isGuiOpen)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isGuiOpen
                ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-950/40"
                : "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30"
            }`}
            title="Otwórz / Zamknij interaktywne menu GUI skrzyni"
          >
            <Box className="w-3.5 h-3.5" />
            <span>{isGuiOpen ? "Ukryj GUI" : "🎮 Otwórz GUI pluginu"}</span>
          </button>

          {/* Player / Console Switch */}
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-[11px]">
            <button
              onClick={() => setSenderRole("player")}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer ${
                senderRole === "player" ? "bg-emerald-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <User className="w-3 h-3" />
              <span>Gracz</span>
            </button>
            <button
              onClick={() => setSenderRole("console")}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer ${
                senderRole === "console" ? "bg-emerald-600 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Terminal className="w-3 h-3" />
              <span>Konsola</span>
            </button>
          </div>

          <button
            onClick={clearChat}
            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Wyczyść historię wiadomości"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Simulated Effect Banner */}
      {lastEffect && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/40 px-3 py-1 text-[11px] text-emerald-300 flex items-center gap-2 animate-in slide-in-from-top duration-200">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
          <span>
            Symulacja efektu gry:{" "}
            {lastEffect.sound && <strong className="text-white">Dźwięk: {lastEffect.sound} </strong>}
            {lastEffect.particle && <strong className="text-amber-300">Cząsteczki: {lastEffect.particle}</strong>}
          </span>
        </div>
      )}

      {/* Interactive Minecraft GUI Overlay (Shown when open) */}
      {isGuiOpen && (
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 animate-in fade-in zoom-in-95 duration-150">
          <MinecraftGuiSimulator
            project={project}
            isOpen={isGuiOpen}
            onClose={() => {
              setIsGuiOpen(false);
              triggerSound("BLOCK_CHEST_CLOSE");
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  sender: "Plugin",
                  role: "plugin",
                  text: `&8[&6${project.pluginName}&8]&7 Zamknięto menu ekwipunku.`,
                  timestamp: new Date().toLocaleTimeString(),
                },
              ]);
            }}
            onItemClick={handleGuiItemClick}
            onTriggerSound={(s) => triggerSound(s)}
          />
        </div>
      )}

      {/* Chat Messages Box */}
      <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1.5 bg-black/60 backdrop-blur-sm select-text min-h-[160px]">
        {messages.map((msg) => (
          <div key={msg.id} className="leading-relaxed break-words">
            <span className="text-slate-600 text-[10px] select-none mr-1.5">[{msg.timestamp}]</span>
            <MinecraftTextRenderer text={msg.text} />
          </div>
        ))}
        <div ref={chatBottomRef} />
      </div>

      {/* Quick Test Command Chips */}
      {project.commands.length > 0 && (
        <div className="px-3 py-1.5 bg-slate-900/60 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-slate-400 whitespace-nowrap text-[10px]">Komendy:</span>
          {project.commands.map((cmd, i) => (
            <button
              key={i}
              onClick={() => {
                setInputVal(`/${cmd.name}`);
              }}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-emerald-950 hover:text-emerald-300 hover:border-emerald-500/50 border border-slate-700 text-slate-300 transition-colors whitespace-nowrap font-mono text-[11px] cursor-pointer"
            >
              /{cmd.name}
            </button>
          ))}
          {/* Quick GUI button in chip bar */}
          <button
            onClick={() => setIsGuiOpen(true)}
            className="px-2 py-0.5 rounded bg-amber-950/60 hover:bg-amber-900 border border-amber-500/40 text-amber-300 transition-colors whitespace-nowrap font-mono text-[11px] flex items-center gap-1 cursor-pointer"
          >
            <Box className="w-3 h-3" />
            <span>Otwórz GUI</span>
          </button>
        </div>
      )}

      {/* Chat Input Bar */}
      <form onSubmit={handleSend} className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <span className="font-mono text-emerald-400 font-bold text-sm pl-1">
          {senderRole === "player" ? "T >" : ">"}
        </span>
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder={
            senderRole === "player"
              ? "Wpisz /komenda (np. /drop, /kosz, /menu) lub wiadomość..."
              : "Wpisz polecenie konsoli..."
          }
          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={!inputVal.trim()}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Wyślij</span>
        </button>
      </form>
    </div>
  );
};

export const MinecraftPluginSimulator = MinecraftChatSimulator;
