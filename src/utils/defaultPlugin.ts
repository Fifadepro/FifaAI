import { PluginProject } from "../types";

export const DEFAULT_PLUGIN: PluginProject = {
  pluginName: "FifaAI-kosz",
  packageName: "pl.fifaai.kosz",
  version: "1.0.0",
  platform: "Paper (1.20.4+)",
  minecraftVersion: "1.20.4",
  summary: "Wirtualny kosz na śmieci dla graczy z komendami /kosz, /trash, /smietnik, automatycznym czyszczeniem ekwipunku po zamknięciu oraz pełną konfiguracją w pliku config.yml.",
  commands: [
    {
      name: "kosz",
      description: "Otwiera wirtualny kosz na niepotrzebne przedmioty",
      usage: "/kosz [reload]",
      permission: "fifaai.kosz.use",
      aliases: ["trash", "smietnik"],
    },
  ],
  permissions: [
    {
      name: "fifaai.kosz.use",
      node: "fifaai.kosz.use",
      description: "Dostęp do komendy /kosz dla graczy",
      default: "true",
    },
    {
      name: "fifaai.kosz.admin",
      node: "fifaai.kosz.admin",
      description: "Przeładowanie konfiguracji pluginu (/kosz reload)",
      default: "op",
    },
  ],
  testScenarios: [
    {
      command: "/kosz",
      sender: "Player",
      expectedOutput: "&8[&aFifaAI-kosz&8] &aOtwarto wirtualny kosz na śmieci! Przedmioty zostaną bezpowrotnie usunięte po zamknięciu.",
      description: "Test komendy /kosz",
    },
    {
      command: "/smietnik",
      sender: "Player",
      expectedOutput: "&8[&aFifaAI-kosz&8] &aOtwarto wirtualny kosz na śmieci! Przedmioty zostaną bezpowrotnie usunięte po zamknięciu.",
      description: "Test aliasu /smietnik",
    },
    {
      command: "/kosz reload",
      sender: "Player",
      expectedOutput: "&8[&aFifaAI-kosz&8] &aKonfiguracja została pomyślnie przeładowana!",
      description: "Przeładowanie pliku konfiguracyjnego",
    },
  ],
  files: [
    {
      path: "src/main/java/pl/fifaai/kosz/FifaAIKosz.java",
      fileName: "FifaAIKosz.java",
      type: "java",
      content: `package pl.fifaai.kosz;

import org.bukkit.ChatColor;
import org.bukkit.plugin.java.JavaPlugin;

public final class FifaAIKosz extends JavaPlugin {

    private static FifaAIKosz instance;

    @Override
    public void onEnable() {
        instance = this;
        saveDefaultConfig();

        if (getCommand("kosz") != null) {
            KoszCommand cmd = new KoszCommand(this);
            getCommand("kosz").setExecutor(cmd);
            getCommand("kosz").setTabCompleter(cmd);
        }

        getServer().getPluginManager().registerEvents(new KoszListener(this), this);
        getLogger().info("[FifaAI] Plugin FifaAI-kosz zostal pomyslnie wlaczony!");
    }

    @Override
    public void onDisable() {
        getLogger().info("[FifaAI] Plugin FifaAI-kosz zostal wylaczony.");
    }

    public static FifaAIKosz getInstance() {
        return instance;
    }

    public String getColoredMessage(String path) {
        String msg = getConfig().getString(path, "&cWiadomosc nie znaleziona: " + path);
        String prefix = getConfig().getString("messages.prefix", "&8[&aFifaAI-kosz&8] ");
        return ChatColor.translateAlternateColorCodes('&', prefix + msg);
    }
}
`,
    },
    {
      path: "src/main/java/pl/fifaai/kosz/KoszCommand.java",
      fileName: "KoszCommand.java",
      type: "java",
      content: `package pl.fifaai.kosz;

import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;
import org.bukkit.inventory.Inventory;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class KoszCommand implements CommandExecutor, TabCompleter {

    private final FifaAIKosz plugin;

    public KoszCommand(FifaAIKosz plugin) {
        this.plugin = plugin;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (args.length > 0 && args[0].equalsIgnoreCase("reload")) {
            if (!sender.hasPermission("fifaai.kosz.admin")) {
                sender.sendMessage(plugin.getColoredMessage("messages.no-permission"));
                return true;
            }
            plugin.reloadConfig();
            sender.sendMessage(plugin.getColoredMessage("messages.reload-success"));
            return true;
        }

        if (!(sender instanceof Player)) {
            sender.sendMessage(ChatColor.RED + "Ta komenda jest dostepna tylko dla graczy na serwerze!");
            return true;
        }

        Player player = (Player) sender;
        if (!player.hasPermission("fifaai.kosz.use")) {
            player.sendMessage(plugin.getColoredMessage("messages.no-permission"));
            return true;
        }

        int rows = plugin.getConfig().getInt("settings.trash-rows", 4);
        int slots = Math.max(9, Math.min(54, rows * 9));
        String title = ChatColor.translateAlternateColorCodes('&', plugin.getConfig().getString("settings.trash-title", "&c&lKosz na smieci"));

        Inventory trashInv = Bukkit.createInventory(null, slots, title);
        player.openInventory(trashInv);
        player.sendMessage(plugin.getColoredMessage("messages.kosz-opened"));
        return true;
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        if (args.length == 1 && sender.hasPermission("fifaai.kosz.admin")) {
            List<String> list = new ArrayList<>();
            if ("reload".startsWith(args[0].toLowerCase())) {
                list.add("reload");
            }
            return list;
        }
        return Collections.emptyList();
    }
}
`,
    },
    {
      path: "src/main/java/pl/fifaai/kosz/KoszListener.java",
      fileName: "KoszListener.java",
      type: "java",
      content: `package pl.fifaai.kosz;

import org.bukkit.ChatColor;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.inventory.InventoryCloseEvent;

public class KoszListener implements Listener {

    private final FifaAIKosz plugin;

    public KoszListener(FifaAIKosz plugin) {
        this.plugin = plugin;
    }

    @EventHandler
    public void onInventoryClose(InventoryCloseEvent event) {
        String title = ChatColor.translateAlternateColorCodes('&', plugin.getConfig().getString("settings.trash-title", "&c&lKosz na smieci"));
        if (event.getView().getTitle().equals(title)) {
            event.getInventory().clear();
            if (event.getPlayer() instanceof Player) {
                Player player = (Player) event.getPlayer();
                player.sendMessage(plugin.getColoredMessage("messages.kosz-cleared"));
            }
        }
    }
}
`,
    },
    {
      path: "src/main/resources/plugin.yml",
      fileName: "plugin.yml",
      type: "yaml",
      content: `name: FifaAI-kosz
version: 1.0.0
main: pl.fifaai.kosz.FifaAIKosz
api-version: '1.20'
author: FifaAI
description: Wirtualny kosz na niepotrzebne przedmioty z automatycznym usuwaniem po zamknieciu.

commands:
  kosz:
    description: Otwiera wirtualny kosz na smieci
    usage: /kosz [reload]
    permission: fifaai.kosz.use
    aliases: [trash, smietnik]

permissions:
  fifaai.kosz.use:
    description: Dostep do komendy /kosz
    default: true
  fifaai.kosz.admin:
    description: Uprawnienie do przeladowania konfiguracji /kosz reload
    default: op
`,
    },
    {
      path: "src/main/resources/config.yml",
      fileName: "config.yml",
      type: "yaml",
      content: `# ===================================================
#           FifaAI-kosz - Konfiguracja
# ===================================================

settings:
  trash-rows: 4
  trash-title: "&c&lKosz na smieci"

messages:
  prefix: "&8[&aFifaAI-kosz&8] "
  no-permission: "&cBrak uprawnien do wykonania tej operacji!"
  kosz-opened: "&aOtwarto wirtualny kosz na smieci. Wrzuc niepotrzebne itemy i zamknij ekwipunek."
  kosz-cleared: "&7Przedmioty z kosza zostaly bezpowrotnie usuniete."
  reload-success: "&aKonfiguracja pluginu zostala pomyslnie przeladowana!"
`,
    },
    {
      path: "pom.xml",
      fileName: "pom.xml",
      type: "xml",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>pl.fifaai</groupId>
    <artifactId>FifaAI-kosz</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>

    <name>FifaAI-kosz</name>

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
`,
    },
    {
      path: "README.md",
      fileName: "README.md",
      type: "markdown",
      content: `# FifaAI-kosz

Plugin wygenerowany przez platformę **FifaAI** dla serwerów Minecraft (Paper / Spigot 1.20+).

## 📥 Instalacja
1. Pobierz plik **\`FifaAI-kosz-1.0.0.jar\`** klikając **Pobierz .JAR**.
2. Umieść plik w katalogu \`plugins/\` Twojego serwera Minecraft.
3. Zrestartuj serwer lub wpisz komendę \`/reload confirm\`.

## 🎮 Komendy
- \`/kosz\` (lub \`/trash\`, \`/smietnik\`) - Otwiera wirtualny kosz na śmieci
- \`/kosz reload\` - Przeładowuje plik konfiguracyjny config.yml
`,
    },
  ],
};
