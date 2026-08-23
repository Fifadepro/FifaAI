import { PluginProject, ProjectFile } from "../src/types";

// Helper to sanitize name for Java class
function toPascalCase(str: string): string {
  const cleaned = str.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
  if (!cleaned) return "CustomPlugin";
  return cleaned
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

export function extractSlug(prompt: string): string {
  const p = prompt.toLowerCase();
  
  if (p.includes("adminpanel") || p.includes("admin-panel") || p.includes("paneladmina") || p.includes("panel admin") || p.includes("admin")) {
    return "adminpanel";
  }
  if (p.includes("kosz") || p.includes("smietnik") || p.includes("trash") || p.includes("bin")) return "kosz";
  if (p.includes("rtp") || p.includes("teleport") || p.includes("losow")) return "rtp";
  if (p.includes("schowek") || p.includes("depozyt") || p.includes("safe")) return "schowek";
  if (p.includes("drop") || p.includes("kamien") || p.includes("stone")) return "drop";
  if (p.includes("daily") || p.includes("nagrod") || p.includes("reward")) return "daily";
  if (p.includes("gildi") || p.includes("guild") || p.includes("klan")) return "gildie";
  if (p.includes("freeze") || p.includes("zamro") || p.includes("rozdzka") || p.includes("wand")) return "freeze";
  if (p.includes("heal") || p.includes("lecz") || p.includes("ulecz")) return "heal";
  if (p.includes("fly") || p.includes("lata")) return "fly";
  if (p.includes("chat") || p.includes("cenzur") || p.includes("slowa")) return "chat";
  if (p.includes("plecak") || p.includes("backpack")) return "plecak";
  if (p.includes("sklep") || p.includes("shop")) return "shop";
  if (p.includes("spawn") || p.includes("lobby")) return "spawn";
  if (p.includes("antylogout") || p.includes("logout") || p.includes("pvp")) return "antylogout";
  if (p.includes("thor") || p.includes("piorun") || p.includes("lightning") || p.includes("mlot")) return "thor";

  // Stop words to filter out in Polish and English
  const stopWords = new Set([
    "plugin", "plugina", "pluginu", "pluginem", "na", "zrob", "napisz", "chce", "stworz", "generuj",
    "z", "ze", "do", "dla", "o", "jakis", "jakims", "dodaj", "aby", "zeby", "ze", "mi", "dla",
    "serwera", "minecraft", "w", "ktory", "ktorym", "oraz", "i", "a", "po", "ze", "to", "niech",
    "bedzie", "nazwa", "sie", "the", "a", "an", "for", "make", "create", "with"
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

export function synthesizePluginFromPrompt(
  prompt: string,
  pluginName?: string,
  packageName?: string,
  platform: string = "Paper",
  minecraftVersion: string = "1.20.4",
  existingFiles?: ProjectFile[],
  mode?: string
): PluginProject {
  const slug = extractSlug(prompt);

  // If modifying existing project with same theme, retain existing package
  if (mode === "modify" && existingFiles && existingFiles.length > 0) {
    const mainJava = existingFiles.find((f) => f.path.endsWith(".java") && !f.path.includes("Command") && !f.path.includes("Listener"));
    if (mainJava) {
      const matchPkg = mainJava.content.match(/package\s+([a-zA-Z0-9_.]+);/);
      if (matchPkg) packageName = matchPkg[1];
    }
  }

  // Consistent dynamic naming: FifaAI-<slug>
  const formattedPluginName = `FifaAI-${slug}`;
  const javaClassSuffix = toPascalCase(slug);
  const javaClassName = `FifaAI${javaClassSuffix}`;
  const pkg = `pl.fifaai.${slug.toLowerCase()}`;
  const pkgPath = pkg.replace(/\./g, "/");

  // Specific Feature Detectors
  const isAdminPanel = slug === "adminpanel";
  const isKosz = slug === "kosz";
  const isThor = slug === "thor";
  const isRtp = slug === "rtp";
  const isDaily = slug === "daily";
  const isFreeze = slug === "freeze";
  const isHeal = slug === "heal";
  const isFly = slug === "fly";
  const isSchowek = slug === "schowek";
  const isDrop = slug === "drop";

  let primaryCmd = slug;
  let cmdAliases = [slug];

  if (isAdminPanel) {
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
  } else if (isDaily) {
    primaryCmd = "daily";
    cmdAliases = ["nagroda"];
  } else if (isFreeze) {
    primaryCmd = "freeze";
    cmdAliases = ["zamroz"];
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
  }

  // Generate Main Class Java
  let onEnableExtra = "";
  if (isAdminPanel) {
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
        // Rejestracja komendy i zdarzen
        if (getCommand("${primaryCmd}") != null) {
            ${javaClassName}Command cmd = new ${javaClassName}Command(this);
            getCommand("${primaryCmd}").setExecutor(cmd);
            getCommand("${primaryCmd}").setTabCompleter(cmd);
        }
        getServer().getPluginManager().registerEvents(new ${javaClassName}Listener(this), this);
        getLogger().info("[FifaAI] Plugin " + getName() + " zostal pomyslnie wlaczony!");`;
  }

  const mainClassContent = `package ${pkg};

import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.plugin.java.JavaPlugin;

public final class ${javaClassName} extends JavaPlugin {

    private static ${javaClassName} instance;

    @Override
    public void onEnable() {
        instance = this;
        
        // Zapis domyslnego pliku konfiguracyjnego config.yml
        saveDefaultConfig();
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

  // Generate Command Class Java
  let commandBody = "";
  if (isAdminPanel) {
    commandBody = `        Player player = (Player) sender;
        if (!player.hasPermission("fifaai.adminpanel.use")) {
            player.sendMessage(plugin.getColoredMessage("messages.no-permission"));
            return true;
        }

        if (args.length > 0 && args[0].equalsIgnoreCase("reload")) {
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

        // Zmiana pogody / czasu na Dzień (Slot 14 - Zegar)
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

        int maxRadius = plugin.getConfig().getInt("settings.max-radius", 1500);
        java.util.Random random = new java.util.Random();
        int x = random.nextInt(maxRadius * 2) - maxRadius;
        int z = random.nextInt(maxRadius * 2) - maxRadius;
        int y = player.getWorld().getHighestBlockYAt(x, z);

        org.bukkit.Location rtpLoc = new org.bukkit.Location(player.getWorld(), x + 0.5, y + 1, z + 0.5);
        player.teleport(rtpLoc);
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

        player.setHealth(player.getMaxHealth());
        player.setFoodLevel(20);
        player.setFireTicks(0);
        player.sendMessage(plugin.getColoredMessage("messages.healed"));
        return true;`;
  } else if (isFly) {
    commandBody = `        Player player = (Player) sender;
        if (!player.hasPermission("fifaai.fly.use")) {
            player.sendMessage(plugin.getColoredMessage("messages.no-permission"));
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
            if ("reload".startsWith(args[0].toLowerCase())) {
                list.add("reload");
            }
            return list;
        }
        return Collections.emptyList();
    }
}
`;

  // Generate Listener Class Java
  let listenerExtra = "";
  if (isAdminPanel) {
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

  // Generate plugin.yml
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
  fifaai.${slug}.use:
    description: Dostep do komendy /${primaryCmd}
    default: ${isAdminPanel ? "op" : "true"}
  fifaai.${slug}.admin:
    description: Uprawnienia administratora do konfiguracji ${formattedPluginName}
    default: op
`;

  // Generate config.yml
  let configYmlContent = `# ===================================================
#        ${formattedPluginName} - Konfiguracja FifaAI
# ===================================================

settings:
  gui-title: "&4&lPanel Administratora"
  trash-rows: 4
  trash-title: "&c&lKosz na smieci"
  max-radius: 2000
  welcome-notify: false

messages:
  prefix: "&8[&a${formattedPluginName}&8] "
  no-permission: "&cBrak uprawnien do wykonania tej komendy!"
  reload-success: "&aKonfiguracja zostala pomyslnie przeladowana!"
  gui-opened: "&aOtwarto panel zarzadzania serwerem!"
  kosz-opened: "&aOtwarto wirtualny kosz na smieci. Wrzuc niepotrzebne itemy i zamknij ekwipunek."
  kosz-cleared: "&7Przedmioty z kosza zostaly bezpowrotnie usuniete."
  healed: "&aTwoje zdrowie i glod zostaly w pelni odnowione!"
  fly-enabled: "&eTryb latania: &aWLACZONY"
  fly-disabled: "&eTryb latania: &cWYLACZONY"
  weather-cleared: "&aUstawiono dzien oraz bezchmurna pogode!"
  teleported: "&aPrzeteleportowano losowo na koordynaty: &eX: %x% Y: %y% Z: %z%"
  success: "&aPomyslnie wykonano operacje w ${formattedPluginName}!"
`;

  // Generate pom.xml
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

  // Generate README.md
  const readmeContent = `# ${formattedPluginName}

Plugin wygenerowany przez platformę **FifaAI** dla serwerów Minecraft (Paper / Spigot / Purpur 1.20+).

## 📥 Instalacja
1. Pobierz plik **\`${formattedPluginName}-1.0.0.jar\`** klikając **Pobierz .JAR**.
2. Umieść plik w katalogu \`plugins/\` Twojego serwera Minecraft.
3. Zrestartuj serwer lub wpisz komendę \`/reload confirm\`.

## 🎮 Komendy
- \`/${primaryCmd}\` ${cmdAliases.length > 1 ? `(Aliasy: ${cmdAliases.filter((a) => a !== primaryCmd).map((a) => `/${a}`).join(", ")})` : ""} - Główna funkcja pluginu ${formattedPluginName} (Uprawnienie: \`fifaai.${slug}.use\`)
- \`/${primaryCmd} reload\` - Przeładowuje plik konfiguracyjny (Uprawnienie: \`fifaai.${slug}.admin\`)

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

  return {
    pluginName: formattedPluginName,
    packageName: pkg,
    version: "1.0.0",
    platform: platform || "Paper",
    minecraftVersion: minecraftVersion || "1.20.4",
    summary: `Plugin ${formattedPluginName} z komendą /${primaryCmd}, obsługą uprawnień i konfiguracyjnym plikiem config.yml.`,
    commands: [
      {
        name: primaryCmd,
        description: `Główna komenda pluginu ${formattedPluginName}`,
        usage: `/${primaryCmd}`,
        permission: `fifaai.${slug}.use`,
        aliases: cmdAliases.filter((a) => a !== primaryCmd),
      },
    ],
    permissions: [
      {
        name: `fifaai.${slug}.use`,
        node: `fifaai.${slug}.use`,
        description: `Dostęp do komendy /${primaryCmd}`,
        default: isAdminPanel ? "op" : "true",
      },
    ],
    files,
    testScenarios: [
      {
        command: `/${primaryCmd}`,
        sender: "Player",
        expectedOutput: `&a[${formattedPluginName}] Wykonano pomyślnie!`,
        description: `Test działania komendy /${primaryCmd}`,
      },
    ],
  };
}
