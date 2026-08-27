import fs from "fs";
import path from "path";
import https from "https";
import { exec } from "child_process";
import { promisify } from "util";
import JSZip from "jszip";

const execAsync = promisify(exec);

export interface CompileResult {
  success: boolean;
  jarBuffer?: Buffer;
  jarFileName?: string;
  error?: string;
  compiledClasses?: string[];
  isSourceJar?: boolean;
}

const REQUIRED_JARS = [
  {
    name: "paper-api-1.20.4.jar",
    url: "https://repo.papermc.io/repository/maven-public/io/papermc/paper/paper-api/1.20.4-R0.1-SNAPSHOT/paper-api-1.20.4-R0.1-20241030.192207-176.jar",
  },
  {
    name: "bungeecord-chat-1.20-R0.2.jar",
    url: "https://repo1.maven.org/maven2/net/md-5/bungeecord-chat/1.20-R0.2/bungeecord-chat-1.20-R0.2.jar",
  },
  {
    name: "guava-32.1.2-jre.jar",
    url: "https://repo1.maven.org/maven2/com/google/guava/guava/32.1.2-jre/guava-32.1.2-jre.jar",
  },
  {
    name: "adventure-api-4.17.0.jar",
    url: "https://repo1.maven.org/maven2/net/kyori/adventure-api/4.17.0/adventure-api-4.17.0.jar",
  },
  {
    name: "adventure-key-4.17.0.jar",
    url: "https://repo1.maven.org/maven2/net/kyori/adventure-key/4.17.0/adventure-key-4.17.0.jar",
  },
  {
    name: "adventure-text-minimessage-4.17.0.jar",
    url: "https://repo1.maven.org/maven2/net/kyori/adventure-text-minimessage/4.17.0/adventure-text-minimessage-4.17.0.jar",
  },
  {
    name: "adventure-text-serializer-legacy-4.17.0.jar",
    url: "https://repo1.maven.org/maven2/net/kyori/adventure-text-serializer-legacy/4.17.0/adventure-text-serializer-legacy-4.17.0.jar",
  },
  {
    name: "adventure-text-serializer-plain-4.17.0.jar",
    url: "https://repo1.maven.org/maven2/net/kyori/adventure-text-serializer-plain/4.17.0/adventure-text-serializer-plain-4.17.0.jar",
  },
  {
    name: "examination-api-1.3.0.jar",
    url: "https://repo1.maven.org/maven2/net/kyori/examination-api/1.3.0/examination-api-1.3.0.jar",
  },
];

function downloadJar(url: string, destPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    function fetchWithRedirect(targetUrl: string, maxRedirects = 3) {
      if (maxRedirects <= 0) {
        resolve(false);
        return;
      }
      https.get(targetUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
          if (res.headers.location) {
            fetchWithRedirect(res.headers.location, maxRedirects - 1);
            return;
          }
        }
        if (res.statusCode !== 200) {
          resolve(false);
          return;
        }
        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);
        fileStream.on("finish", () => {
          fileStream.close();
          resolve(true);
        });
      }).on("error", () => {
        resolve(false);
      });
    }
    fetchWithRedirect(url);
  });
}

export async function ensureCompilerDependencies(): Promise<void> {
  const cacheDir = path.join(process.cwd(), "server-cache");
  fs.mkdirSync(cacheDir, { recursive: true });

  for (const item of REQUIRED_JARS) {
    const jarPath = path.join(cacheDir, item.name);
    if (!fs.existsSync(jarPath) || fs.statSync(jarPath).size < 1000) {
      console.log(`[Compiler] Downloading missing dependency: ${item.name}...`);
      await downloadJar(item.url, jarPath);
    }
  }
}

/**
 * Clean up common LLM syntax bugs in Java source code
 */
export function sanitizeJavaSource(rawJava: string): string {
  if (!rawJava) return "";
  let java = rawJava;

  // 1. Remove semicolons directly after annotations (e.g. @EventHandler; or @Override;)
  java = java.replace(/^(\s*@[a-zA-Z0-9_]+(?:\([^)]*\))?)\s*;/gm, "$1");
  java = java.replace(/(@[a-zA-Z0-9_]+(?:\([^)]*\))?)\s*;\s*\n/g, "$1\n");
  java = java.replace(/@EventHandler\s*;/g, "@EventHandler");
  java = java.replace(/@Override\s*;/g, "@Override");
  java = java.replace(/@Deprecated\s*;/g, "@Deprecated");
  java = java.replace(/@Nullable\s*;/g, "@Nullable");
  java = java.replace(/@NotNull\s*;/g, "@NotNull");

  // 2. Fix multiple redundant semicolons outside strings
  java = java.replace(/;\s*;/g, ";");

  // 3. Fix missing basic imports if annotations or types are used without imports
  if (java.includes("@EventHandler") && !java.includes("import org.bukkit.event.EventHandler;")) {
    java = java.replace(/(package\s+[^;]+;\s*\n)/, "$1\nimport org.bukkit.event.EventHandler;");
  }
  if (java.includes("implements Listener") && !java.includes("import org.bukkit.event.Listener;")) {
    java = java.replace(/(package\s+[^;]+;\s*\n)/, "$1\nimport org.bukkit.event.Listener;");
  }
  if (java.includes("extends JavaPlugin") && !java.includes("import org.bukkit.plugin.java.JavaPlugin;")) {
    java = java.replace(/(package\s+[^;]+;\s*\n)/, "$1\nimport org.bukkit.plugin.java.JavaPlugin;");
  }
  if ((java.includes("Player ") || java.includes("(Player)")) && !java.includes("import org.bukkit.entity.Player;")) {
    java = java.replace(/(package\s+[^;]+;\s*\n)/, "$1\nimport org.bukkit.entity.Player;");
  }
  if (java.includes("ChatColor.") && !java.includes("import org.bukkit.ChatColor;")) {
    java = java.replace(/(package\s+[^;]+;\s*\n)/, "$1\nimport org.bukkit.ChatColor;");
  }

  return java;
}

export async function compileProjectToJar(project: any): Promise<CompileResult> {
  const jarFileName = `${project.pluginName || "MinecraftPlugin"}-${project.version || "1.0.0"}.jar`;
  let mainClassName = `${project.packageName || "pl.fifaai"}.${(project.pluginName || "Plugin").replace(/[^a-zA-Z0-9]/g, "")}`;

  // Find main class from JavaPlugin files or plugin.yml
  const pluginYmlFile = project.files?.find(
    (f: any) => f.fileName === "plugin.yml" || f.path?.endsWith("plugin.yml")
  );
  if (pluginYmlFile?.content) {
    const mainMatch = pluginYmlFile.content.match(/main:\s*([a-zA-Z0-9_.]+)/);
    if (mainMatch && mainMatch[1]) {
      mainClassName = mainMatch[1].trim();
    }
  }

  for (const file of project.files || []) {
    if (file.content && (file.content.includes("extends JavaPlugin") || file.fileName?.endsWith("Plugin.java"))) {
      const pkgMatch = file.content.match(/package\s+([a-zA-Z0-9_.]+);/);
      const classMatch = file.content.match(/public\s+(?:final\s+)?class\s+([a-zA-Z0-9_]+)/);
      if (pkgMatch && classMatch) {
        mainClassName = `${pkgMatch[1]}.${classMatch[1]}`;
      }
    }
  }

  // Ensure classpath dependencies are downloaded
  await ensureCompilerDependencies();

  // Check if javac and jar tools are available
  let javacBin = "javac";
  let hasJavac = false;

  const candidatePaths = [
    "/usr/local/bin/javac",
    "/usr/bin/javac",
    "/usr/lib/jvm/java-17-openjdk-amd64/bin/javac",
    "/usr/lib/jvm/default-java/bin/javac",
    "javac",
  ];

  for (const candidate of candidatePaths) {
    try {
      if (candidate === "javac") {
        const { stdout } = await execAsync("which javac || true");
        if (stdout.trim().length > 0) {
          javacBin = stdout.trim();
          hasJavac = true;
          break;
        }
      } else if (fs.existsSync(candidate)) {
        javacBin = candidate;
        hasJavac = true;
        const binDir = path.dirname(candidate);
        if (!process.env.PATH?.includes(binDir)) {
          process.env.PATH = `${binDir}:${process.env.PATH || ""}`;
        }
        break;
      }
    } catch {
      // Continue checking next candidate
    }
  }

  // 1. Compile with real javac into .class bytecode if available
  if (hasJavac) {
    const tmpId = `mc_comp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const workDir = path.join("/tmp", tmpId);
    const srcDir = path.join(workDir, "src");
    const binDir = path.join(workDir, "bin");
    const metaInfDir = path.join(binDir, "META-INF");

    try {
      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(binDir, { recursive: true });
      fs.mkdirSync(metaInfDir, { recursive: true });

      // Build classpath with all available server API jars
      const cacheDir = path.join(process.cwd(), "server-cache");
      const cpJars: string[] = [];
      if (fs.existsSync(cacheDir)) {
        const jars = fs.readdirSync(cacheDir).filter((f) => f.endsWith(".jar"));
        for (const j of jars) {
          cpJars.push(path.join(cacheDir, j));
        }
      }
      const classpath = cpJars.join(":");

      const javaFiles: string[] = [];

      for (const file of project.files || []) {
        const cleanPath = (file.path || file.fileName || "").replace(/^\/+/, "");

        if (cleanPath.endsWith(".java") && file.content) {
          const sanitizedContent = sanitizeJavaSource(file.content);
          const pkgMatch = sanitizedContent.match(/package\s+([a-zA-Z0-9_.]+);/);
          const classMatch = sanitizedContent.match(/public\s+(?:final\s+)?class\s+([a-zA-Z0-9_]+)/) ||
            sanitizedContent.match(/class\s+([a-zA-Z0-9_]+)/);

          let targetJavaPath: string;
          if (pkgMatch && classMatch) {
            const pkgPath = pkgMatch[1].replace(/\./g, "/");
            const targetDir = path.join(srcDir, pkgPath);
            fs.mkdirSync(targetDir, { recursive: true });
            targetJavaPath = path.join(targetDir, `${classMatch[1]}.java`);
          } else {
            targetJavaPath = path.join(srcDir, path.basename(cleanPath));
          }

          fs.writeFileSync(targetJavaPath, sanitizedContent, "utf-8");
          javaFiles.push(targetJavaPath);
        } else if (cleanPath === "plugin.yml" || cleanPath.endsWith("/plugin.yml") || cleanPath.endsWith("\\plugin.yml")) {
          fs.writeFileSync(path.join(binDir, "plugin.yml"), file.content, "utf-8");
        } else if (cleanPath === "config.yml" || cleanPath.endsWith("/config.yml") || cleanPath.endsWith("\\config.yml")) {
          fs.writeFileSync(path.join(binDir, "config.yml"), file.content, "utf-8");
        } else if (cleanPath.startsWith("src/main/resources/")) {
          const relResPath = cleanPath.replace(/^src\/main\/resources\//, "");
          const targetPath = path.join(binDir, relResPath);
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });
          fs.writeFileSync(targetPath, file.content, "utf-8");
        } else if (
          !cleanPath.endsWith(".xml") &&
          !cleanPath.endsWith(".bat") &&
          !cleanPath.endsWith(".sh") &&
          !cleanPath.endsWith(".md") &&
          !cleanPath.endsWith(".txt")
        ) {
          // Copy any other resource file to bin
          const resTarget = path.join(binDir, path.basename(cleanPath));
          fs.writeFileSync(resTarget, file.content, "utf-8");
        }
      }

      // Ensure plugin.yml is present in binDir and has exact main class
      const pluginYmlPath = path.join(binDir, "plugin.yml");
      if (!fs.existsSync(pluginYmlPath)) {
        const defaultPluginYml = `name: ${project.pluginName || "FifaAI-Plugin"}
version: ${project.version || "1.0.0"}
main: ${mainClassName}
api-version: 1.20
author: FifaAI
`;
        fs.writeFileSync(pluginYmlPath, defaultPluginYml, "utf-8");
      } else {
        // Validate main: in existing plugin.yml
        let ymlContent = fs.readFileSync(pluginYmlPath, "utf-8");
        if (!ymlContent.includes("main:") || ymlContent.includes("main: me.autor.") || ymlContent.includes("main: com.example.")) {
          ymlContent = ymlContent.replace(/main:\s*[^\r\n]+/, `main: ${mainClassName}`);
          if (!ymlContent.includes("main:")) {
            ymlContent += `\nmain: ${mainClassName}\n`;
          }
          fs.writeFileSync(pluginYmlPath, ymlContent, "utf-8");
        }
      }

      // Ensure config.yml is ALWAYS present in binDir (to prevent Bukkit IllegalArgumentException on saveDefaultConfig)
      const configYmlPath = path.join(binDir, "config.yml");
      if (!fs.existsSync(configYmlPath)) {
        const defaultConfigYml = `# =========================================
# Konfiguracja pluginu ${project.pluginName || "FifaAI-Plugin"}
# Wersja: ${project.version || "1.0.0"}
# Wygenerowano przez FifaAI
# =========================================

messages:
  prefix: "&8[&a${project.pluginName || "FifaAI"}&8] &r"
  no-permission: "&cNie posiadasz uprawnien do wykonania tej czynnosci!"
  no-permission-admin: "&cNie posiadasz uprawnien administratora!"
  reload-success: "&aKonfiguracja zostala pomyslnie przeladowana!"
  only-player: "&cTa komenda jest dostepna wylacznie dla graczy!"
  success: "&aCzynnosc wykonana pomyslnie!"

settings:
  enabled: true
`;
        fs.writeFileSync(configYmlPath, defaultConfigYml, "utf-8");
      }

      // Manifest
      const manifestContent = `Manifest-Version: 1.0\r\nCreated-By: FifaAI Minecraft Plugin Builder\r\nMain-Class: ${mainClassName}\r\nImplementation-Title: ${project.pluginName}\r\nImplementation-Version: ${project.version || "1.0.0"}\r\n\r\n`;
      fs.writeFileSync(path.join(metaInfDir, "MANIFEST.MF"), manifestContent, "utf-8");

      if (javaFiles.length > 0) {
        const cpArg = classpath ? `-cp "${classpath}"` : "";
        const javacCmd = `"${javacBin}" -encoding UTF-8 ${cpArg} -d "${binDir}" ${javaFiles.map((f) => `"${f}"`).join(" ")}`;
        console.log(`[Compiler] Compiling Java classes with javac: ${javacCmd}`);
        
        try {
          await execAsync(javacCmd, { timeout: 25000 });
        } catch (javacErr: any) {
          const errMsg = javacErr.stderr || javacErr.stdout || javacErr.message || "Błąd kompilatora javac";
          console.error("[Compiler] javac error:", errMsg);
          return {
            success: false,
            error: errMsg,
          };
        }

        // Package with JSZip from binDir
        const zip = new JSZip();

        function addDirToZip(dir: string, zipFolder: JSZip) {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
              const subFolder = zipFolder.folder(entry.name);
              if (subFolder) {
                addDirToZip(fullPath, subFolder);
              }
            } else if (entry.isFile()) {
              const content = fs.readFileSync(fullPath);
              zipFolder.file(entry.name, content);
            }
          }
        }

        addDirToZip(binDir, zip);

        const jarBuffer = await zip.generateAsync({
          type: "nodebuffer",
          compression: "DEFLATE",
        });

        // Scan compiled .class files
        const compiledClasses: string[] = [];
        function findClassFiles(dir: string, base: string = "") {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const rel = base ? `${base}/${entry.name}` : entry.name;
            if (entry.isDirectory()) {
              findClassFiles(path.join(dir, entry.name), rel);
            } else if (entry.isFile() && entry.name.endsWith(".class")) {
              compiledClasses.push(rel);
            }
          }
        }
        findClassFiles(binDir);

        console.log(`[Compiler] Build SUCCESS! Classes: ${compiledClasses.join(", ")}`);

        return {
          success: true,
          jarBuffer,
          jarFileName,
          compiledClasses: compiledClasses.length > 0 ? compiledClasses : [mainClassName],
        };
      }
    } catch (e: any) {
      console.warn("[Compiler] Exception during javac execution:", e);
      return {
        success: false,
        error: e.message || "Błąd podczas kompilacji projektu.",
      };
    } finally {
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
      } catch {}
    }
  }

  // If javac is somehow not available, package a valid plugin .jar structure with JSZip
  try {
    const zip = new JSZip();

    // plugin.yml
    const pluginYml = `name: ${project.pluginName || "FifaAI-Plugin"}
version: ${project.version || "1.0.0"}
main: ${mainClassName}
api-version: 1.20
author: FifaAI
`;
    zip.file("plugin.yml", pluginYmlFile?.content || pluginYml);

    // config.yml
    const configYmlFile = project.files?.find(
      (f: any) => f.fileName === "config.yml" || f.path?.endsWith("config.yml")
    );
    const defaultConfigYml = `# Konfiguracja pluginu ${project.pluginName || "FifaAI-Plugin"}
messages:
  prefix: "&8[&a${project.pluginName || "FifaAI"}&8] &r"
  success: "&aCzynnosc wykonana pomyslnie!"
settings:
  enabled: true
`;
    zip.file("config.yml", configYmlFile?.content || defaultConfigYml);

    // MANIFEST
    zip.file(
      "META-INF/MANIFEST.MF",
      `Manifest-Version: 1.0\r\nCreated-By: FifaAI Minecraft Plugin Builder\r\nMain-Class: ${mainClassName}\r\nImplementation-Title: ${project.pluginName}\r\nImplementation-Version: ${project.version || "1.0.0"}\r\n\r\n`
    );

    // Add source and resource files
    for (const file of project.files || []) {
      const cleanPath = (file.path || file.fileName || "").replace(/^\/+/, "");
      if (cleanPath && file.content) {
        zip.file(cleanPath, file.content);
      }
    }

    const jarBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    return {
      success: true,
      jarBuffer,
      jarFileName,
      compiledClasses: [mainClassName],
      isSourceJar: true,
    };
  } catch (fallbackError: any) {
    return {
      success: false,
      error: fallbackError.message || "Kompilator javac nie jest dostępny na serwerze. Pobierz projekt ZIP z plikiem build.bat.",
    };
  }
}


