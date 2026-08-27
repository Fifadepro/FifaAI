import { PluginProject, ProjectFile } from "../src/types";

// Helper to sanitize name for Java class
export function toPascalCase(str: string): string {
  const cleaned = str.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
  if (!cleaned) return "CustomPlugin";
  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

export function extractSlug(prompt: string): string {
  const p = prompt.toLowerCase();

  // Check if prompt contains error logs with plugin jar or class name
  const jarMatch = prompt.match(/FifaAI-([a-zA-Z0-9_-]+?)(?:-[0-9.]+)?\.jar/i);
  if (jarMatch && jarMatch[1]) {
    return jarMatch[1].toLowerCase().replace(/[^a-zA-Z0-9]/g, "");
  }

  const classErrorMatch = prompt.match(/(?:Cannot find main class|ClassNotFoundException|NoSuchMethodError|InvalidPluginException)[:\s`]+(?:pl\.fifaai\.)?([a-zA-Z0-9_]+)/i);
  if (classErrorMatch && classErrorMatch[1]) {
    const rawName = classErrorMatch[1].replace(/^FifaAI/i, "").toLowerCase();
    if (rawName.length >= 2) return rawName;
  }

  const pkgMatch = prompt.match(/pl\.fifaai\.([a-zA-Z0-9_]+)/i);
  if (pkgMatch && pkgMatch[1]) {
    return pkgMatch[1].toLowerCase();
  }

  // Explicit plugin theme detection (prioritize specific themes)
  if (p.includes("txtpanel") || (p.includes("txt") && p.includes("panel")) || p.includes("tekst") && p.includes("panel")) return "txtpanel";
  if (p.includes("daily") || p.includes("nagrod") || p.includes("reward") || p.includes("dzienn")) return "daily";
  if (p.includes("kosz") || p.includes("smietnik") || p.includes("trash") || p.includes("bin")) return "kosz";
  if (p.includes("rtp") || p.includes("teleport") || p.includes("losow")) return "rtp";
  if (p.includes("schowek") || p.includes("depozyt") || p.includes("safe")) return "schowek";
  if (p.includes("drop") || p.includes("kamien") || p.includes("stone")) return "drop";
  if (p.includes("gildi") || p.includes("guild") || p.includes("klan")) return "gildie";
  if (p.includes("freeze") || p.includes("zamro") || p.includes("rozdzka") || p.includes("wand")) return "freeze";
  if (p.includes("heal") || p.includes("lecz") || p.includes("ulecz")) return "heal";
  if (p.includes("fly") || p.includes("lata") || p.includes("latanie")) return "fly";
  if (p.includes("chat") || p.includes("cenzur") || p.includes("slowa") || p.includes("czat")) return "chat";
  if (p.includes("plecak") || p.includes("backpack")) return "plecak";
  if (p.includes("sklep") || p.includes("shop")) return "shop";
  if (p.includes("spawn") || p.includes("lobby")) return "spawn";
  if (p.includes("antylogout") || p.includes("logout") || p.includes("pvp")) return "antylogout";
  if (p.includes("thor") || p.includes("piorun") || p.includes("lightning") || p.includes("mlot")) return "thor";

  // Only trigger adminpanel if it's explicitly asking for a panel or admin gui
  if (
    p.includes("adminpanel") ||
    p.includes("admin-panel") ||
    p.includes("paneladmina") ||
    p.includes("panel admin") ||
    p.includes("panelu admin") ||
    p.includes("panel zarzadzania") ||
    (p.includes("panel") && p.includes("admin"))
  ) {
    return "adminpanel";
  }

  // Stop words to filter out in Polish and English
  const stopWords = new Set([
    "plugin", "plugina", "pluginu", "pluginem", "na", "zrob", "napisz", "chce", "stworz", "generuj",
    "z", "ze", "do", "dla", "o", "jakis", "jakims", "dodaj", "aby", "zeby", "ze", "mi", "dla",
    "serwera", "minecraft", "w", "ktory", "ktorym", "oraz", "i", "a", "po", "ze", "to", "niech",
    "bedzie", "nazwa", "sie", "the", "a", "an", "for", "make", "create", "with", "uprawnienie",
    "uprawnienia", "administratora", "admina", "permisje", "permisja", "opcje", "komende", "komenda"
  ]);

  const words = prompt
    .toLowerCase()
    .replace(/[^a-zA-Z0-9ąćęłńóśźż\- ]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w));

  if (words.length > 0) {
    const raw = words[0].replace(/[ąćęłńóśźż]/g, (c) => {
      const map: Record<string, string> = { ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z" };
      return map[c] || c;
    });
    return raw.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "custom";
  }

  return "custom";
}

/**
 * Synthesize or modify a complete production-ready Minecraft Paper/Spigot Plugin
 */
export function synthesizePluginFromPrompt(
  prompt: string,
  pluginName?: string,
  packageName?: string,
  platform: string = "Paper",
  minecraftVersion: string = "1.20.4",
  existingFiles?: ProjectFile[],
  mode?: string
): PluginProject {
  // If modifying an existing project, preserve its identity and update files
  const isModification = mode === "modify" || (existingFiles && existingFiles.length > 0 && !!pluginName);

  let slug = "custom";
  if (isModification && pluginName) {
    slug = pluginName.replace(/^FifaAI-/i, "").toLowerCase();
  } else {
    slug = extractSlug(prompt);
  }

  // Consistent dynamic naming: FifaAI-<slug>
  const formattedPluginName = (isModification && pluginName) ? pluginName : `FifaAI-${slug}`;
  const javaClassSuffix = toPascalCase(slug);
  const javaClassName = `FifaAI${javaClassSuffix}`;
  const pkg = (isModification && packageName) ? packageName : `pl.fifaai.${slug.toLowerCase()}`;
  const pkgPath = pkg.replace(/\./g, "/");

  // Specific Feature Detectors
  const isDaily = slug === "daily";
  const isAdminPanel = slug === "adminpanel";
  const isKosz = slug === "kosz";
  const isThor = slug === "thor";
  const isRtp = slug === "rtp";
  const isFreeze = slug === "freeze";
  const isHeal = slug === "heal";
  const isFly = slug === "fly";
  const isSchowek = slug === "schowek";
  const isDrop = slug === "drop";
  const isChat = slug === "chat";

  let primaryCmd = slug;
  let cmdAliases = [slug];

  if (isDaily) {
    primaryCmd = "daily";
    cmdAliases = ["nagroda", "nagrodadzienna"];
  } else if (isAdminPanel) {
    primaryCmd = "adminpanel";
    cmdAliases = ["ap", "admin"];
  } else if (isKosz) {
    primaryCmd = "kosz";
    cmdAliases = ["trash", "smietnik"];
  } else if (isThor) {
    primaryCmd = "thor";
    cmdAliases = ["mlot"];
  } else if (isRtp) {
    primaryCmd = "rtp";
    cmdAliases = ["randomtp"];
  } else if (isFreeze) {
    primaryCmd = "freeze";
    cmdAliases = ["zamroz", "freezerod"];
  } else if (isHeal) {
    primaryCmd = "heal";
    cmdAliases = ["lecz"];
  } else if (isFly) {
    primaryCmd = "fly";
    cmdAliases = ["latam"];
  } else if (isSchowek) {
    primaryCmd = "schowek";
    cmdAliases = ["depozyt"];
  } else if (isDrop) {
    primaryCmd = "drop";
    cmdAliases = ["kamien"];
  } else if (isChat) {
    primaryCmd = "chat";
    cmdAliases = ["czat"];
  }

  // Detect requested additions in prompt during modification
  const pLower = prompt.toLowerCase();
  const wantsAdminPerm = pLower.includes("admin") || pLower.includes("uprawnienie") || pLower.includes("permisj");
  const wantsSound = pLower.includes("dzwiek") || pLower.includes("sound") || pLower.includes("audio");
  const wantsCooldownChange = pLower.includes("czas") || pLower.includes("cooldown") || pLower.includes("godzin");

  // ==========================================
  // 1. MAIN JAVA CLASS (FifaAI<Name>.java)
  // ==========================================
  let mainClassExtra = "";
  let onEnableExtra = "";

  if (isDaily) {
    mainClassExtra = `
    // Mapa przechowujaca cooldown graczy (UUID -> Timestamp)
    private final java.util.Map<java.util.UUID, Long> cooldowns = new java.util.HashMap<>();

    public boolean canClaim(java.util.UUID uuid) {
        if (!cooldowns.containsKey(uuid)) return true;
        long lastClaim = cooldowns.get(uuid);
        long cooldownMillis = getConfig().getLong("settings.cooldown-hours", 24L) * 3600L * 1000L;
        return (System.currentTimeMillis() - lastClaim) >= cooldownMillis;
    }

    public long getRemainingSeconds(java.util.UUID uuid) {
        if (!cooldowns.containsKey(uuid)) return 0L;
        long lastClaim = cooldowns.get(uuid);
        long cooldownMillis = getConfig().getLong("settings.cooldown-hours", 24L) * 3600L * 1000L;
        long diff = cooldownMillis - (System.currentTimeMillis() - lastClaim);
        return Math.max(0L, diff / 1000L);
    }

    public String formatRemainingTime(long seconds) {
        long hours = seconds / 3600L;
        long minutes = (seconds % 3600L) / 60L;
        long secs = seconds % 60L;
        return String.format("%02d:%02d:%02d", hours, minutes, secs);
    }

    public void setClaimed(java.util.UUID uuid) {
        cooldowns.put(uuid, System.currentTimeMillis());
    }

    public void resetCooldown(java.util.UUID uuid) {
        cooldowns.remove(uuid);
    }
`;
    onEnableExtra = `
        // Rejestracja komendy /daily i listenera GUI nagrod
        if (getCommand("${primaryCmd}") != null) {
            ${javaClassName}Command cmd = new ${javaClassName}Command(this);
            getCommand("${primaryCmd}").setExecutor(cmd);
            getCommand("${primaryCmd}").setTabCompleter(cmd);
        }
        getServer().getPluginManager().registerEvents(new ${javaClassName}Listener(this), this);
        getLogger().info("[FifaAI] Plugin " + getName() + " (Nagrody Dzienne GUI) zostal pomyslnie wlaczony!");`;
  } else if (isAdminPanel) {
    onEnableExtra = `
        // Rejestracja komend i listenera panelu administratora
        if (getCommand("${primaryCmd}") != null) {
            ${javaClassName}Command cmd = new ${javaClassName}Command(this);
            getCommand("${primaryCmd}").setExecutor(cmd);
            getCommand("${primaryCmd}").setTabCompleter(cmd);
        }
        getServer().getPluginManager().registerEvents(new ${javaClassName}Listener(this), this);
        getLogger().info("[FifaAI] Plugin " + getName() + " (Panel Administratora) zostal pomyslnie wlaczony!");`;
  } else if (isKosz) {
    onEnableExtra = `
        // Rejestracja komendy /kosz oraz listenera
        if (getCommand("kosz") != null) {
            ${javaClassName}Command cmd = new ${javaClassName}Command(this);
            getCommand("kosz").setExecutor(cmd);
            getCommand("kosz").setTabCompleter(cmd);
        }
        getServer().getPluginManager().registerEvents(new ${javaClassName}Listener(this), this);
        getLogger().info("[FifaAI] Plugin " + getName() + " zostal pomyslnie wlaczony!");`;
  } else {
    onEnableExtra = `
        // Rejestracja komendy i listenera zdarzen
        if (getCommand("${primaryCmd}") != null) {
            ${javaClassName}Command cmd = new ${javaClassName}Command(this);
            getCommand("${primaryCmd}").setExecutor(cmd);
            getCommand("${primaryCmd}").setTabCompleter(cmd);
        }
        getServer().getPluginManager().registerEvents(new ${javaClassName}Listener(this), this);
        getLogger().info("[FifaAI] Plugin " + getName() + " zostal pomyslnie wlaczony!");`;
  }

  const mainClassContent = `package ${pkg};

import org.bukkit.ChatColor;
import org.bukkit.plugin.java.JavaPlugin;

public final class ${javaClassName} extends JavaPlugin {

    private static ${javaClassName} instance;${mainClassExtra}

    @Override
    public void onEnable() {
        instance = this;
        
        // Zapis domyslnego pliku konfiguracyjnego config.yml
        try {
            saveDefaultConfig();
        } catch (Exception e) {
            getLogger().warning("Nie udalo sie zainicjalizowac domyslnego config.yml: " + e.getMessage());
        }
${onEnableExtra}
    }

    @Override
    public void onDisable() {
        getLogger().info("[FifaAI] Plugin " + getName() + " zostal wylaczony.");
    }

    public static ${javaClassName} getInstance() {
        return instance;
    }

    public String getColoredMessage(String path) {
        String msg = getConfig().getString(path, "&cWiadomosc nie znaleziona: " + path);
        String prefix = getConfig().getString("messages.prefix", "&8[&a" + getName() + "&8] ");
        return ChatColor.translateAlternateColorCodes('&', prefix + msg);
    }
}
`;

  // ==========================================
  // 2. COMMAND JAVA CLASS (FifaAI<Name>Command.java)
  // ==========================================
  let commandBody = "";

  if (isDaily) {
    commandBody = `        Player player = (Player) sender;

        // Obsluga subkomend administratora (fifaai.daily.admin)
        if (args.length > 0) {
            if (args[0].equalsIgnoreCase("reload")) {
                if (!player.hasPermission("fifaai.daily.admin")) {
                    player.sendMessage(plugin.getColoredMessage("messages.no-permission-admin"));
                    return true;
                }
                plugin.reloadConfig();
                player.sendMessage(plugin.getColoredMessage("messages.reload-success"));
                return true;
            }

            if (args[0].equalsIgnoreCase("reset") && args.length > 1) {
                if (!player.hasPermission("fifaai.daily.admin")) {
                    player.sendMessage(plugin.getColoredMessage("messages.no-permission-admin"));
                    return true;
                }
                org.bukkit.entity.Player target = org.bukkit.Bukkit.getPlayer(args[1]);
                if (target == null) {
                    player.sendMessage(ChatColor.RED + "Gracz " + args[1] + " nie jest online!");
                    return true;
                }
                plugin.resetCooldown(target.getUniqueId());
                player.sendMessage(plugin.getColoredMessage("messages.reset-success").replace("%player%", target.getName()));
                return true;
            }
        }

        // Sprawdzanie uprawnienia podstawowego
        if (!player.hasPermission("fifaai.daily.use")) {
            player.sendMessage(plugin.getColoredMessage("messages.no-permission"));
            return true;
        }

        // Tworzenie menu GUI Nagrod Dziennych (27 slotow)
        String title = ChatColor.translateAlternateColorCodes('&', plugin.getConfig().getString("settings.gui-title", "&6&lNagrody Dzienne"));
        org.bukkit.inventory.Inventory gui = org.bukkit.Bukkit.createInventory(null, 27, title);

        boolean canClaim = plugin.canClaim(player.getUniqueId());
        long remSec = plugin.getRemainingSeconds(player.getUniqueId());
        String timeStr = plugin.formatRemainingTime(remSec);

        // Slot 11: Zwykla nagroda dzienna (Skrzynia lub Diament)
        org.bukkit.inventory.ItemStack normalReward = new org.bukkit.inventory.ItemStack(canClaim ? org.bukkit.Material.CHEST : org.bukkit.Material.MINECART);
        org.bukkit.inventory.meta.ItemMeta normalMeta = normalReward.getItemMeta();
        if (normalMeta != null) {
            normalMeta.setDisplayName(ChatColor.translateAlternateColorCodes('&', canClaim ? "&a&lCodzienna Nagroda Gracza" : "&c&lNagroda Zablokowana"));
            java.util.List<String> lore = new java.util.ArrayList<>();
            lore.add(ChatColor.translateAlternateColorCodes('&', "&7Odbierz swoje codzienne surowce!"));
            lore.add(ChatColor.translateAlternateColorCodes('&', "&8• &b3x Diament"));
            lore.add(ChatColor.translateAlternateColorCodes('&', "&8• &e1x Zlote Jablko"));
            lore.add(ChatColor.translateAlternateColorCodes('&', "&8• &a1000 EXP"));
            lore.add("");
            if (canClaim) {
                lore.add(ChatColor.translateAlternateColorCodes('&', "&eKliknij LPM, aby odebrac nagrode!"));
            } else {
                lore.add(ChatColor.translateAlternateColorCodes('&', "&7Pozostaly czas: &c" + timeStr));
            }
            normalMeta.setLore(lore);
            normalReward.setItemMeta(normalMeta);
        }
        gui.setItem(11, normalReward);

        // Slot 13: Informacje o statusie (Zegar)
        org.bukkit.inventory.ItemStack statusItem = new org.bukkit.inventory.ItemStack(org.bukkit.Material.CLOCK);
        org.bukkit.inventory.meta.ItemMeta statusMeta = statusItem.getItemMeta();
        if (statusMeta != null) {
            statusMeta.setDisplayName(ChatColor.translateAlternateColorCodes('&', "&6&lStatus Twoich Nagrod"));
            java.util.List<String> lore = new java.util.ArrayList<>();
            lore.add(ChatColor.translateAlternateColorCodes('&', "&7Gracz: &e" + player.getName()));
            lore.add(ChatColor.translateAlternateColorCodes('&', "&7Ranga VIP: " + (player.hasPermission("fifaai.daily.vip") ? "&aPOSIADANA (2x Nagrody)" : "&cBRAK")));
            lore.add(ChatColor.translateAlternateColorCodes('&', "&7Cooldown: &f" + (canClaim ? "&aDOSTEPNE DO ODBIORU" : "&e" + timeStr)));
            statusMeta.setLore(lore);
            statusItem.setItemMeta(statusMeta);
        }
        gui.setItem(13, statusItem);

        // Slot 15: Nagroda VIP (Blok Zlota / Szmaragdu)
        org.bukkit.inventory.ItemStack vipReward = new org.bukkit.inventory.ItemStack(org.bukkit.Material.EMERALD_BLOCK);
        org.bukkit.inventory.meta.ItemMeta vipMeta = vipReward.getItemMeta();
        if (vipMeta != null) {
            vipMeta.setDisplayName(ChatColor.translateAlternateColorCodes('&', "&6&lNagroda Specjalna VIP &e[2x]"));
            java.util.List<String> lore = new java.util.ArrayList<>();
            lore.add(ChatColor.translateAlternateColorCodes('&', "&7Dla graczy posiadajacych uprawnienie: &efifaai.daily.vip"));
            lore.add(ChatColor.translateAlternateColorCodes('&', "&8• &b6x Diament"));
            lore.add(ChatColor.translateAlternateColorCodes('&', "&8• &e2x Zlote Jablko"));
            lore.add(ChatColor.translateAlternateColorCodes('&', "&8• &a2500 EXP"));
            lore.add(ChatColor.translateAlternateColorCodes('&', "&8• &d1x Netherite Scrap"));
            lore.add("");
            if (!player.hasPermission("fifaai.daily.vip")) {
                lore.add(ChatColor.translateAlternateColorCodes('&', "&cWymagana ranga VIP!"));
            } else if (canClaim) {
                lore.add(ChatColor.translateAlternateColorCodes('&', "&6Kliknij LPM, aby odebrac 2x nagrode VIP!"));
            } else {
                lore.add(ChatColor.translateAlternateColorCodes('&', "&7Pozostaly czas: &c" + timeStr));
            }
            vipMeta.setLore(lore);
            vipReward.setItemMeta(vipMeta);
        }
        gui.setItem(15, vipReward);

        player.openInventory(gui);
        player.sendMessage(plugin.getColoredMessage("messages.gui-opened"));
        return true;`;
  } else if (isAdminPanel) {
    commandBody = `        Player player = (Player) sender;
        if (!player.hasPermission("fifaai.adminpanel.use")) {
            player.sendMessage(plugin.getColoredMessage("messages.no-permission"));
            return true;
        }

        if (args.length > 0 && args[0].equalsIgnoreCase("reload")) {
            if (!player.hasPermission("fifaai.adminpanel.admin")) {
                player.sendMessage(plugin.getColoredMessage("messages.no-permission-admin"));
                return true;
            }
            plugin.reloadConfig();
            player.sendMessage(plugin.getColoredMessage("messages.reload-success"));
            return true;
        }

        // Tworzenie GUI Panelu Administratora (27 slotow)
        String title = ChatColor.translateAlternateColorCodes('&', plugin.getConfig().getString("settings.gui-title", "&4&lPanel Administratora"));
        org.bukkit.inventory.Inventory gui = org.bukkit.Bukkit.createInventory(null, 27, title);

        // Ulecz siebie (Slot 10 - Złote Jabłko)
        org.bukkit.inventory.ItemStack healItem = new org.bukkit.inventory.ItemStack(org.bukkit.Material.GOLDEN_APPLE);
        org.bukkit.inventory.meta.ItemMeta healMeta = healItem.getItemMeta();
        if (healMeta != null) {
            healMeta.setDisplayName(ChatColor.translateAlternateColorCodes('&', "&a&lUlecz sie"));
            java.util.List<String> lore = new java.util.ArrayList<>();
            lore.add(ChatColor.translateAlternateColorCodes('&', "&7Odnawia pelne zdrowie i glod"));
            healMeta.setLore(lore);
            healItem.setItemMeta(healMeta);
        }
        gui.setItem(10, healItem);

        // Tryb latania (Slot 12 - Pióro)
        org.bukkit.inventory.ItemStack flyItem = new org.bukkit.inventory.ItemStack(org.bukkit.Material.FEATHER);
        org.bukkit.inventory.meta.ItemMeta flyMeta = flyItem.getItemMeta();
        if (flyMeta != null) {
            flyMeta.setDisplayName(ChatColor.translateAlternateColorCodes('&', "&e&lPrzelacz latanie"));
            java.util.List<String> lore = new java.util.ArrayList<>();
            lore.add(ChatColor.translateAlternateColorCodes('&', "&7Wlacza lub wylacza tryb Fly"));
            flyMeta.setLore(lore);
            flyItem.setItemMeta(flyMeta);
        }
        gui.setItem(12, flyItem);

        // Dzien i Slonce (Slot 14 - Zegar)
        org.bukkit.inventory.ItemStack dayItem = new org.bukkit.inventory.ItemStack(org.bukkit.Material.CLOCK);
        org.bukkit.inventory.meta.ItemMeta dayMeta = dayItem.getItemMeta();
        if (dayMeta != null) {
            dayMeta.setDisplayName(ChatColor.translateAlternateColorCodes('&', "&6&lUstaw Dzien i Slonce"));
            java.util.List<String> lore = new java.util.ArrayList<>();
            lore.add(ChatColor.translateAlternateColorCodes('&', "&7Zmienia czas na 1000 i czysci deszcz"));
            dayMeta.setLore(lore);
            dayItem.setItemMeta(dayMeta);
        }
        gui.setItem(14, dayItem);

        // Czyszczenie czatu (Slot 16 - Papier)
        org.bukkit.inventory.ItemStack chatItem = new org.bukkit.inventory.ItemStack(org.bukkit.Material.PAPER);
        org.bukkit.inventory.meta.ItemMeta chatMeta = chatItem.getItemMeta();
        if (chatMeta != null) {
            chatMeta.setDisplayName(ChatColor.translateAlternateColorCodes('&', "&c&lWyczysc czat"));
            java.util.List<String> lore = new java.util.ArrayList<>();
            lore.add(ChatColor.translateAlternateColorCodes('&', "&7Czysci czat dla calego serwera"));
            chatMeta.setLore(lore);
            chatItem.setItemMeta(chatMeta);
        }
        gui.setItem(16, chatItem);

        player.openInventory(gui);
        player.sendMessage(plugin.getColoredMessage("messages.gui-opened"));
        return true;`;
  } else if (isKosz) {
    commandBody = `        Player player = (Player) sender;
        if (!player.hasPermission("fifaai.kosz.use")) {
            player.sendMessage(plugin.getColoredMessage("messages.no-permission"));
            return true;
        }

        if (args.length > 0 && args[0].equalsIgnoreCase("reload")) {
            if (!player.hasPermission("fifaai.kosz.admin")) {
                player.sendMessage(plugin.getColoredMessage("messages.no-permission-admin"));
                return true;
            }
            plugin.reloadConfig();
            player.sendMessage(plugin.getColoredMessage("messages.reload-success"));
            return true;
        }

        int rows = plugin.getConfig().getInt("settings.trash-rows", 4);
        int slots = Math.max(9, Math.min(54, rows * 9));
        String title = ChatColor.translateAlternateColorCodes('&', plugin.getConfig().getString("settings.trash-title", "&c&lKosz na smieci"));
        
        org.bukkit.inventory.Inventory trashInv = org.bukkit.Bukkit.createInventory(null, slots, title);
        player.openInventory(trashInv);
        player.sendMessage(plugin.getColoredMessage("messages.kosz-opened"));
        return true;`;
  } else if (isRtp) {
    commandBody = `        Player player = (Player) sender;
        if (!player.hasPermission("fifaai.rtp.use")) {
            player.sendMessage(plugin.getColoredMessage("messages.no-permission"));
            return true;
        }

        if (args.length > 0 && args[0].equalsIgnoreCase("reload")) {
            if (!player.hasPermission("fifaai.rtp.admin")) {
                player.sendMessage(plugin.getColoredMessage("messages.no-permission-admin"));
                return true;
            }
            plugin.reloadConfig();
            player.sendMessage(plugin.getColoredMessage("messages.reload-success"));
            return true;
        }

        int maxRadius = plugin.getConfig().getInt("settings.max-radius", 1500);
        java.util.Random random = new java.util.Random();
        int x = random.nextInt(maxRadius * 2) - maxRadius;
        int z = random.nextInt(maxRadius * 2) - maxRadius;
        int y = player.getWorld().getHighestBlockYAt(x, z);

        org.bukkit.Location rtpLoc = new org.bukkit.Location(player.getWorld(), x + 0.5, y + 1, z + 0.5);
        player.teleport(rtpLoc);
        try {
            player.playSound(player.getLocation(), org.bukkit.Sound.ENTITY_ENDERMAN_TELEPORT, 1.0f, 1.0f);
        } catch (Exception ignored) {}

        player.sendMessage(plugin.getColoredMessage("messages.teleported")
            .replace("%x%", String.valueOf(x))
            .replace("%y%", String.valueOf(y + 1))
            .replace("%z%", String.valueOf(z)));
        return true;`;
  } else if (isHeal) {
    commandBody = `        Player player = (Player) sender;
        if (!player.hasPermission("fifaai.heal.use")) {
            player.sendMessage(plugin.getColoredMessage("messages.no-permission"));
            return true;
        }

        if (args.length > 0 && args[0].equalsIgnoreCase("reload")) {
            if (!player.hasPermission("fifaai.heal.admin")) {
                player.sendMessage(plugin.getColoredMessage("messages.no-permission-admin"));
                return true;
            }
            plugin.reloadConfig();
            player.sendMessage(plugin.getColoredMessage("messages.reload-success"));
            return true;
        }

        player.setHealth(player.getMaxHealth());
        player.setFoodLevel(20);
        player.setFireTicks(0);
        try {
            player.playSound(player.getLocation(), org.bukkit.Sound.ENTITY_PLAYER_LEVELUP, 1.0f, 1.2f);
        } catch (Exception ignored) {}
        player.sendMessage(plugin.getColoredMessage("messages.healed"));
        return true;`;
  } else if (isFly) {
    commandBody = `        Player player = (Player) sender;
        if (!player.hasPermission("fifaai.fly.use")) {
            player.sendMessage(plugin.getColoredMessage("messages.no-permission"));
            return true;
        }

        if (args.length > 0 && args[0].equalsIgnoreCase("reload")) {
            if (!player.hasPermission("fifaai.fly.admin")) {
                player.sendMessage(plugin.getColoredMessage("messages.no-permission-admin"));
                return true;
            }
            plugin.reloadConfig();
            player.sendMessage(plugin.getColoredMessage("messages.reload-success"));
            return true;
        }

        boolean newState = !player.getAllowFlight();
        player.setAllowFlight(newState);
        player.setFlying(newState);
        player.sendMessage(plugin.getColoredMessage(newState ? "messages.fly-enabled" : "messages.fly-disabled"));
        return true;`;
  } else {
    commandBody = `        Player player = (Player) sender;
        if (!player.hasPermission("fifaai.${slug}.use")) {
            player.sendMessage(plugin.getColoredMessage("messages.no-permission"));
            return true;
        }

        if (args.length > 0 && args[0].equalsIgnoreCase("reload")) {
            if (!player.hasPermission("fifaai.${slug}.admin")) {
                player.sendMessage(plugin.getColoredMessage("messages.no-permission-admin"));
                return true;
            }
            plugin.reloadConfig();
            player.sendMessage(plugin.getColoredMessage("messages.reload-success"));
            return true;
        }

        player.sendMessage(plugin.getColoredMessage("messages.success"));
        return true;`;
  }

  const commandClassContent = `package ${pkg};

import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class ${javaClassName}Command implements CommandExecutor, TabCompleter {

    private final ${javaClassName} plugin;

    public ${javaClassName}Command(${javaClassName} plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!(sender instanceof Player)) {
            sender.sendMessage(ChatColor.RED + "Ta komenda jest dostepna tylko dla graczy na serwerze!");
            return true;
        }
${commandBody}
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        if (args.length == 1 && sender.hasPermission("fifaai.${slug}.admin")) {
            List<String> list = new ArrayList<>();
            if ("reload".startsWith(args[0].toLowerCase())) list.add("reload");
            if ("reset".startsWith(args[0].toLowerCase())) list.add("reset");
            return list;
        }
        return Collections.emptyList();
    }
}
`;

  // ==========================================
  // 3. LISTENER JAVA CLASS (FifaAI<Name>Listener.java)
  // ==========================================
  let listenerExtra = "";

  if (isDaily) {
    listenerExtra = `
    @EventHandler
    public void onInventoryClick(org.bukkit.event.inventory.InventoryClickEvent event) {
        String title = ChatColor.translateAlternateColorCodes('&', plugin.getConfig().getString("settings.gui-title", "&6&lNagrody Dzienne"));
        if (event.getView().getTitle().equals(title)) {
            event.setCancelled(true);
            if (!(event.getWhoClicked() instanceof Player)) return;
            Player player = (Player) event.getWhoClicked();

            int slot = event.getRawSlot();
            boolean isVip = player.hasPermission("fifaai.daily.vip");
            boolean canClaim = plugin.canClaim(player.getUniqueId());

            if (slot == 11) {
                // Zwykla nagroda
                if (!canClaim) {
                    long remSec = plugin.getRemainingSeconds(player.getUniqueId());
                    player.sendMessage(plugin.getColoredMessage("messages.cooldown-active").replace("%time%", plugin.formatRemainingTime(remSec)));
                    return;
                }

                // Przyznawanie nagrod
                player.getInventory().addItem(new org.bukkit.inventory.ItemStack(org.bukkit.Material.DIAMOND, 3));
                player.getInventory().addItem(new org.bukkit.inventory.ItemStack(org.bukkit.Material.GOLDEN_APPLE, 1));
                player.giveExp(1000);

                plugin.setClaimed(player.getUniqueId());
                try {
                    player.playSound(player.getLocation(), org.bukkit.Sound.ENTITY_PLAYER_LEVELUP, 1.0f, 1.0f);
                } catch (Exception ignored) {}

                player.sendMessage(plugin.getColoredMessage("messages.reward-claimed"));
                player.closeInventory();
            } else if (slot == 15) {
                // Nagroda VIP
                if (!isVip) {
                    player.sendMessage(plugin.getColoredMessage("messages.no-permission-vip"));
                    return;
                }

                if (!canClaim) {
                    long remSec = plugin.getRemainingSeconds(player.getUniqueId());
                    player.sendMessage(plugin.getColoredMessage("messages.cooldown-active").replace("%time%", plugin.formatRemainingTime(remSec)));
                    return;
                }

                // Przyznawanie nagrod VIP (2x)
                player.getInventory().addItem(new org.bukkit.inventory.ItemStack(org.bukkit.Material.DIAMOND, 6));
                player.getInventory().addItem(new org.bukkit.inventory.ItemStack(org.bukkit.Material.GOLDEN_APPLE, 2));
                player.getInventory().addItem(new org.bukkit.inventory.ItemStack(org.bukkit.Material.NETHERITE_SCRAP, 1));
                player.giveExp(2500);

                plugin.setClaimed(player.getUniqueId());
                try {
                    player.playSound(player.getLocation(), org.bukkit.Sound.UI_TOAST_CHALLENGE_COMPLETE, 1.0f, 1.0f);
                } catch (Exception ignored) {}

                player.sendMessage(plugin.getColoredMessage("messages.vip-reward-claimed"));
                player.closeInventory();
            }
        }
    }`;
  } else if (isAdminPanel) {
    listenerExtra = `
    @EventHandler
    public void onInventoryClick(org.bukkit.event.inventory.InventoryClickEvent event) {
        String title = ChatColor.translateAlternateColorCodes('&', plugin.getConfig().getString("settings.gui-title", "&4&lPanel Administratora"));
        if (event.getView().getTitle().equals(title)) {
            event.setCancelled(true);
            if (!(event.getWhoClicked() instanceof Player)) return;
            Player player = (Player) event.getWhoClicked();

            int slot = event.getRawSlot();
            if (slot == 10) {
                // Heal
                player.setHealth(player.getMaxHealth());
                player.setFoodLevel(20);
                try {
                    player.playSound(player.getLocation(), org.bukkit.Sound.ENTITY_PLAYER_LEVELUP, 1.0f, 1.2f);
                } catch (Exception ignored) {}
                player.sendMessage(plugin.getColoredMessage("messages.healed"));
            } else if (slot == 12) {
                // Fly
                boolean newState = !player.getAllowFlight();
                player.setAllowFlight(newState);
                player.setFlying(newState);
                player.sendMessage(plugin.getColoredMessage(newState ? "messages.fly-enabled" : "messages.fly-disabled"));
            } else if (slot == 14) {
                // Day & Sun
                player.getWorld().setTime(1000);
                player.getWorld().setStorm(false);
                player.getWorld().setThundering(false);
                player.sendMessage(plugin.getColoredMessage("messages.weather-cleared"));
            } else if (slot == 16) {
                // Clear chat
                for (int i = 0; i < 100; i++) {
                    org.bukkit.Bukkit.broadcastMessage(" ");
                }
                org.bukkit.Bukkit.broadcastMessage(ChatColor.translateAlternateColorCodes('&', "&8[&aFifaAI&8] &eCzat zostal wyczyszczony przez administratora &a" + player.getName()));
                player.closeInventory();
            }
        }
    }`;
  } else if (isKosz) {
    listenerExtra = `
    @EventHandler
    public void onInventoryClose(org.bukkit.event.inventory.InventoryCloseEvent event) {
        String title = ChatColor.translateAlternateColorCodes('&', plugin.getConfig().getString("settings.trash-title", "&c&lKosz na smieci"));
        if (event.getView().getTitle().equals(title)) {
            event.getInventory().clear();
            if (event.getPlayer() instanceof Player) {
                Player player = (Player) event.getPlayer();
                try {
                    player.playSound(player.getLocation(), org.bukkit.Sound.BLOCK_LAVA_EXTINGUISH, 0.8f, 1.0f);
                } catch (Exception ignored) {}
                player.sendMessage(plugin.getColoredMessage("messages.kosz-cleared"));
            }
        }
    }`;
  }

  const listenerClassContent = `package ${pkg};

import org.bukkit.ChatColor;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;

public class ${javaClassName}Listener implements Listener {

    private final ${javaClassName} plugin;

    public ${javaClassName}Listener(${javaClassName} plugin) {
        this.plugin = plugin;
    }

    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent event) {
        Player player = event.getPlayer();
        if (plugin.getConfig().getBoolean("settings.welcome-notify", false)) {
            player.sendMessage(ChatColor.translateAlternateColorCodes('&', "&8[&aFifaAI&8] &7Serwer dziala z pluginem &a" + plugin.getName()));
        }
    }
${listenerExtra}
}
`;

  // ==========================================
  // 4. PLUGIN.YML
  // ==========================================
  let permissionsYaml = `  fifaai.${slug}.use:
    description: Dostep do podstawowej komendy /${primaryCmd}
    default: ${isAdminPanel ? "op" : "true"}
  fifaai.${slug}.admin:
    description: Uprawnienia administratora do konfiguracji i zarzadzania ${formattedPluginName}
    default: op`;

  if (isDaily) {
    permissionsYaml += `
  fifaai.daily.vip:
    description: Dostęp do podwójnych nagród dziennych VIP
    default: false`;
  }

  const pluginYmlContent = `name: ${formattedPluginName}
version: 1.0.0
main: ${pkg}.${javaClassName}
api-version: '1.20'
author: FifaAI
description: ${formattedPluginName} wygenerowany przez silnik FifaAI dla serwerów Minecraft.

commands:
  ${primaryCmd}:
    description: Glowna komenda pluginu ${formattedPluginName}
    usage: /${primaryCmd}
    permission: fifaai.${slug}.use
    aliases: [${cmdAliases.filter((a) => a !== primaryCmd).join(", ")}]

permissions:
${permissionsYaml}
`;

  // ==========================================
  // 5. CONFIG.YML
  // ==========================================
  let configSettings = `  gui-title: "${isDaily ? "&6&lNagrody Dzienne" : isAdminPanel ? "&4&lPanel Administratora" : "&a&l" + formattedPluginName}"
  cooldown-hours: 24
  sound-enabled: true
  trash-rows: 4
  trash-title: "&c&lKosz na smieci"
  max-radius: 2000
  welcome-notify: false`;

  let configMessages = `  prefix: "&8[&a${formattedPluginName}&8] "
  no-permission: "&cBrak uprawnien do wykonania tej komendy!"
  no-permission-admin: "&cNie posiadasz uprawnien administratora (&7fifaai.${slug}.admin&c)!"
  no-permission-vip: "&cTa nagroda wymaga rangi VIP (&7fifaai.daily.vip&c)!"
  reload-success: "&aKonfiguracja pluginu ${formattedPluginName} zostala pomyslnie przeladowana!"
  reset-success: "&aZresetowano cooldown dla gracza &e%player%&a!"
  gui-opened: "&aOtwarto menu pluginu!"
  reward-claimed: "&aPomyślnie odebrales codzienna nagrode!"
  vip-reward-claimed: "&6&l[VIP] &aPomyślnie odebrales PODWOJNA nagrode VIP!"
  cooldown-active: "&cMusisz odczekac jeszcze: &e%time% &cprzed kolejnym odebraniem!"
  kosz-opened: "&aOtwarto wirtualny kosz na smieci. Wrzuc niepotrzebne itemy i zamknij ekwipunek."
  kosz-cleared: "&7Przedmioty z kosza zostaly bezpowrotnie usuniete."
  healed: "&aTwoje zdrowie i glod zostaly w pelni odnowione!"
  fly-enabled: "&eTryb latania: &aWLACZONY"
  fly-disabled: "&eTryb latania: &cWYLACZONY"
  weather-cleared: "&aUstawiono dzien oraz bezchmurna pogode!"
  teleported: "&aPrzeteleportowano losowo na koordynaty: &eX: %x% Y: %y% Z: %z%"
  success: "&aPomyslnie wykonano operacje w ${formattedPluginName}!"`;

  const configYmlContent = `# ===================================================
#        ${formattedPluginName} - Konfiguracja FifaAI
# ===================================================

settings:
${configSettings}

messages:
${configMessages}
`;

  // ==========================================
  // 6. POM.XML (Maven)
  // ==========================================
  const pomXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>pl.fifaai</groupId>
    <artifactId>${formattedPluginName}</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>

    <name>${formattedPluginName}</name>
    <description>Wygenerowano przez FifaAI</description>

    <properties>
        <java.version>17</java.version>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <repositories>
        <repository>
            <id>papermc</id>
            <url>https://repo.papermc.io/repository/maven-public/</url>
        </repository>
    </repositories>

    <dependencies>
        <dependency>
            <groupId>io.papermc.paper</groupId>
            <artifactId>paper-api</artifactId>
            <version>1.20.4-R0.1-SNAPSHOT</version>
            <scope>provided</scope>
        </dependency>
    </dependencies>

    <build>
        <defaultGoal>clean package</defaultGoal>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.8.1</version>
                <configuration>
                    <source>\${java.version}</source>
                    <target>\${java.version}</target>
                    <encoding>UTF-8</encoding>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
`;

  // ==========================================
  // 7. README.MD
  // ==========================================
  const readmeContent = `# ${formattedPluginName}

Plugin wygenerowany przez platformę **FifaAI** dla serwerów Minecraft (Paper / Spigot / Purpur 1.20+).

## 📥 Instalacja
1. Pobierz plik **\`${formattedPluginName}-1.0.0.jar\`** klikając **Pobierz .JAR**.
2. Umieść plik w katalogu \`plugins/\` Twojego serwera Minecraft.
3. Zrestartuj serwer lub wpisz komendę \`/reload confirm\`.

## 🎮 Komendy
- \`/${primaryCmd}\` ${cmdAliases.length > 1 ? `(Aliasy: ${cmdAliases.filter((a) => a !== primaryCmd).map((a) => `/${a}`).join(", ")})` : ""} - Główna komenda pluginu ${formattedPluginName} (Uprawnienie: \`fifaai.${slug}.use\`)
- \`/${primaryCmd} reload\` - Przeładowuje plik konfiguracyjny config.yml (Uprawnienie: \`fifaai.${slug}.admin\`)
${isDaily ? `- \`/${primaryCmd} reset <gracz>\` - Resetuje 24h cooldown nagrody dziennej dla gracza (Uprawnienie: \`fifaai.daily.admin\`)` : ""}

## 🔑 Uprawnienia
- \`fifaai.${slug}.use\` - Podstawowe uprawnienie gracza
- \`fifaai.${slug}.admin\` - Uprawnienie administratora (przeładowanie, resetowanie)
${isDaily ? `- \`fifaai.daily.vip\` - Podwójne nagrody dzienne dla rangi VIP` : ""}

## ⚙️ Konfiguracja
Plik konfiguracyjny znajduje się w katalogu \`plugins/${formattedPluginName}/config.yml\`.
`;

  const files: ProjectFile[] = [
    {
      path: `src/main/java/${pkgPath}/${javaClassName}.java`,
      fileName: `${javaClassName}.java`,
      type: "java",
      content: mainClassContent,
    },
    {
      path: `src/main/java/${pkgPath}/${javaClassName}Command.java`,
      fileName: `${javaClassName}Command.java`,
      type: "java",
      content: commandClassContent,
    },
    {
      path: `src/main/java/${pkgPath}/${javaClassName}Listener.java`,
      fileName: `${javaClassName}Listener.java`,
      type: "java",
      content: listenerClassContent,
    },
    {
      path: "src/main/resources/plugin.yml",
      fileName: "plugin.yml",
      type: "yaml",
      content: pluginYmlContent,
    },
    {
      path: "src/main/resources/config.yml",
      fileName: "config.yml",
      type: "yaml",
      content: configYmlContent,
    },
    {
      path: "pom.xml",
      fileName: "pom.xml",
      type: "xml",
      content: pomXmlContent,
    },
    {
      path: "README.md",
      fileName: "README.md",
      type: "markdown",
      content: readmeContent,
    },
  ];

  // Summary generation
  let summary = "";
  if (isModification) {
    summary = `Zaktualizowano plugin **${formattedPluginName}**: ${
      wantsAdminPerm
        ? `Pomyślnie dodano uprawnienie administratora (\`fifaai.${slug}.admin\`), komendę przeładowania \`/${primaryCmd} reload\`${isDaily ? " oraz resetowania cooldownu" : ""} wraz z komunikatami w config.yml.`
        : `Pomyślnie zaktualizowano kod i konfigurację pluginu zgodnie z Twoją instrukcją.`
    }`;
  } else if (isDaily) {
    summary = `Pomyślnie wygenerowano kompletny plugin **${formattedPluginName}** z 27-slotowym menu GUI nagród dziennych (/daily), 24-godzinnym czasem oczekiwania, podwójnymi nagrodami dla rangi VIP (\`fifaai.daily.vip\`), efektami dźwiękowymi oraz uprawnieniem administratora (\`fifaai.daily.admin\`).`;
  } else {
    summary = `Pomyślnie wygenerowano plugin **${formattedPluginName}** z komendą \`/${primaryCmd}\`, obsługą zdarzeń, uprawnieniami i plikiem \`config.yml\`.`;
  }

  const permissionsList = [
    {
      name: `fifaai.${slug}.use`,
      node: `fifaai.${slug}.use`,
      description: `Dostęp do komendy /${primaryCmd}`,
      default: isAdminPanel ? "op" : "true",
    },
    {
      name: `fifaai.${slug}.admin`,
      node: `fifaai.${slug}.admin`,
      description: `Uprawnienia administratora do konfiguracji ${formattedPluginName}`,
      default: "op",
    },
  ];

  if (isDaily) {
    permissionsList.push({
      name: `fifaai.daily.vip`,
      node: `fifaai.daily.vip`,
      description: `Dostęp do podwójnych nagród VIP`,
      default: "false",
    });
  }

  // Generate GUI definitions for GUI-enabled plugins
  let guiMenus: any[] = [];
  if (isDrop) {
    guiMenus.push({
      id: "drop_gui",
      title: "&8Dropy ze stona: &6&l" + formattedPluginName,
      rows: 3,
      triggerCommand: primaryCmd,
      items: [
        { slot: 10, material: "DIAMOND", name: "&b&lDiament z Kamienia", amount: 1, enchanted: true, active: true, lore: ["&7Szansa: &a2.5%", "&7Status: &aWŁĄCZONY", "&e▶ Kliknij aby przelaczyc"] },
        { slot: 11, material: "EMERALD", name: "&a&lSzmaragd z Kamienia", amount: 1, active: true, lore: ["&7Szansa: &a1.8%", "&7Status: &aWŁĄCZONY", "&e▶ Kliknij aby przelaczyc"] },
        { slot: 12, material: "GOLD_INGOT", name: "&6&lSztabka Złota", amount: 1, active: true, lore: ["&7Szansa: &a4.0%", "&7Status: &aWŁĄCZONY", "&e▶ Kliknij aby przelaczyc"] },
        { slot: 13, material: "IRON_INGOT", name: "&f&lSztabka Żelaza", amount: 1, active: true, lore: ["&7Szansa: &a12.0%", "&7Status: &aWŁĄCZONY", "&e▶ Kliknij aby przelaczyc"] },
        { slot: 14, material: "NETHERITE_INGOT", name: "&5&lSztabka Netherytu", amount: 1, enchanted: true, active: true, lore: ["&7Szansa: &d0.2%", "&7Status: &aWŁĄCZONY", "&e▶ Kliknij aby przelaczyc"] },
        { slot: 15, material: "REDSTONE", name: "&c&lCzerwony Proszek", amount: 1, active: true, lore: ["&7Szansa: &a8.0%", "&7Status: &aWŁĄCZONY", "&e▶ Kliknij aby przelaczyc"] },
        { slot: 16, material: "COAL", name: "&8&lWęgiel", amount: 1, active: true, lore: ["&7Szansa: &a15.0%", "&7Status: &aWŁĄCZONY", "&e▶ Kliknij aby przelaczyc"] },
        { slot: 22, material: "NETHER_STAR", name: "&e&lWszystkie Dropy", amount: 1, enchanted: true, active: true, lore: ["&7Wlacz/wylacz wszystkie dropy.", "&aStatus: AKTYWNE"] },
        { slot: 26, material: "BARRIER", name: "&c&lZamknij", amount: 1, lore: ["&7Zamyka okno menu."] }
      ]
    });
  } else if (isAdminPanel) {
    guiMenus.push({
      id: "admin_gui",
      title: "&8Panel Administratora: &c&l" + formattedPluginName,
      rows: 3,
      triggerCommand: primaryCmd,
      items: [
        { slot: 10, material: "GOLDEN_APPLE", name: "&a&lUlecz Gracza", amount: 1, lore: ["&7Odnawia 100% zdrowia i glodu.", "&e▶ Kliknij aby uleczyc"] },
        { slot: 12, material: "FEATHER", name: "&b&lTryb Latania (Fly)", amount: 1, lore: ["&7Wlacza lub wylacza latanie.", "&e▶ Kliknij aby zmienic"] },
        { slot: 14, material: "BARRIER", name: "&e&lTryb Boga (Godmode)", amount: 1, lore: ["&7Pelna niesmiertelnosc gracza.", "&e▶ Kliknij aby zmienic"] },
        { slot: 16, material: "PAPER", name: "&c&lWyczysc czat serwera", amount: 1, lore: ["&7Czysci czat dla wszystkich graczy.", "&c⚠ Uwaga na czat!"] }
      ]
    });
  } else if (isKosz) {
    guiMenus.push({
      id: "trash_gui",
      title: "&8Wirtualny Kosz: &c&l" + formattedPluginName,
      rows: 4,
      triggerCommand: primaryCmd,
      items: [
        { slot: 35, material: "LAVA_BUCKET", name: "&c&lSpal cala zawartosc kosza", amount: 1, enchanted: true, lore: ["&7Usuwa wszystkie smieci w koszu.", "&c⚠ Nieodwracalne!"] }
      ]
    });
  } else if (isDaily) {
    guiMenus.push({
      id: "daily_gui",
      title: "&8Dzienne Nagrody: &a&l" + formattedPluginName,
      rows: 3,
      triggerCommand: primaryCmd,
      items: [
        { slot: 10, material: "IRON_INGOT", name: "&f&lDzień 1: Żelazo", amount: 16, lore: ["&aStatus: Odebrano! ✓"] },
        { slot: 11, material: "GOLD_INGOT", name: "&6&lDzień 2: Złoto", amount: 16, lore: ["&aStatus: Odebrano! ✓"] },
        { slot: 12, material: "DIAMOND", name: "&b&lDzień 3: Diamenty", amount: 8, enchanted: true, lore: ["&e▶ Kliknij aby odebrac dzisiaj!"] },
        { slot: 13, material: "EMERALD", name: "&a&lDzień 4: Szmaragdy", amount: 12, lore: ["&7Dostepne jutro!"] },
        { slot: 14, material: "NETHERITE_SCRAP", name: "&5&lDzień 5: Netheryt", amount: 2, lore: ["&7Dostepne za 2 dni!"] },
        { slot: 15, material: "TOTEM_OF_UNDYING", name: "&e&lDzień 6: Totem", amount: 1, lore: ["&7Dostepne za 3 dni!"] },
        { slot: 16, material: "NETHER_STAR", name: "&d&lDzień 7: Gwiazda Kresu", amount: 1, enchanted: true, lore: ["&7Glowna nagroda tygodnia!"] }
      ]
    });
  } else if (isSchowek) {
    guiMenus.push({
      id: "deposit_gui",
      title: "&8Schowek Gracza: &e&l" + formattedPluginName,
      rows: 3,
      triggerCommand: primaryCmd,
      items: [
        { slot: 11, material: "ENCHANTED_GOLDEN_APPLE", name: "&d&lZłote Jabłka Koxy", amount: 2, enchanted: true, lore: ["&7Limit w eq: &e2 szt.", "&7W schowku: &a16 szt.", "", "&e[LPM] &aWyplac", "&e[PPM] &cSchowaj"] },
        { slot: 13, material: "GOLDEN_APPLE", name: "&6&lZłote Jabłka Refile", amount: 12, lore: ["&7Limit w eq: &e12 szt.", "&7W schowku: &a64 szt.", "", "&e[LPM] &aWyplac", "&e[PPM] &cSchowaj"] },
        { slot: 15, material: "ENDER_PEARL", name: "&3&lPerły Kresu", amount: 3, lore: ["&7Limit w eq: &e3 szt.", "&7W schowku: &a32 szt.", "", "&e[LPM] &aWyplac", "&e[PPM] &cSchowaj"] },
        { slot: 22, material: "CHEST", name: "&a&lWyplac Wszystko", amount: 1, enchanted: true, lore: ["&7Uzupelnia brakujace itemy w eq."] }
      ]
    });
  }

  return {
    pluginName: formattedPluginName,
    packageName: pkg,
    version: "1.0.0",
    platform: platform || "Paper",
    minecraftVersion: minecraftVersion || "1.20.4",
    summary,
    commands: [
      {
        name: primaryCmd,
        description: `Główna komenda pluginu ${formattedPluginName}`,
        usage: `/${primaryCmd}`,
        permission: `fifaai.${slug}.use`,
        aliases: cmdAliases.filter((a) => a !== primaryCmd),
      },
    ],
    permissions: permissionsList,
    files,
    guiMenus: guiMenus.length > 0 ? guiMenus : undefined,
    testScenarios: [
      {
        command: `/${primaryCmd}`,
        sender: "Player",
        expectedOutput: `&a[${formattedPluginName}] Otwarto menu pluginu!`,
        description: `Test działania komendy /${primaryCmd}`,
      },
      {
        command: `/${primaryCmd} reload`,
        sender: "Player",
        expectedOutput: `&a[${formattedPluginName}] Konfiguracja pluginu ${formattedPluginName} zostala pomyslnie przeladowana!`,
        description: `Test komendy przeładowania administratora`,
      },
    ],
  };
}
