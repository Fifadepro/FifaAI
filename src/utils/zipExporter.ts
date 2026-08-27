import JSZip from "jszip";
import { PluginProject } from "../types";

/**
 * Generates build.bat for Windows users (1-click Maven compile)
 */
function generateBuildBat(project: PluginProject): string {
  return `@echo off
echo ===================================================
echo   Kompilowanie pluginu: ${project.pluginName} (Minecraft Paper/Spigot)
echo ===================================================
echo.
echo Wymagany zainstalowany Maven i Java JDK 17+
echo.
call mvn clean package
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [BLAD] Kompilacja nie powiodla sie. Upewnij sie, ze masz zainstalowana Jave JDK i Maven.
    echo Pobierz Maven: https://maven.apache.org/download.cgi
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo   SUKCES! Gotowy plugin znajduje sie w folderze:
echo   target/${project.pluginName || "MinecraftPlugin"}-${project.version || "1.0.0"}.jar
echo ===================================================
echo.
echo Skopiuj ten plik do folderu /plugins swojego serwera Minecraft!
echo.
pause
`;
}

/**
 * Generates build.sh for Linux/macOS users
 */
function generateBuildSh(project: PluginProject): string {
  return `#!/bin/bash
echo "==================================================="
echo "  Kompilowanie pluginu: ${project.pluginName}"
echo "==================================================="
mvn clean package
if [ $? -eq 0 ]; then
    echo ""
    echo "==================================================="
    echo "  SUKCES! Gotowy plugin .jar znajduje sie w:"
    echo "  target/${project.pluginName || "MinecraftPlugin"}-${project.version || "1.0.0"}.jar"
    echo "==================================================="
    echo "Skopiuj ten plik do folderu /plugins na serwerze!"
else
    echo "[BLAD] Kompilacja nie powiodla sie. Sprawdz czy masz zainstalowany Maven (mvn)."
fi
`;
}

export interface JarExportResult {
  success: boolean;
  message?: string;
  error?: string;
  compiledClasses?: string[];
}

export function cleanJavaAnnotations(source: string): string {
  if (!source) return "";
  return source
    .replace(/^(\s*@[a-zA-Z0-9_]+(?:\([^)]*\))?)\s*;/gm, "$1")
    .replace(/(@[a-zA-Z0-9_]+(?:\([^)]*\))?)\s*;\s*\n/g, "$1\n")
    .replace(/@EventHandler\s*;/g, "@EventHandler")
    .replace(/@Override\s*;/g, "@Override")
    .replace(/@Deprecated\s*;/g, "@Deprecated")
    .replace(/;\s*;/g, ";");
}

/**
 * Compiles or packages the Java project into a ready-to-run .jar plugin file for Spigot/Paper server.
 * If server-side javac is not present, packages a valid plugin .jar client-side via JSZip.
 */
export async function exportProjectToJar(project: PluginProject): Promise<JarExportResult> {
  const jarFileName = `${project.pluginName || "MinecraftPlugin"}-${project.version || "1.0.0"}.jar`;

  // Clean any stray semicolons in Java files before compilation
  const cleanedProject: PluginProject = {
    ...project,
    files: (project.files || []).map((f) => {
      if (f.path?.endsWith(".java") || f.fileName?.endsWith(".java") || f.type === "java") {
        return {
          ...f,
          content: cleanJavaAnnotations(f.content),
        };
      }
      return f;
    }),
  };

  const response = await fetch("/api/compile-jar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ project: cleanedProject }),
  });

  if (response.ok) {
    const blob = await response.blob();
    const compiledClassesHeader = response.headers.get("X-Compiled-Classes") || "";
    const isSourceJar = response.headers.get("X-Is-Source-Jar") === "true";
    const compiledClasses = compiledClassesHeader ? compiledClassesHeader.split(";").filter(Boolean) : [];

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = jarFileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return {
      success: true,
      message: isSourceJar
        ? `Pomyślnie przygotowano i pobrano pakiet pluginu ${jarFileName}!`
        : `Pomyślnie skompilowano i pobrano ${jarFileName} (bajtkod .class dla Paper/Spigot)!`,
      compiledClasses,
    };
  } else {
    const errJson = await response.json().catch(() => ({}));
    const errorMsg =
      errJson.error || `Błąd podczas kompilacji Javy (kod: ${response.status})`;
    throw new Error(errorMsg);
  }
}

/**
 * Exports the complete project source tree as a .zip file with build scripts & pom.xml
 */
export async function exportProjectToZip(project: PluginProject): Promise<void> {
  const zip = new JSZip();

  for (const file of project.files) {
    const cleanPath = file.path.startsWith("/") ? file.path.slice(1) : file.path;
    zip.file(cleanPath, file.content);
  }

  const hasPom = project.files.some((f) => f.fileName === "pom.xml");
  if (!hasPom) {
    zip.file("pom.xml", generateDefaultPom(project));
  }

  // Include 1-click build scripts
  zip.file("build.bat", generateBuildBat(project));
  zip.file("build.sh", generateBuildSh(project));

  const content = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
  });

  const url = window.URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.pluginName || "MinecraftPlugin"}-MavenProject.zip`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

function generateDefaultPom(project: PluginProject): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>${project.packageName}</groupId>
    <artifactId>${project.pluginName}</artifactId>
    <version>${project.version || "1.0.0"}</version>
    <packaging>jar</packaging>

    <name>${project.pluginName}</name>

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
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.11.0</version>
                <configuration>
                    <source>\${java.version}</source>
                    <target>\${java.version}</target>
                </configuration>
            </plugin>
        </plugins>
        <resources>
            <resource>
                <directory>src/main/resources</directory>
                <filtering>true</filtering>
            </resource>
        </resources>
    </build>
</project>`;
}
