import { PluginProject, GuiMenuDefinition, GuiMenuItem } from "../types";

/**
 * Intelligent parser that extracts exact GUI structures and multi-level subcategories from:
 * 1. Project's explicit `guiMenus` if provided by AI
 * 2. Java source code (Bukkit.createInventory, Inventory, setItem, ItemStack, Material, ItemMeta, openInventory)
 * 3. YAML configuration files (config.yml, gui.yml, menus.yml)
 * 4. Contextual multi-category and sub-menu generation based on plugin purpose
 */
export function extractGuiFromPluginProject(project: PluginProject): GuiMenuDefinition[] {
  if (!project) return [];

  // 1. If explicit guiMenus are already defined and populated, verify they have parent navigation
  if (project.guiMenus && project.guiMenus.length > 0) {
    return ensureNavigationLinks(project.guiMenus);
  }

  const menus: GuiMenuDefinition[] = [];

  // Search in Java files & YAML files
  const javaFiles = project.files?.filter((f) => f.type === "java") || [];
  const yamlFiles = project.files?.filter((f) => f.type === "yaml") || [];

  // --- Scan Java files for Bukkit.createInventory / GUI classes ---
  for (const file of javaFiles) {
    const content = file.content || "";
    if (
      content.includes("createInventory") ||
      content.includes("InventoryHolder") ||
      content.includes("InventoryClickEvent") ||
      content.includes("setItem(") ||
      content.includes("openInventory")
    ) {
      const parsedMenu = parseJavaGuiFile(file.fileName, content, project);
      if (parsedMenu && parsedMenu.items.length > 0) {
        menus.push(parsedMenu);
      }
    }
  }

  // --- Scan YAML files (config.yml, menus.yml) for GUI sections ---
  for (const file of yamlFiles) {
    const content = file.content || "";
    if (
      content.includes("gui:") ||
      content.includes("menu:") ||
      content.includes("inventory:") ||
      content.includes("items:") ||
      content.includes("drop-gui:") ||
      content.includes("categories:")
    ) {
      const parsedYamlMenus = parseYamlGuiSections(content, project);
      if (parsedYamlMenus && parsedYamlMenus.length > 0) {
        menus.push(...parsedYamlMenus);
      }
    }
  }

  // If no or only single menu found, build high-fidelity contextual multi-category system based on plugin type
  if (menus.length === 0) {
    const contextualMenus = buildContextualMultiGui(project);
    menus.push(...contextualMenus);
  } else {
    // If only one flat menu was found from code but plugin is category-based, enrich with category menus
    const enriched = enrichCategoriesIfApplicable(menus, project);
    return ensureNavigationLinks(enriched);
  }

  return ensureNavigationLinks(menus);
}

/**
 * Ensures all sub-categories have a clear "Wróć" (back) button to parent menu
 */
function ensureNavigationLinks(menus: GuiMenuDefinition[]): GuiMenuDefinition[] {
  if (menus.length <= 1) return menus;

  const mainMenu = menus[0];

  return menus.map((menu, idx) => {
    if (idx === 0) return menu; // Main menu

    const copy = { ...menu };
    const returnSlot = (copy.rows * 9) - 1; // bottom right slot or slot 0

    // Check if return button already exists
    const hasReturn = copy.items.some(
      (it) => it.actionKey === "back" || it.targetMenuId === mainMenu.id || it.name.includes("Wróć")
    );

    if (!hasReturn) {
      const newItems = copy.items.filter((it) => it.slot !== returnSlot);
      newItems.push({
        slot: returnSlot,
        material: "ARROW",
        name: "&c&l◀ Wróć do menu głównego",
        lore: [
          `&7Kliknij, aby powrócić do:`,
          `&e${mainMenu.title.replace(/&[0-9a-fk-or]/gi, "")}`,
        ],
        targetMenuId: mainMenu.id,
        actionKey: "back",
        commandOnClick: mainMenu.triggerCommand ? `/${mainMenu.triggerCommand}` : undefined,
      });
      copy.items = newItems;
      copy.parentMenuId = mainMenu.id;
    }

    return copy;
  });
}

/**
 * Parses Java source code to extract GUI title, size, and setItem calls
 */
function parseJavaGuiFile(fileName: string, code: string, project: PluginProject): GuiMenuDefinition | null {
  try {
    let rows = 3;
    let title = `&8${project.pluginName} GUI`;

    const createInvMatch = code.match(/createInventory\s*\([^,]+,\s*(\d+|\d+\s*\*\s*\d+)\s*,\s*([^)]+)\)/i);
    if (createInvMatch) {
      const sizeStr = createInvMatch[1].trim();
      const rawTitle = createInvMatch[2].trim();

      if (sizeStr.includes("*")) {
        const parts = sizeStr.split("*").map((p) => parseInt(p.trim(), 10));
        const totalSlots = parts[0] * parts[1];
        rows = Math.min(6, Math.max(1, Math.round(totalSlots / 9)));
      } else {
        const totalSlots = parseInt(sizeStr, 10);
        rows = Math.min(6, Math.max(1, Math.round(totalSlots / 9)));
      }

      const titleMatch = rawTitle.match(/["']([^"']+)["']/);
      if (titleMatch) {
        title = titleMatch[1];
      }
    }

    const items: GuiMenuItem[] = [];
    const setItemRegex = /(?:inv|inventory|menu|gui)\.setItem\s*\(\s*(\d+)\s*,\s*([^;]+)\)/gi;
    let match;

    while ((match = setItemRegex.exec(code)) !== null) {
      const slot = parseInt(match[1], 10);
      const itemVarOrExpr = match[2].trim();
      const parsedItem = extractItemDetails(itemVarOrExpr, code, slot);
      if (parsedItem) {
        items.push(parsedItem);
      }
    }

    if (items.length > 0) {
      const menuId = fileName.replace(/\.java$/i, "").toLowerCase();
      return {
        id: menuId,
        title,
        rows,
        triggerCommand: project.commands?.[0]?.name || "menu",
        items,
      };
    }
  } catch (e) {
    console.warn("Error parsing Java GUI:", e);
  }

  return null;
}

function extractItemDetails(itemVar: string, code: string, slot: number): GuiMenuItem {
  let material = "STONE";
  let name = `&fPrzedmiot #${slot}`;
  const lore: string[] = [];

  const matMatch = code.match(new RegExp(`(?:Material\\.)([A-Z0-9_]+)`, "g"));
  if (matMatch && matMatch.length > 0) {
    material = matMatch[matMatch.length - 1].replace("Material.", "");
  }

  const nameMatch = code.match(/setDisplayName\s*\(\s*[^"']*["']([^"']+)["']/);
  if (nameMatch) {
    name = nameMatch[1];
  }

  return {
    slot,
    material,
    name,
    lore,
    active: true,
  };
}

function parseYamlGuiSections(content: string, project: PluginProject): GuiMenuDefinition[] {
  const menus: GuiMenuDefinition[] = [];

  try {
    const lines = content.split("\n");
    let inGuiSection = false;
    let currentTitle = `&8${project.pluginName} Menu`;
    let currentRows = 3;
    const currentItems: GuiMenuItem[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith("gui:") || trimmed.startsWith("menu:") || trimmed.startsWith("inventory:")) {
        inGuiSection = true;
        continue;
      }

      if (inGuiSection) {
        if (trimmed.startsWith("title:")) {
          const t = trimmed.replace("title:", "").trim().replace(/^['"]|['"]$/g, "");
          if (t) currentTitle = t;
        } else if (trimmed.startsWith("size:") || trimmed.startsWith("rows:")) {
          const s = parseInt(trimmed.replace(/(?:size|rows):/, "").trim(), 10);
          if (!isNaN(s)) {
            currentRows = s <= 6 ? s : Math.min(6, Math.max(1, Math.round(s / 9)));
          }
        } else if (trimmed.startsWith("slot:")) {
          const slotNum = parseInt(trimmed.replace("slot:", "").trim(), 10);
          let mat = "DIAMOND";
          let itemName = `&eSlot ${slotNum}`;
          const itemLore: string[] = [];

          for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 6); j++) {
            if (lines[j]) {
              const sub = lines[j].trim();
              if (sub.startsWith("material:") || sub.startsWith("item:")) {
                mat = sub.replace(/(?:material|item):/, "").trim().replace(/^['"]|['"]$/g, "");
              }
              if (sub.startsWith("name:") || sub.startsWith("display-name:")) {
                itemName = sub.replace(/(?:name|display-name):/, "").trim().replace(/^['"]|['"]$/g, "");
              }
              if (sub.startsWith("- ")) {
                itemLore.push(sub.replace("- ", "").trim().replace(/^['"]|['"]$/g, ""));
              }
            }
          }

          if (!isNaN(slotNum) && slotNum >= 0 && slotNum < currentRows * 9) {
            currentItems.push({
              slot: slotNum,
              material: mat.toUpperCase(),
              name: itemName,
              lore: itemLore,
              active: true,
            });
          }
        }
      }
    }

    if (currentItems.length > 0) {
      menus.push({
        id: "config_gui",
        title: currentTitle,
        rows: currentRows,
        triggerCommand: project.commands?.[0]?.name || "gui",
        items: currentItems,
      });
    }
  } catch (e) {
    console.warn("Error parsing YAML GUI:", e);
  }

  return menus;
}

function enrichCategoriesIfApplicable(menus: GuiMenuDefinition[], project: PluginProject): GuiMenuDefinition[] {
  // If only 1 menu exists but user clicked a category, enrich
  if (menus.length === 1) {
    const contextual = buildContextualMultiGui(project);
    if (contextual.length > 1) {
      return contextual;
    }
  }
  return menus;
}

/**
 * Builds realistic, rich multi-category GUI sets for all types of Minecraft plugins
 */
function buildContextualMultiGui(project: PluginProject): GuiMenuDefinition[] {
  const pName = (project.pluginName || "").toLowerCase();
  const summary = (project.summary || "").toLowerCase();
  const allText = (project.files || []).map((f) => f.content).join("\n").toLowerCase();

  // --- 1. SHOP / SKLEP / TARG (Hierarchical Categories) ---
  if (pName.includes("shop") || pName.includes("sklep") || summary.includes("sklep") || summary.includes("shop") || allText.includes("shop")) {
    return [
      {
        id: "shop_main",
        title: `&8&lSKLEP SERWEROWY: &6Kategorie`,
        rows: 4,
        categoryName: "Menu Główne",
        triggerCommand: "sklep",
        items: [
          {
            slot: 11,
            material: "DIAMOND_SWORD",
            name: "&b&lKategoria: Broń i Narzędzia",
            amount: 1,
            enchanted: true,
            lore: [
              "&7Miecze, kilofy, siekiery, łuki i zbroje.",
              "",
              "&aDostępne przedmioty: &f12 szt.",
              "&e▶ Kliknij, aby otworzyć kategorię!",
            ],
            targetMenuId: "shop_weapons",
            commandOnClick: "/sklep bron",
          },
          {
            slot: 13,
            material: "ENCHANTED_GOLDEN_APPLE",
            name: "&d&lKategoria: Jedzenie i Mikstury",
            amount: 1,
            enchanted: true,
            lore: [
              "&7Koxy, refile, pieczone mięso, potki.",
              "",
              "&aDostępne przedmioty: &f8 szt.",
              "&e▶ Kliknij, aby otworzyć kategorię!",
            ],
            targetMenuId: "shop_food",
            commandOnClick: "/sklep jedzenie",
          },
          {
            slot: 15,
            material: "BRICKS",
            name: "&6&lKategoria: Bloki Budowlane",
            amount: 1,
            lore: [
              "&7Obsydian, kamień, drewno, szkło i inne.",
              "",
              "&aDostępne przedmioty: &f16 szt.",
              "&e▶ Kliknij, aby otworzyć kategorię!",
            ],
            targetMenuId: "shop_blocks",
            commandOnClick: "/sklep bloki",
          },
          {
            slot: 21,
            material: "EMERALD",
            name: "&a&lKategoria: Surowce i Minerały",
            amount: 1,
            enchanted: true,
            lore: [
              "&7Diamenty, szmaragdy, złoto, żelazo, węgiel.",
              "",
              "&aDostępne przedmioty: &f9 szt.",
              "&e▶ Kliknij, aby otworzyć kategorię!",
            ],
            targetMenuId: "shop_minerals",
            commandOnClick: "/sklep surowce",
          },
          {
            slot: 23,
            material: "NETHER_STAR",
            name: "&5&lKategoria: Przedmioty Specjalne & VIP",
            amount: 1,
            enchanted: true,
            lore: [
              "&7Totemy, perły, elytry, shulkery i vouchery.",
              "",
              "&aDostępne przedmioty: &f6 szt.",
              "&e▶ Kliknij, aby otworzyć kategorię!",
            ],
            targetMenuId: "shop_special",
            commandOnClick: "/sklep specjalne",
          },
          {
            slot: 31,
            material: "BARRIER",
            name: "&c&lZamknij Sklep",
            lore: ["&7Zamyka okno sklepu."],
            actionKey: "close",
          },
          ...generateGlassBorder(4),
        ],
      },
      // Sub-category 1: Broń i Narzędzia
      {
        id: "shop_weapons",
        title: `&8Sklep: &b&lBroń i Narzędzia`,
        rows: 4,
        parentMenuId: "shop_main",
        categoryName: "Broń",
        triggerCommand: "sklep bron",
        items: [
          {
            slot: 10,
            material: "NETHERITE_SWORD",
            name: "&5&lNetherytowy Miecz Zagłady",
            amount: 1,
            enchanted: true,
            lore: ["&7Cena: &a500 Monet", "&7Enchanty: &bOstrość 5, Niezniszczalność 3", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup netherite_sword",
          },
          {
            slot: 11,
            material: "DIAMOND_SWORD",
            name: "&b&lDiamentowy Miecz",
            amount: 1,
            lore: ["&7Cena: &a150 Monet", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup diamond_sword",
          },
          {
            slot: 12,
            material: "NETHERITE_PICKAXE",
            name: "&5&lNetherytowy Kilof 5/3/3",
            amount: 1,
            enchanted: true,
            lore: ["&7Cena: &a650 Monet", "&7Enchanty: &bWydajność 5, Szczęście 3", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup netherite_pickaxe",
          },
          {
            slot: 13,
            material: "DIAMOND_PICKAXE",
            name: "&b&lDiamentowy Kilof",
            amount: 1,
            lore: ["&7Cena: &a120 Monet", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup diamond_pickaxe",
          },
          {
            slot: 14,
            material: "BOW",
            name: "&e&lŁuk Snajperski",
            amount: 1,
            enchanted: true,
            lore: ["&7Cena: &a200 Monet", "&7Enchanty: &bMoc 5, Nieskończoność 1", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup bow",
          },
          {
            slot: 15,
            material: "ARROW",
            name: "&fStrzały x64",
            amount: 64,
            lore: ["&7Cena: &a25 Monet", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup arrow 64",
          },
          {
            slot: 16,
            material: "SHIELD",
            name: "&6Tarcza Bojowa",
            amount: 1,
            lore: ["&7Cena: &a40 Monet", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup shield",
          },
          ...generateGlassBorder(4),
        ],
      },
      // Sub-category 2: Jedzenie i Mikstury
      {
        id: "shop_food",
        title: `&8Sklep: &d&lJedzenie i Mikstury`,
        rows: 4,
        parentMenuId: "shop_main",
        categoryName: "Jedzenie",
        triggerCommand: "sklep jedzenie",
        items: [
          {
            slot: 11,
            material: "ENCHANTED_GOLDEN_APPLE",
            name: "&d&lZłote Jabłko (KOX)",
            amount: 1,
            enchanted: true,
            lore: ["&7Cena: &a300 Monet", "&7Daje: &dRegeneracja 2, Odporność", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup kox 1",
          },
          {
            slot: 13,
            material: "GOLDEN_APPLE",
            name: "&6&lZłote Jabłko (REFIL) x4",
            amount: 4,
            lore: ["&7Cena: &a80 Monet", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup refil 4",
          },
          {
            slot: 15,
            material: "COOKED_BEEF",
            name: "&4Pieczona Wołowina x32",
            amount: 32,
            lore: ["&7Cena: &a20 Monet", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup beef 32",
          },
          {
            slot: 21,
            material: "GOLDEN_CARROT",
            name: "&eZłote Marchewki x16",
            amount: 16,
            lore: ["&7Cena: &a45 Monet", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup carrot 16",
          },
          {
            slot: 23,
            material: "POTION",
            name: "&bMikstura Szybkości II",
            amount: 1,
            lore: ["&7Cena: &a50 Monet", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup potion_speed",
          },
          ...generateGlassBorder(4),
        ],
      },
      // Sub-category 3: Bloki Budowlane
      {
        id: "shop_blocks",
        title: `&8Sklep: &6&lBloki Budowlane`,
        rows: 4,
        parentMenuId: "shop_main",
        categoryName: "Bloki",
        triggerCommand: "sklep bloki",
        items: [
          {
            slot: 11,
            material: "OBSIDIAN",
            name: "&5Obsydian x16",
            amount: 16,
            lore: ["&7Cena: &a100 Monet", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup obsidian 16",
          },
          {
            slot: 12,
            material: "STONE",
            name: "&7Gładki Kamień x64",
            amount: 64,
            lore: ["&7Cena: &a15 Monet", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup stone 64",
          },
          {
            slot: 13,
            material: "OAK_PLANKS",
            name: "&6Dębowe Deski x64",
            amount: 64,
            lore: ["&7Cena: &a20 Monet", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup planks 64",
          },
          {
            slot: 14,
            material: "GLASS",
            name: "&fSzkło x64",
            amount: 64,
            lore: ["&7Cena: &a25 Monet", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup glass 64",
          },
          {
            slot: 15,
            material: "TNT",
            name: "&cDynamit (TNT) x8",
            amount: 8,
            lore: ["&7Cena: &a150 Monet", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup tnt 8",
          },
          ...generateGlassBorder(4),
        ],
      },
      // Sub-category 4: Surowce
      {
        id: "shop_minerals",
        title: `&8Sklep: &a&lSurowce i Minerały`,
        rows: 4,
        parentMenuId: "shop_main",
        categoryName: "Surowce",
        triggerCommand: "sklep surowce",
        items: [
          {
            slot: 11,
            material: "DIAMOND",
            name: "&bDiament x8",
            amount: 8,
            enchanted: true,
            lore: ["&7Cena: &a120 Monet", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup diamond 8",
          },
          {
            slot: 12,
            material: "EMERALD",
            name: "&aSzmaragd x16",
            amount: 16,
            lore: ["&7Cena: &a100 Monet", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup emerald 16",
          },
          {
            slot: 13,
            material: "NETHERITE_INGOT",
            name: "&5Sztabka Netherytu x1",
            amount: 1,
            enchanted: true,
            lore: ["&7Cena: &a400 Monet", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup netherite 1",
          },
          {
            slot: 14,
            material: "GOLD_INGOT",
            name: "&6Sztabka Złota x16",
            amount: 16,
            lore: ["&7Cena: &a60 Monet", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup gold 16",
          },
          {
            slot: 15,
            material: "IRON_INGOT",
            name: "&fSztabka Żelaza x32",
            amount: 32,
            lore: ["&7Cena: &a50 Monet", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup iron 32",
          },
          ...generateGlassBorder(4),
        ],
      },
      // Sub-category 5: Specjalne
      {
        id: "shop_special",
        title: `&8Sklep: &5&lPrzedmioty Specjalne & VIP`,
        rows: 4,
        parentMenuId: "shop_main",
        categoryName: "Specjalne",
        triggerCommand: "sklep specjalne",
        items: [
          {
            slot: 11,
            material: "TOTEM_OF_UNDYING",
            name: "&e&lTotem Nieśmiertelności",
            amount: 1,
            enchanted: true,
            lore: ["&7Cena: &a800 Monet", "&7Ratuje życie przed śmiercią!", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup totem",
          },
          {
            slot: 13,
            material: "ENDER_PEARL",
            name: "&3&lPerły Kresu x8",
            amount: 8,
            lore: ["&7Cena: &a160 Monet", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup pearl 8",
          },
          {
            slot: 15,
            material: "ELYTRA",
            name: "&b&lSkrzydła Elytra",
            amount: 1,
            enchanted: true,
            lore: ["&7Cena: &a2500 Monet", "&7Pozwala latać po mapie!", "", "&e▶ Kliknij, aby kupić!"],
            commandOnClick: "/kup elytra",
          },
          ...generateGlassBorder(4),
        ],
      },
    ];
  }

  // --- 2. DROP PLUGIN WITH CATEGORIES (Kamień, Obsydian, Moby, Turbodrop) ---
  if (pName.includes("drop") || summary.includes("drop") || allText.includes("drop")) {
    return [
      {
        id: "drop_main",
        title: `&8&lMENU DROPU: &6Wybierz Kategorię`,
        rows: 4,
        categoryName: "Kategorie",
        triggerCommand: "drop",
        items: [
          {
            slot: 11,
            material: "STONE",
            name: "&e&lKategoria: Dropy ze Stona (Kamień)",
            amount: 1,
            enchanted: true,
            lore: [
              "&7Diamenty, szmaragdy, żelazo, złoto, netheryt.",
              "",
              "&aLiczba surowców: &f7",
              "&e▶ Kliknij, aby zarządzać dropami!",
            ],
            targetMenuId: "drop_stone",
            commandOnClick: "/drop stone",
          },
          {
            slot: 13,
            material: "OBSIDIAN",
            name: "&5&lKategoria: Dropy z Obsydianu",
            amount: 1,
            enchanted: true,
            lore: [
              "&7Koxy, perły kresu, gwiazdy netheru, totemy.",
              "",
              "&aLiczba dropów: &f4",
              "&e▶ Kliknij, aby zarządzać dropami!",
            ],
            targetMenuId: "drop_obsidian",
            commandOnClick: "/drop obsidian",
          },
          {
            slot: 15,
            material: "NETHER_STAR",
            name: "&d&lKategoria: Mnożniki VIP & Turbodrop",
            amount: 1,
            enchanted: true,
            lore: [
              "&7Aktualne bonusy do szansy na drop.",
              "",
              "&aTwój bonus: &e+25% szansy",
              "&e▶ Kliknij, aby zobaczyć szczegóły!",
            ],
            targetMenuId: "drop_boosters",
            commandOnClick: "/drop mnozniki",
          },
          {
            slot: 31,
            material: "BARRIER",
            name: "&c&lZamknij Menu",
            lore: ["&7Zamyka okno menu dropu."],
            actionKey: "close",
          },
          ...generateGlassBorder(4),
        ],
      },
      // Category: Dropy ze Stone
      {
        id: "drop_stone",
        title: `&8Dropy ze Stona: &b&lSurowce`,
        rows: 4,
        parentMenuId: "drop_main",
        categoryName: "Kamień",
        triggerCommand: "drop stone",
        items: [
          {
            slot: 10,
            material: "DIAMOND",
            name: "&b&lDiament z Kamienia",
            amount: 1,
            enchanted: true,
            active: true,
            lore: ["&7Szansa bazowa: &a2.5%", "&7Mnożnik VIP: &e+0.5%", "", "&7Status: &aWŁĄCZONY", "&e▶ Kliknij, aby włączyć/wyłączyć"],
            actionKey: "toggle_diamond",
          },
          {
            slot: 11,
            material: "EMERALD",
            name: "&a&lSzmaragd z Kamienia",
            amount: 1,
            active: true,
            lore: ["&7Szansa bazowa: &a1.8%", "&7Status: &aWŁĄCZONY", "&e▶ Kliknij, aby włączyć/wyłączyć"],
            actionKey: "toggle_emerald",
          },
          {
            slot: 12,
            material: "NETHERITE_INGOT",
            name: "&5&lSztabka Netherytu",
            amount: 1,
            enchanted: true,
            active: true,
            lore: ["&7Szansa bazowa: &d0.2%", "&7Status: &aWŁĄCZONY", "&e▶ Kliknij, aby włączyć/wyłączyć"],
            actionKey: "toggle_netherite",
          },
          {
            slot: 13,
            material: "GOLD_INGOT",
            name: "&6&lSztabka Złota",
            amount: 1,
            active: true,
            lore: ["&7Szansa bazowa: &a4.0%", "&7Status: &aWŁĄCZONY", "&e▶ Kliknij, aby włączyć/wyłączyć"],
            actionKey: "toggle_gold",
          },
          {
            slot: 14,
            material: "IRON_INGOT",
            name: "&f&lSztabka Żelaza",
            amount: 1,
            active: true,
            lore: ["&7Szansa bazowa: &a12.0%", "&7Status: &aWŁĄCZONY", "&e▶ Kliknij, aby włączyć/wyłączyć"],
            actionKey: "toggle_iron",
          },
          {
            slot: 15,
            material: "REDSTONE",
            name: "&c&lCzerwony Proszek",
            amount: 1,
            active: true,
            lore: ["&7Szansa bazowa: &a8.0%", "&7Status: &aWŁĄCZONY", "&e▶ Kliknij, aby włączyć/wyłączyć"],
            actionKey: "toggle_redstone",
          },
          {
            slot: 16,
            material: "COAL",
            name: "&8&lWęgiel",
            amount: 1,
            active: true,
            lore: ["&7Szansa bazowa: &a15.0%", "&7Status: &aWŁĄCZONY", "&e▶ Kliknij, aby włączyć/wyłączyć"],
            actionKey: "toggle_coal",
          },
          ...generateGlassBorder(4),
        ],
      },
      // Category: Dropy z Obsydianu
      {
        id: "drop_obsidian",
        title: `&8Dropy z Obsydianu: &5&lRzadkie Przedmioty`,
        rows: 4,
        parentMenuId: "drop_main",
        categoryName: "Obsydian",
        triggerCommand: "drop obsidian",
        items: [
          {
            slot: 11,
            material: "ENCHANTED_GOLDEN_APPLE",
            name: "&d&lZłote Jabłko KOX",
            amount: 1,
            enchanted: true,
            active: true,
            lore: ["&7Szansa: &a0.05%", "&7Status: &aWŁĄCZONY", "&e▶ Kliknij, aby włączyć/wyłączyć"],
            actionKey: "toggle_kox",
          },
          {
            slot: 12,
            material: "GOLDEN_APPLE",
            name: "&6&lZłote Jabłko REFIL",
            amount: 2,
            active: true,
            lore: ["&7Szansa: &a0.8%", "&7Status: &aWŁĄCZONY", "&e▶ Kliknij, aby włączyć/wyłączyć"],
            actionKey: "toggle_refil",
          },
          {
            slot: 14,
            material: "ENDER_PEARL",
            name: "&3&lPerła Kresu",
            amount: 1,
            active: true,
            lore: ["&7Szansa: &a1.2%", "&7Status: &aWŁĄCZONY", "&e▶ Kliknij, aby włączyć/wyłączyć"],
            actionKey: "toggle_pearl",
          },
          {
            slot: 15,
            material: "NETHER_STAR",
            name: "&f&lGwiazda Netheru",
            amount: 1,
            enchanted: true,
            active: true,
            lore: ["&7Szansa: &d0.01%", "&7Status: &aWŁĄCZONY", "&e▶ Kliknij, aby włączyć/wyłączyć"],
            actionKey: "toggle_star",
          },
          ...generateGlassBorder(4),
        ],
      },
      // Category: Mnożniki
      {
        id: "drop_boosters",
        title: `&8Mnożniki & Turbodrop`,
        rows: 4,
        parentMenuId: "drop_main",
        categoryName: "Mnożniki",
        triggerCommand: "drop mnozniki",
        items: [
          {
            slot: 11,
            material: "GOLD_BLOCK",
            name: "&6&lMnożnik Rangi VIP (+25%)",
            amount: 1,
            lore: ["&7Status: &aAktywny dla Twojego konta!", "&7Zwiększa drop o 1.25x"],
          },
          {
            slot: 13,
            material: "DIAMOND_BLOCK",
            name: "&b&lMnożnik Rangi SVIP (+50%)",
            amount: 1,
            enchanted: true,
            lore: ["&7Status: &7Kup rangę SVIP na www", "&7Zwiększa drop o 1.50x"],
          },
          {
            slot: 15,
            material: "BEACON",
            name: "&e&lGlobalny Turbodrop (x2)",
            amount: 1,
            enchanted: true,
            lore: ["&7Status: &cNieaktywny", "&7Admin może włączyć komendą /turbodrop"],
          },
          ...generateGlassBorder(4),
        ],
      },
    ];
  }

  // --- 3. KITS / ZESTAWY (Gracz, VIP, SVIP, Sponsor) ---
  if (pName.includes("kit") || summary.includes("kit") || summary.includes("zestaw")) {
    return [
      {
        id: "kits_main",
        title: `&8&lZESTAWY GRACZY: &aWybierz Zestaw`,
        rows: 4,
        categoryName: "Kity",
        triggerCommand: "kit",
        items: [
          {
            slot: 11,
            material: "IRON_SWORD",
            name: "&f&lZestaw: GRACZ",
            amount: 1,
            lore: ["&7Podstawowy zestaw startowy co 24h.", "", "&e▶ Kliknij, aby zobaczyć podgląd i odebrać!"],
            targetMenuId: "kit_player",
            commandOnClick: "/kit gracz",
          },
          {
            slot: 13,
            material: "GOLDEN_SWORD",
            name: "&6&lZestaw: VIP",
            amount: 1,
            enchanted: true,
            lore: ["&7Zestaw żelazno-złoty + koxy co 12h.", "", "&e▶ Kliknij, aby zobaczyć podgląd i odebrać!"],
            targetMenuId: "kit_vip",
            commandOnClick: "/kit vip",
          },
          {
            slot: 15,
            material: "DIAMOND_SWORD",
            name: "&b&lZestaw: SPONSOR / SVIP",
            amount: 1,
            enchanted: true,
            lore: ["&7Diamentowy set 4/3 + miecz 5/2 co 6h.", "", "&e▶ Kliknij, aby zobaczyć podgląd i odebrać!"],
            targetMenuId: "kit_sponsor",
            commandOnClick: "/kit sponsor",
          },
          ...generateGlassBorder(4),
        ],
      },
      {
        id: "kit_player",
        title: `&8Podgląd zestawu: &f&lGRACZ`,
        rows: 3,
        parentMenuId: "kits_main",
        categoryName: "Gracz",
        triggerCommand: "kit gracz",
        items: [
          { slot: 10, material: "IRON_SWORD", name: "&fMiecz Żelazny", amount: 1 },
          { slot: 11, material: "IRON_PICKAXE", name: "&fKilof Żelazny", amount: 1 },
          { slot: 12, material: "COOKED_BEEF", name: "&4Pieczona Wołowina", amount: 16 },
          { slot: 13, material: "OAK_LOG", name: "&6Drewno Dębowe", amount: 32 },
          {
            slot: 16,
            material: "EMERALD",
            name: "&a&lODBIEŻ ZESTAW GRACZ",
            enchanted: true,
            lore: ["&7Kliknij, aby odebrać ten kit."],
            commandOnClick: "/kit odbierz gracz",
          },
          ...generateGlassBorder(3),
        ],
      },
      {
        id: "kit_vip",
        title: `&8Podgląd zestawu: &6&lVIP`,
        rows: 3,
        parentMenuId: "kits_main",
        categoryName: "VIP",
        triggerCommand: "kit vip",
        items: [
          { slot: 10, material: "DIAMOND_SWORD", name: "&bDiamentowy Miecz Ostrość 3", amount: 1, enchanted: true },
          { slot: 11, material: "DIAMOND_PICKAXE", name: "&bDiamentowy Kilof Wydajność 3", amount: 1, enchanted: true },
          { slot: 12, material: "GOLDEN_APPLE", name: "&6Złote Jabłka Refil", amount: 8 },
          { slot: 13, material: "ENDER_PEARL", name: "&3Perły Kresu", amount: 4 },
          {
            slot: 16,
            material: "EMERALD",
            name: "&a&lODBIEŻ ZESTAW VIP",
            enchanted: true,
            lore: ["&7Kliknij, aby odebrać ten kit."],
            commandOnClick: "/kit odbierz vip",
          },
          ...generateGlassBorder(3),
        ],
      },
      {
        id: "kit_sponsor",
        title: `&8Podgląd zestawu: &b&lSPONSOR`,
        rows: 3,
        parentMenuId: "kits_main",
        categoryName: "Sponsor",
        triggerCommand: "kit sponsor",
        items: [
          { slot: 10, material: "NETHERITE_SWORD", name: "&5Netherytowy Miecz 5/2", amount: 1, enchanted: true },
          { slot: 11, material: "NETHERITE_PICKAXE", name: "&5Netherytowy Kilof 5/3/3", amount: 1, enchanted: true },
          { slot: 12, material: "ENCHANTED_GOLDEN_APPLE", name: "&dZłote Jabłko Kox", amount: 2, enchanted: true },
          { slot: 13, material: "ENDER_PEARL", name: "&3Perły Kresu", amount: 8 },
          { slot: 14, material: "TOTEM_OF_UNDYING", name: "&eTotem Nieśmiertelności", amount: 1, enchanted: true },
          {
            slot: 16,
            material: "EMERALD",
            name: "&a&lODBIEŻ ZESTAW SPONSOR",
            enchanted: true,
            lore: ["&7Kliknij, aby odebrać ten kit."],
            commandOnClick: "/kit odbierz sponsor",
          },
          ...generateGlassBorder(3),
        ],
      },
    ];
  }

  // --- 4. DEFAULT CONTROL PANEL (with multi-command tabs) ---
  const cmdItems: GuiMenuItem[] = (project.commands || []).slice(0, 7).map((cmd, idx) => {
    const slot = 10 + idx;
    const materials = ["COMPASS", "NETHER_STAR", "EMERALD", "BOOK", "DIAMOND", "CLOCK", "GOLD_INGOT"];
    return {
      slot,
      material: materials[idx % materials.length],
      name: `&e&l/${cmd.name}`,
      amount: 1,
      enchanted: idx === 0,
      active: true,
      lore: [
        `&7Opis: &f${cmd.description || "Główna funkcja pluginu"}`,
        `&7Użycie: &a${cmd.usage || `/${cmd.name}`}`,
        `&7Uprawnienie: &7${cmd.permission || "brak"}`,
        "",
        "&e▶ Kliknij, aby przetestować akcję",
      ],
      actionKey: `exec_${cmd.name}`,
      commandOnClick: `/${cmd.name}`,
    };
  });

  return [
    {
      id: "main_panel",
      title: `&8Panel sterowania: &a&l${project.pluginName}`,
      rows: 3,
      categoryName: "Menu Główne",
      triggerCommand: project.commands?.[0]?.name || "menu",
      items: [
        ...cmdItems,
        {
          slot: 22,
          material: "BARRIER",
          name: "&c&lZamknij Panel",
          amount: 1,
          lore: ["&7Zamyka okno menu skrzyni."],
          actionKey: "close",
        },
        ...generateGlassBorder(3),
      ],
    },
  ];
}

function generateGlassBorder(rows: number): GuiMenuItem[] {
  const totalSlots = rows * 9;
  const glassItems: GuiMenuItem[] = [];

  for (let s = 0; s < totalSlots; s++) {
    const isEdge = s < 9 || s >= totalSlots - 9 || s % 9 === 0 || s % 9 === 8;
    if (isEdge) {
      glassItems.push({
        slot: s,
        material: "GRAY_STAINED_GLASS_PANE",
        name: "&8-",
        lore: [],
      });
    }
  }

  return glassItems;
}
