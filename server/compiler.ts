import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface CompileResult {
  success: boolean;
  jarBuffer?: Buffer;
  jarFileName?: string;
  error?: string;
  compiledClasses?: string[];
}

export async function compileProjectToJar(project: any): Promise<CompileResult> {
  const tmpId = `mc_comp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const workDir = path.join("/tmp", tmpId);
  const srcDir = path.join(workDir, "src");
  const binDir = path.join(workDir, "bin");
  const metaInfDir = path.join(binDir, "META-INF");

  try {
    // 1. Create directory structure
    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(binDir, { recursive: true });
    fs.mkdirSync(metaInfDir, { recursive: true });

    // 2. Locate spigot API jar in server-cache
    const spigotJarPath = path.join(process.cwd(), "server-cache", "spigot-api-1.20.4.jar");
    let classpath = spigotJarPath;
    if (!fs.existsSync(spigotJarPath)) {
      console.warn(`[Compiler] Spigot API jar not found at ${spigotJarPath}`);
    }

    // 3. Write all files
    const javaFiles: string[] = [];
    let mainClassName = `${project.packageName}.${project.pluginName}`;

    for (const file of project.files || []) {
      const cleanPath = (file.path || file.fileName).replace(/^\/+/, "");

      if (cleanPath.endsWith(".java")) {
        // Find package and class name if possible
        const pkgMatch = file.content.match(/package\s+([a-zA-Z0-9_.]+);/);
        const classMatch =
          file.content.match(/public\s+(?:final\s+)?class\s+([a-zA-Z0-9_]+)/) ||
          file.content.match(/class\s+([a-zA-Z0-9_]+)/);

        let targetJavaPath: string;
        if (pkgMatch && classMatch) {
          const pkgPath = pkgMatch[1].replace(/\./g, "/");
          const targetDir = path.join(srcDir, pkgPath);
          fs.mkdirSync(targetDir, { recursive: true });
          targetJavaPath = path.join(targetDir, `${classMatch[1]}.java`);

          // Check if this class extends JavaPlugin
          if (file.content.includes("extends JavaPlugin") || cleanPath.includes(project.pluginName)) {
            mainClassName = `${pkgMatch[1]}.${classMatch[1]}`;
          }
        } else {
          targetJavaPath = path.join(srcDir, path.basename(cleanPath));
        }

        fs.writeFileSync(targetJavaPath, file.content, "utf-8");
        javaFiles.push(targetJavaPath);
      } else if (cleanPath === "plugin.yml" || cleanPath.endsWith("/plugin.yml")) {
        fs.writeFileSync(path.join(binDir, "plugin.yml"), file.content, "utf-8");
      } else if (cleanPath === "config.yml" || cleanPath.endsWith("/config.yml")) {
        fs.writeFileSync(path.join(binDir, "config.yml"), file.content, "utf-8");
      } else if (!cleanPath.endsWith(".xml") && !cleanPath.endsWith(".bat") && !cleanPath.endsWith(".sh")) {
        // Copy other resource files
        const resPath = path.join(binDir, path.basename(cleanPath));
        fs.writeFileSync(resPath, file.content, "utf-8");
      }
    }

    // Ensure plugin.yml exists and matches the real main class
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
      // Ensure plugin.yml has valid name and main class
      let ymlContent = fs.readFileSync(pluginYmlPath, "utf-8");
      if (!ymlContent.includes("main:") || ymlContent.includes("main: me.autor.") || ymlContent.includes("main: com.example.")) {
        ymlContent = ymlContent.replace(/main:\s*[^\r\n]+/, `main: ${mainClassName}`);
        if (!ymlContent.includes("main:")) {
          ymlContent += `\nmain: ${mainClassName}\n`;
        }
      }
      if (!ymlContent.includes("author:")) {
        ymlContent += `\nauthor: FifaAI\n`;
      }
      fs.writeFileSync(pluginYmlPath, ymlContent, "utf-8");
    }

    // Ensure MANIFEST.MF
    const manifestContent = `Manifest-Version: 1.0
Created-By: FifaAI Minecraft Plugin Compiler
Main-Class: ${mainClassName}
`;
    fs.writeFileSync(path.join(metaInfDir, "MANIFEST.MF"), manifestContent, "utf-8");

    if (javaFiles.length === 0) {
      return {
        success: false,
        error: "Brak plików źródłowych Java (.java) w projekcie do skompilowania.",
      };
    }

    // 4. Run javac compiler
    const javacCmd = `javac -encoding UTF-8 -cp "${classpath}" -d "${binDir}" ${javaFiles.map((f) => `"${f}"`).join(" ")}`;
    console.log(`[Compiler] Running: ${javacCmd}`);

    try {
      await execAsync(javacCmd, { timeout: 30000 });
    } catch (javacErr: any) {
      console.error("[Compiler] javac failed:", javacErr);
      return {
        success: false,
        error: javacErr.stderr || javacErr.stdout || javacErr.message || "Błąd kompilacji javac",
      };
    }

    // 5. Pack into .jar using jar tool
    const outJarPath = path.join(workDir, `${project.pluginName || "plugin"}.jar`);
    const jarCmd = `jar cvf "${outJarPath}" -C "${binDir}" .`;
    console.log(`[Compiler] Running: ${jarCmd}`);

    await execAsync(jarCmd, { timeout: 15000 });

    if (!fs.existsSync(outJarPath)) {
      return {
        success: false,
        error: "Nie udało się utworzyć pliku .jar po pomyślnej kompilacji.",
      };
    }

    const jarBuffer = fs.readFileSync(outJarPath);
    const jarFileName = `${project.pluginName || "Plugin"}-${project.version || "1.0.0"}.jar`;

    // Check compiled classes
    const { stdout: jarTf } = await execAsync(`jar tf "${outJarPath}"`);
    const classes = jarTf
      .split("\n")
      .filter((l) => l.endsWith(".class"))
      .map((l) => l.trim());

    return {
      success: true,
      jarBuffer,
      jarFileName,
      compiledClasses: classes,
    };
  } catch (err: any) {
    console.error("[Compiler] Fatal error:", err);
    return {
      success: false,
      error: err.message || "Nieoczekiwany błąd kompilacji",
    };
  } finally {
    // Cleanup work dir asynchronously
    setTimeout(() => {
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
      } catch {}
    }, 5000);
  }
}
