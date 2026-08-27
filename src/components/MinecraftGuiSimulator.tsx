import React, { useState, useEffect } from "react";
import {
  X,
  RefreshCw,
  Box,
  Terminal,
  Zap,
  ChevronRight,
  ArrowLeft,
  FolderOpen,
} from "lucide-react";
import { PluginProject, GuiMenuDefinition, GuiMenuItem } from "../types";
import { MinecraftTextRenderer } from "../utils/minecraftColors";
import { MinecraftItemIcon } from "./MinecraftItemIcon";
import { extractGuiFromPluginProject } from "../utils/guiParser";

export interface GuiItemData extends GuiMenuItem {}

interface MinecraftGuiSimulatorProps {
  project: PluginProject;
  isOpen: boolean;
  onClose: () => void;
  onItemClick?: (item: GuiItemData, newActiveState?: boolean, commandToRun?: string) => void;
  onTriggerSound?: (sound: string) => void;
}

export const MinecraftGuiSimulator: React.FC<MinecraftGuiSimulatorProps> = ({
  project,
  isOpen,
  onClose,
  onItemClick,
  onTriggerSound,
}) => {
  const [hoveredSlot, setHoveredSlot] = useState<GuiItemData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [availableMenus, setAvailableMenus] = useState<GuiMenuDefinition[]>([]);
  const [activeMenuIndex, setActiveMenuIndex] = useState<number>(0);
  const [itemsMap, setItemsMap] = useState<Record<number, GuiItemData>>({});
  const [lastClickedSlot, setLastClickedSlot] = useState<number | null>(null);
  const [lastExecutedCommand, setLastExecutedCommand] = useState<string | null>(null);
  const [menuHistory, setMenuHistory] = useState<number[]>([0]);

  // Synchronize GUI dynamically with the active plugin's code and files
  useEffect(() => {
    const menus = extractGuiFromPluginProject(project);
    setAvailableMenus(menus);
    setActiveMenuIndex(0);
    setMenuHistory([0]);

    if (menus.length > 0) {
      loadMenuIntoState(menus[0]);
    }
  }, [project]);

  const loadMenuIntoState = (menu: GuiMenuDefinition) => {
    const map: Record<number, GuiItemData> = {};
    if (menu && menu.items) {
      menu.items.forEach((it) => {
        map[it.slot] = { ...it };
      });
    }
    setItemsMap(map);
  };

  const handleSelectMenu = (index: number) => {
    if (index < 0 || index >= availableMenus.length) return;
    setActiveMenuIndex(index);
    setMenuHistory((prev) => [...prev, index]);
    if (availableMenus[index]) {
      loadMenuIntoState(availableMenus[index]);
    }
    onTriggerSound?.("BLOCK_CHEST_OPEN");
  };

  const handleGoBack = () => {
    if (menuHistory.length > 1) {
      const newHistory = [...menuHistory];
      newHistory.pop(); // remove current
      const prevIdx = newHistory[newHistory.length - 1];
      setMenuHistory(newHistory);
      setActiveMenuIndex(prevIdx);
      if (availableMenus[prevIdx]) {
        loadMenuIntoState(availableMenus[prevIdx]);
      }
    } else {
      // Fallback to first menu
      setActiveMenuIndex(0);
      setMenuHistory([0]);
      if (availableMenus[0]) loadMenuIntoState(availableMenus[0]);
    }
    onTriggerSound?.("UI_BUTTON_CLICK");
  };

  const activeMenu = availableMenus[activeMenuIndex] || {
    id: "default",
    title: `&8${project.pluginName || "Minecraft"} GUI`,
    rows: 3,
    items: [],
  };

  const handleSlotClick = (item: GuiItemData) => {
    if (!item) return;
    setLastClickedSlot(item.slot);
    setTimeout(() => setLastClickedSlot(null), 300);

    onTriggerSound?.("UI_BUTTON_CLICK");

    // 1. Check if item leads to a subcategory / other GUI
    if (item.targetMenuId) {
      const targetIdx = availableMenus.findIndex(
        (m) => m.id.toLowerCase() === item.targetMenuId?.toLowerCase()
      );
      if (targetIdx !== -1) {
        handleSelectMenu(targetIdx);
        if (item.commandOnClick) {
          setLastExecutedCommand(item.commandOnClick);
          setTimeout(() => setLastExecutedCommand(null), 2500);
        }
        onItemClick?.(item, true, item.commandOnClick);
        return;
      }
    }

    // 2. Check if item is a "Back" button
    if (item.actionKey === "back" || item.name.includes("Wróć") || item.name.includes("◀")) {
      handleGoBack();
      return;
    }

    // 3. Check if the item has an explicit or inferrable Minecraft command
    let commandToExecute = item.commandOnClick;
    if (!commandToExecute) {
      if (item.actionKey?.startsWith("exec_")) {
        commandToExecute = `/${item.actionKey.replace("exec_", "")}`;
      } else if (item.name.startsWith("&e&l/") || item.name.startsWith("/")) {
        const rawCmd = item.name.replace(/&[0-9a-fk-or]/gi, "").trim();
        commandToExecute = rawCmd.startsWith("/") ? rawCmd : `/${rawCmd}`;
      } else if (item.actionKey === "deposit_all") {
        commandToExecute = `/${activeMenu.triggerCommand || "schowek"} all`;
      } else if (item.actionKey === "deposit_kox") {
        commandToExecute = `/${activeMenu.triggerCommand || "schowek"} kox`;
      } else if (item.actionKey === "deposit_refil") {
        commandToExecute = `/${activeMenu.triggerCommand || "schowek"} refil`;
      } else if (item.actionKey === "deposit_pearl") {
        commandToExecute = `/${activeMenu.triggerCommand || "schowek"} perly`;
      }
    }

    if (commandToExecute) {
      setLastExecutedCommand(commandToExecute);
      setTimeout(() => setLastExecutedCommand(null), 2500);
    }

    if (item.actionKey === "close") {
      onClose();
      return;
    }

    if (item.actionKey === "clear_trash") {
      onTriggerSound?.("ENTITY_ITEM_BREAK");
      setItemsMap((prev) => {
        const copy = { ...prev };
        for (let s = 0; s < activeMenu.rows * 9; s++) {
          if (s !== item.slot) delete copy[s];
        }
        return copy;
      });
      onItemClick?.(item, false, commandToExecute);
      return;
    }

    // Toggle status if item is toggleable (e.g. drop toggle)
    if (
      item.actionKey?.startsWith("toggle_") ||
      item.name.toLowerCase().includes("drop") ||
      item.name.toLowerCase().includes("status") ||
      item.material.includes("INGOT") ||
      item.material === "DIAMOND" ||
      item.material === "EMERALD" ||
      item.material === "REDSTONE" ||
      item.material === "COAL"
    ) {
      const nextActive = !item.active;
      const updatedLore = item.lore?.map((line) => {
        if (line.includes("Status:") || line.includes("WŁĄCZONY") || line.includes("WYŁĄCZONY")) {
          return nextActive ? "&7Status: &aWŁĄCZONY" : "&7Status: &cWYŁĄCZONY";
        }
        return line;
      });

      setItemsMap((prev) => ({
        ...prev,
        [item.slot]: {
          ...item,
          active: nextActive,
          enchanted: nextActive,
          lore: updatedLore,
        },
      }));

      onItemClick?.(item, nextActive, commandToExecute);
      return;
    }

    onItemClick?.(item, item.active, commandToExecute);
  };

  const handleMouseMove = (e: React.MouseEvent, item: GuiItemData) => {
    setHoveredSlot(item);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: rect.right + 10,
      y: rect.top - 10,
    });
  };

  // Player inventory sample items with authentic textures
  const playerHotbar = [
    { slot: 0, material: "NETHERITE_SWORD", name: "&bNetherytowy Miecz", amount: 1, enchanted: true, lore: ["&7Ostrość V", "&7Niezniszczalność III"] },
    { slot: 1, material: "DIAMOND_PICKAXE", name: "&bDiamentowy Kilof", amount: 1, enchanted: true, lore: ["&7Wydajność V", "&7Szczęście III"] },
    { slot: 2, material: "ENCHANTED_GOLDEN_APPLE", name: "&dZłote Jabłko (Kox)", amount: 2, enchanted: true, lore: ["&7Regeneracja II (0:20)", "&7Odporność (5:00)"] },
    { slot: 3, material: "GOLDEN_APPLE", name: "&6Złote Jabłko (Refil)", amount: 12, lore: ["&7Regeneracja II (0:05)", "&7Absorpcja (2:00)"] },
    { slot: 4, material: "ENDER_PEARL", name: "&3Perły Kresu", amount: 16, lore: ["&7Teleportacja"] },
    { slot: 5, material: "COAL", name: "&8Węgiel", amount: 64, lore: ["&7Paliwo do pieca"] },
    { slot: 6, material: "IRON_INGOT", name: "&fSztabka Żelaza", amount: 32, lore: ["&7Materiał rzemieślniczy"] },
    { slot: 7, material: "COMPASS", name: "&cKompas Nawigacyjny", amount: 1, lore: ["&7Wskazuje punkt odrodzenia"] },
    { slot: 8, material: "CLOCK", name: "&eZegar Czasu Gry", amount: 1, lore: ["&7Wskazuje porę dnia"] },
  ];

  if (!isOpen) return null;

  const isSubCategory = activeMenuIndex > 0 || !!activeMenu.parentMenuId;

  return (
    <div className="relative bg-[#c6c6c6] text-slate-900 border-4 border-[#373737] rounded-lg shadow-2xl p-3 select-none font-mono max-w-full overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-[#8b8b8b] text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-bold text-[#222] tracking-wider text-[12px] flex items-center gap-1.5">
            <Box className="w-4 h-4 text-[#333]" />
            <span>Minecraft GUI: {project.pluginName}</span>
          </span>
          <span className="px-1.5 py-0.5 rounded bg-[#8b8b8b] text-[#222] text-[10px] font-bold">
            {activeMenu.rows * 9} slotów
          </span>

          {/* Breadcrumb Navigation if inside Subcategory */}
          {availableMenus.length > 1 && (
            <div className="flex items-center gap-1 bg-[#b0b0b0] px-2 py-0.5 rounded text-[11px] font-semibold text-[#111] border border-[#777]">
              <button
                onClick={() => handleSelectMenu(0)}
                className="hover:text-amber-800 underline cursor-pointer flex items-center gap-0.5"
              >
                <FolderOpen className="w-3 h-3 text-amber-700" />
                {availableMenus[0]?.categoryName || "Główne"}
              </button>
              {isSubCategory && (
                <>
                  <ChevronRight className="w-3 h-3 text-[#555]" />
                  <span className="text-amber-900 font-bold">
                    {activeMenu.categoryName || activeMenu.id.replace(/_/g, " ")}
                  </span>
                </>
              )}
            </div>
          )}

          {lastExecutedCommand && (
            <span className="px-2 py-0.5 rounded bg-emerald-800 text-emerald-100 text-[10px] font-bold flex items-center gap-1 animate-pulse">
              <Terminal className="w-3 h-3 text-emerald-300" />
              Wykonano: {lastExecutedCommand}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Back button if in subcategory */}
          {isSubCategory && (
            <button
              onClick={handleGoBack}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#373737] hover:bg-[#222] text-amber-300 border border-[#111] text-[11px] font-bold cursor-pointer"
              title="Wróć do poprzedniego menu"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Wróć</span>
            </button>
          )}

          {/* Menu Switcher Tabs if plugin has multiple GUIs */}
          {availableMenus.length > 1 && (
            <div className="flex items-center bg-[#8b8b8b] rounded p-0.5 border border-[#555] text-[10px] max-w-[280px] overflow-x-auto">
              {availableMenus.map((m, idx) => (
                <button
                  key={m.id || idx}
                  onClick={() => handleSelectMenu(idx)}
                  className={`px-2 py-0.5 rounded font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    activeMenuIndex === idx
                      ? "bg-[#373737] text-amber-300 shadow-inner"
                      : "text-[#222] hover:bg-[#a0a0a0]"
                  }`}
                >
                  {m.categoryName || m.id.replace(/_/g, " ").toUpperCase()}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => {
              const menus = extractGuiFromPluginProject(project);
              setAvailableMenus(menus);
              if (menus[activeMenuIndex]) loadMenuIntoState(menus[activeMenuIndex]);
            }}
            className="p-1 rounded bg-[#a0a0a0] hover:bg-[#8b8b8b] text-[#222] border border-[#555] cursor-pointer"
            title="Przeładuj GUI z kodu pluginu"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded bg-rose-700 hover:bg-rose-800 text-white border border-rose-900 cursor-pointer"
            title="Zamknij GUI (ESC)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Minecraft Chest Container Box */}
      <div className="bg-[#c6c6c6] border-2 border-t-white border-l-white border-r-[#555] border-b-[#555] p-2.5 rounded shadow-inner">
        {/* Chest Title Bar (Extracted from Plugin Code/Config) */}
        <div className="text-[13px] font-bold text-[#3f3f3f] mb-2 px-1 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <MinecraftTextRenderer text={activeMenu.title || `&8Menu: ${project.pluginName}`} />
          </div>
          <span className="text-[10px] text-[#555] font-normal flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-600" />
            Kliknij w kategorię lub slot aby przejść / wykonać akcję
          </span>
        </div>

        {/* Chest Slots Grid (rows * 9) */}
        <div
          className="grid grid-cols-9 gap-1 bg-[#8b8b8b] p-1.5 border-2 border-t-[#373737] border-l-[#373737] border-r-white border-b-white rounded shadow-inner"
        >
          {Array.from({ length: activeMenu.rows * 9 }).map((_, slotIndex) => {
            const item = itemsMap[slotIndex];
            const isClicked = lastClickedSlot === slotIndex;
            const isGlassFiller = item?.material?.includes("GLASS_PANE");
            const isCategoryOpener = !!item?.targetMenuId;

            return (
              <div
                key={slotIndex}
                onClick={() => item && handleSlotClick(item)}
                onMouseEnter={(e) => item && !isGlassFiller && handleMouseMove(e, item)}
                onMouseLeave={() => setHoveredSlot(null)}
                className={`relative w-9 h-9 sm:w-11 sm:h-11 bg-[#8b8b8b] border-2 border-t-[#373737] border-l-[#373737] border-r-white border-b-white flex items-center justify-center cursor-pointer transition-all ${
                  item ? "hover:brightness-125 group hover:bg-[#969696]" : ""
                } ${isClicked ? "scale-95 brightness-150 ring-2 ring-amber-400 bg-[#7a7a7a]" : ""} ${
                  isCategoryOpener ? "ring-1 ring-amber-500/50 bg-[#838383]" : ""
                }`}
              >
                {item && (
                  <>
                    <MinecraftItemIcon
                      material={item.material}
                      enchanted={item.enchanted}
                      className="w-7 h-7 sm:w-8 sm:h-8"
                    />

                    {/* Stack Count Badge */}
                    {item.amount && item.amount > 1 && (
                      <span className="absolute bottom-0.5 right-1 text-[10px] sm:text-[11px] font-bold text-white font-mono leading-none drop-shadow-[1.5px_1.5px_0_#000] z-20">
                        {item.amount}
                      </span>
                    )}

                    {/* Active State Dot or Category Indicator */}
                    {isCategoryOpener ? (
                      <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_5px_#fbbf24] z-20" />
                    ) : item.active !== undefined ? (
                      <span
                        className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full z-20 ${
                          item.active ? "bg-emerald-400 shadow-[0_0_4px_#34d399]" : "bg-rose-500"
                        }`}
                      />
                    ) : null}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Player Inventory Label */}
        <div className="text-[12px] font-bold text-[#3f3f3f] mt-3 mb-1.5 px-1 flex items-center justify-between">
          <span>Ekwipunek gracza (Steve)</span>
          <span className="text-[10px] text-[#555]">Hotbar: 1-9 (Prawdziwe tekstury Minecraft)</span>
        </div>

        {/* Hotbar Slots Grid */}
        <div className="grid grid-cols-9 gap-1 bg-[#8b8b8b] p-1.5 border-2 border-t-[#373737] border-l-[#373737] border-r-white border-b-white rounded shadow-inner">
          {playerHotbar.map((item, idx) => (
            <div
              key={idx}
              onClick={() => handleSlotClick({ ...item, actionKey: `hotbar_${item.material.toLowerCase()}` })}
              onMouseEnter={(e) => handleMouseMove(e, item)}
              onMouseLeave={() => setHoveredSlot(null)}
              className="relative w-9 h-9 sm:w-11 sm:h-11 bg-[#8b8b8b] border-2 border-t-[#373737] border-l-[#373737] border-r-white border-b-white flex items-center justify-center cursor-pointer hover:brightness-125 group hover:bg-[#969696]"
            >
              <MinecraftItemIcon
                material={item.material}
                enchanted={item.enchanted}
                className="w-7 h-7 sm:w-8 sm:h-8"
              />
              {item.amount > 1 && (
                <span className="absolute bottom-0.5 right-1 text-[10px] sm:text-[11px] font-bold text-white font-mono leading-none drop-shadow-[1.5px_1.5px_0_#000] z-20">
                  {item.amount}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Realistic Minecraft Tooltip / Lore Box */}
      {hoveredSlot && hoveredSlot.name && hoveredSlot.name !== "&8-" && (
        <div
          className="fixed z-50 pointer-events-none p-2.5 rounded bg-[#100010]/95 border-2 border-[#2b005e] shadow-2xl text-xs font-mono max-w-xs animate-in fade-in zoom-in-95 duration-75"
          style={{
            left: `${Math.min(tooltipPos.x, window.innerWidth - 260)}px`,
            top: `${Math.max(10, Math.min(tooltipPos.y, window.innerHeight - 200))}px`,
          }}
        >
          {/* Item Name */}
          <div className="font-bold text-sm mb-1 leading-snug">
            <MinecraftTextRenderer text={hoveredSlot.name} />
          </div>

          {/* Lore Lines */}
          {hoveredSlot.lore && hoveredSlot.lore.length > 0 && (
            <div className="space-y-0.5 border-t border-purple-900/60 pt-1 text-[11px] leading-relaxed">
              {hoveredSlot.lore.map((line, idx) => (
                <div key={idx}>
                  <MinecraftTextRenderer text={line} />
                </div>
              ))}
            </div>
          )}

          {/* Category Prompt if it's a category opener */}
          {hoveredSlot.targetMenuId && (
            <div className="mt-1 text-[10px] text-amber-300 font-semibold border-t border-purple-950 pt-0.5 flex items-center gap-1">
              <span>▶ Kliknij, aby wejść do kategorii</span>
            </div>
          )}

          {/* Item Action prompt if present */}
          {hoveredSlot.commandOnClick && !hoveredSlot.targetMenuId && (
            <div className="mt-1 text-[10px] text-amber-300 font-semibold border-t border-purple-950 pt-0.5">
              ▶ Wykona: {hoveredSlot.commandOnClick}
            </div>
          )}

          {/* Material ID */}
          <div className="text-[9px] text-slate-500 border-t border-slate-800/80 mt-1.5 pt-1">
            minecraft:{hoveredSlot.material.toLowerCase()}
          </div>
        </div>
      )}
    </div>
  );
};
