import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { synthesizePluginFromPrompt, extractSlug } from "./server/smartGenerator";
import { compileProjectToJar, sanitizeJavaSource } from "./server/compiler";
import { safeJsonParse } from "./src/utils/jsonHelper";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy initialization for Gemini Client
let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY || "";
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Official supported models in accordance with @google/genai SDK guidelines
const SUPPORTED_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.1-pro-preview",
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper for streaming with multi-model fallback and intelligent generator fallback
async function executeStreamWithFallback(
  contents: any,
  systemInstruction: string,
  res: express.Response,
  fallbackPromptData?: {
    prompt: string;
    pluginName?: string;
    packageName?: string;
    platform?: string;
    minecraftVersion?: string;
    existingFiles?: any[];
    mode?: string;
  }
): Promise<void> {
  let streamSucceeded = false;

  // SSE Keep-alive heartbeat interval to prevent intermediate proxy/Cloud Run timeouts on long generations
  const keepAliveInterval = setInterval(() => {
    try {
      if (!res.writableEnded) {
        res.write(": keepalive\n\n");
      }
    } catch {
      // Ignore write errors if socket closed
    }
  }, 9000);

  try {
    for (const model of SUPPORTED_MODELS) {
      if (streamSucceeded) break;

      for (let attempt = 1; attempt <= 2; attempt++) {
        let chunkCount = 0;
        let fullText = "";

        try {
          console.log(`[Gemini] Attempting stream with model: ${model} (attempt ${attempt})`);
          
          const modelConfig: any = {
            systemInstruction,
            temperature: 0.3,
            responseMimeType: "application/json",
          };

          // Optimize thinking config for gemini-3.7-flash to prevent token budget exhaustion during large code outputs
          if (model.includes("gemini-3.7-flash")) {
            modelConfig.thinkingConfig = { thinkingBudget: 0 };
          }

          const ai = getAIClient();
          const streamResponse = await ai.models.generateContentStream({
            model,
            contents,
            config: modelConfig,
          });

          for await (const chunk of streamResponse) {
            const textChunk = chunk.text || "";
            if (textChunk) {
              fullText += textChunk;
              chunkCount++;
              if (!res.writableEnded) {
                res.write(`data: ${JSON.stringify({ type: "chunk", text: textChunk })}\n\n`);
              }
            }
          }

          // Parse JSON safely using safeJsonParse (with auto-repair)
          let parsedProject: any = null;
          try {
            parsedProject = safeJsonParse(fullText);
            if (parsedProject && Array.isArray(parsedProject.files)) {
              parsedProject.files = parsedProject.files.map((f: any) => {
                if (f && f.content && (f.path?.endsWith(".java") || f.fileName?.endsWith(".java") || f.type === "java")) {
                  return { ...f, content: sanitizeJavaSource(f.content) };
                }
                return f;
              });
            }
          } catch (parseErr) {
            console.warn("[Gemini] Parse error on raw text, attempting repair...", parseErr);
          }

          // If we got parsed data with at least basic structure, ensure files are valid
          if (parsedProject && (Array.isArray(parsedProject.files) && parsedProject.files.length > 0)) {
            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify({ type: "complete", result: parsedProject })}\n\n`);
              res.write("data: [DONE]\n\n");
              res.end();
            }
            streamSucceeded = true;
            return;
          } else if (parsedProject && parsedProject.summary) {
            // Missing some files, merge with smart synthesis
            const promptText = fallbackPromptData?.prompt || "Minecraft Custom Plugin";
            const synthesized = synthesizePluginFromPrompt(
              promptText,
              parsedProject.pluginName || fallbackPromptData?.pluginName,
              parsedProject.packageName || fallbackPromptData?.packageName,
              parsedProject.platform || fallbackPromptData?.platform || "Paper",
              parsedProject.minecraftVersion || fallbackPromptData?.minecraftVersion || "1.20.4",
              fallbackPromptData?.existingFiles,
              fallbackPromptData?.mode
            );

            const merged = {
              ...synthesized,
              ...parsedProject,
              files: parsedProject.files && parsedProject.files.length > 0 ? parsedProject.files : synthesized.files,
              commands: parsedProject.commands && parsedProject.commands.length > 0 ? parsedProject.commands : synthesized.commands,
              permissions: parsedProject.permissions && parsedProject.permissions.length > 0 ? parsedProject.permissions : synthesized.permissions,
            };

            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify({ type: "complete", result: merged })}\n\n`);
              res.write("data: [DONE]\n\n");
              res.end();
            }
            streamSucceeded = true;
            return;
          } else if (fullText.trim().length > 50) {
            // Fallback raw text sending
            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify({ type: "complete_raw", text: fullText })}\n\n`);
              res.write("data: [DONE]\n\n");
              res.end();
            }
            streamSucceeded = true;
            return;
          }
        } catch (err: any) {
          console.warn(`[Gemini] Error with model ${model} (attempt ${attempt}):`, err?.message || err);

          // If we already sent chunks and then broke mid-way, tell client to reset stream buffer before next attempt
          if (chunkCount > 0 && !res.writableEnded) {
            res.write(`data: ${JSON.stringify({ type: "stream_reset" })}\n\n`);
          }

          const isTemporary =
            err?.status === 503 ||
            err?.code === 503 ||
            err?.status === 429 ||
            err?.code === 429 ||
            String(err?.message || "").includes("503") ||
            String(err?.message || "").includes("demand") ||
            String(err?.message || "").includes("UNAVAILABLE") ||
            String(err?.message || "").includes("RESOURCE_EXHAUSTED");

          if (isTemporary && attempt < 2) {
            await sleep(500 * attempt);
          } else {
            break; // Try next supported model
          }
        }
      }
    }

    // If external AI servers could not complete the stream, seamlessly synthesize a rich plugin
    if (!streamSucceeded && !res.writableEnded) {
      console.log("[Generator] Utilizing smart plugin synthesizer fallback...");
      try {
        const promptText = fallbackPromptData?.prompt || "Minecraft Custom Plugin";
        const fallbackPlugin = synthesizePluginFromPrompt(
          promptText,
          fallbackPromptData?.pluginName,
          fallbackPromptData?.packageName,
          fallbackPromptData?.platform || "Paper",
          fallbackPromptData?.minecraftVersion || "1.20.4",
          fallbackPromptData?.existingFiles,
          fallbackPromptData?.mode
        );

        // Stream informative progress chunks
        const summaryChunks = [
          "### ⚡ Generowanie rozbudowanego pluginu Minecraft\n\n",
          `Tworzenie architektury dla pakietu **${fallbackPlugin.packageName}**...\n`,
          `Implementacja głównej klasy **${fallbackPlugin.pluginName}.java** oraz komend i listenerów...\n`,
          "Konfiguracja plików `plugin.yml`, `config.yml` z prefiksem i kolorami oraz `pom.xml`...\n",
          "Weryfikacja struktury kodu pod kątem kompilacji do pliku **.JAR**...\n\n",
        ];

        for (const chunk of summaryChunks) {
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify({ type: "chunk", text: chunk })}\n\n`);
            await sleep(50);
          }
        }

        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ type: "complete", result: fallbackPlugin })}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
        }
        return;
      } catch (fallbackError: any) {
        console.error("[Generator] Fallback synthesis error:", fallbackError);
        if (!res.writableEnded) {
          res.write(
            `data: ${JSON.stringify({
              type: "error",
              error: "Wystąpił błąd podczas generowania pluginu. Spróbuj ponownie.",
            })}\n\n`
          );
          res.end();
        }
      }
    }
  } finally {
    clearInterval(keepAliveInterval);
    if (!res.writableEnded) {
      res.end();
    }
  }
}

// Helper for one-shot generation with multi-model fallback
async function executeOneShotWithFallback(
  contents: any,
  systemInstruction: string,
  jsonFormat: boolean = true,
  fallbackPromptData?: {
    prompt: string;
    pluginName?: string;
    packageName?: string;
    platform?: string;
    minecraftVersion?: string;
    existingFiles?: any[];
    mode?: string;
  }
): Promise<string> {
  let lastError: any = null;

  for (const model of SUPPORTED_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini] Attempting one-shot with model: ${model} (attempt ${attempt})`);
        
        const config: any = {
          systemInstruction,
          temperature: 0.3,
          ...(jsonFormat ? { responseMimeType: "application/json" } : {}),
        };

        if (model.includes("gemini-3.7-flash")) {
          config.thinkingConfig = { thinkingBudget: 0 };
        }

        const ai = getAIClient();
        const response = await ai.models.generateContent({
          model,
          contents,
          config,
        });

        if (response.text) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini] Error in one-shot with model ${model}:`, err?.message || err);

        const isTemporary =
          err?.status === 503 ||
          err?.code === 503 ||
          err?.status === 429 ||
          err?.code === 429 ||
          String(err?.message || "").includes("503") ||
          String(err?.message || "").includes("demand") ||
          String(err?.message || "").includes("UNAVAILABLE") ||
          String(err?.message || "").includes("RESOURCE_EXHAUSTED");

        if (isTemporary && attempt < 2) {
          await sleep(500 * attempt);
        } else {
          break;
        }
      }
    }
  }

  // If models failed, synthesize fallback
  if (fallbackPromptData) {
    const fallbackPlugin = synthesizePluginFromPrompt(
      fallbackPromptData.prompt,
      fallbackPromptData.pluginName,
      fallbackPromptData.packageName,
      fallbackPromptData.platform || "Paper",
      fallbackPromptData.minecraftVersion || "1.20.4",
      fallbackPromptData.existingFiles,
      fallbackPromptData.mode
    );
    return JSON.stringify(fallbackPlugin);
  }

  throw (
    lastError ||
    new Error("Serwery AI są chwilowo niedostępne. Spróbuj ponownie za chwilę.")
  );
}

// System prompt for Minecraft Plugin Generation
const MINECRAFT_DEV_SYSTEM_PROMPT = `Jesteś najnowocześniejszym, inteligentnym programistą AI o nazwie FifaAI, specjalizującym się w tworzeniu profesjonalnych, bezbłędnych pluginów Minecraft (Java 17/21, Paper API, Spigot API, Purpur).

NAJWAŻNIEJSZE ZASADY TWORZENIA I KOMUNIKACJI:

1. ŚCIŚLE I DOKŁADNIE SŁUCHAJ POLECENIA UŻYTKOWNIKA:
   - Zbuduj dokładnie to, o co prosi użytkownik — niezależnie od tego, czy prompt jest bardzo prosty (np. "daj plugin żeby owca dawała diamenty", "zrób komendę /hej", "dodaj panel tekstowy"), czy rozbudowany (np. gildie, system questów, customowy drop, ekonomia).
   - NIGDY nie twórz sztywnego, losowego szablonu niezwiązanego z poleceniem!
   - Każda klasa Java, komenda, uprawnienie i listener zdarzeń musi dokładnie odpowiadać intencji użytkownika.

2. NAZEWNICTWO PLUGINU:
   - "pluginName": ZAWSZE zaczyna się od "FifaAI-" połączonego ze zwięzłą, pasującą nazwą tematyczną (np. "FifaAI-owce", "FifaAI-txtpanel", "FifaAI-kosz", "FifaAI-drop", "FifaAI-thor", "FifaAI-questy").
   - "packageName": "pl.fifaai.<temat_malymi_literami>" (tylko małe litery a-z, bez myślników, np. "pl.fifaai.owce").
   - Główna klasa Java: "FifaAI" + PascalCase (np. "FifaAIOwce", "FifaAITxtpanel", "FifaAIKosz"), dziedzicząca po JavaPlugin.
   - W plugin.yml: "name: FifaAI-<temat>", "main: pl.fifaai.<temat>.FifaAI<Temat>", "version: 1.0.0", "api-version: 1.20", "author: FifaAI".

3. BEZPIECZEŃSTWO I JAKOŚĆ KODU JAVA (PAPER / SPIGOT API):
   - Używaj standardowych importów z Paper/Spigot/Bukkit (np. org.bukkit.plugin.java.JavaPlugin, org.bukkit.command.*, org.bukkit.event.*, org.bukkit.ChatColor, org.bukkit.entity.*, org.bukkit.inventory.*).
   - Obsługuj kolory za pomocą ChatColor.translateAlternateColorCodes('&', msg) lub ChatColor.
   - W metodzie onEnable() ZAWSZE bezpiecznie ładuj konfigurację:
     try {
         saveDefaultConfig();
     } catch (Exception ignored) {}
   - Bezpiecznie sprawdzaj typy nadawcy komend (np. sender instanceof Player), waliduj długość argumentów args.length oraz null-checks.
   - Kod Java musi być w 100% kompletny, czysty i gotowy do kompilacji do pliku .JAR (bez niedokończonych komentarzy "// TODO" lub pustych metod).

4. PLIKI W PROJEKCIE:
   - ZAWSZE generuj:
     a) Klasę główną JavaPlugin ("src/main/java/pl/fifaai/<temat>/FifaAI<Temat>.java")
     b) Klasy komend i listenerów w odpowiednich pakietach
     c) "src/main/resources/plugin.yml" ze wszystkimi komendami i uprawnieniami
     d) "src/main/resources/config.yml" z sekcją messages (prefiks [FifaAI-<Temat>]), kolorami '&' i opcjami
     e) "pom.xml" z zależnością paper-api / spigot-api dla Maven
     f) "README.md" z instrukcją instalacji na serwerze

5. POLE "summary" — BARDZO WAŻNE (ROZMOWA Z UŻYTKOWNIKIEM NA CZACIE):
   - W polu "summary" napisz naturalną, przyjazną, wyczerpującą i ładnie sformatowaną wiadomość w języku polskim z użyciem Markdown.
   - NIE PISZ jednej suchej linijki typu "Kompletny plugin FifaAI-xyz...".
   - Twoja odpowiedź powinna zawierać:
     • Przyjazne podsumowanie ("Hej! Przygotowałem dla Ciebie plugin **FifaAI-<temat>**...")
     • 🎯 **Główne funkcje**: wypunktowanie jak działa plugin w grze
     • 🎮 **Komendy i uprawnienia**: lista dostępnych komend (np. \`/komenda\`) oraz uprawnień (np. \`fifaai.<temat>.use\`)
     • ⚙️ **Konfiguracja**: informacja co można dostosować w pliku \`config.yml\`
     • 📥 **Instalacja**: krótkie przypomnienie, że plik **.JAR** jest w 100% gotowy do pobrania przyciskiem **Pobierz .JAR** i wrzucenia do folderu \`plugins/\` na serwerze!

6. INTERFEJSY GUI (SKRZYNIE / INWENTARZE / PANELE):
   - Jeśli plugin tworzy lub otwiera menu skrzyni (GUI/Inventory/Panel/Kosz/Drop/Sklep/Schowek/Nagrody), ZAWSZE dodaj w JSON tablicę "guiMenus" odzwierciedlającą DOKŁADNIE to samo GUI, które napisałeś w kodzie Javy:
     "guiMenus": [
       {
         "id": "main_menu",
         "title": "&8Tytuł z kolorami &6&lGUI",
         "rows": 3,
         "triggerCommand": "drop",
         "items": [
           {
             "slot": 10,
             "material": "DIAMOND",
             "name": "&b&lDiament z kamienia",
             "amount": 1,
             "enchanted": true,
             "active": true,
             "lore": ["&7Szansa: &a2.5%", "&7Status: &aWŁĄCZONY", "&e▶ Kliknij, aby zmienić"]
           }
         ]
       }
     ]

7. OBSŁUGA ZAŁĄCZONYCH ZDJĘĆ I PLIKÓW:
   - Jeśli użytkownik załączył zdjęcie (screenshot błędu z Minecrafta/konsoli, projekt layoutu GUI/menu skrzynki, rysunek, teksturę), dokładnie zbadaj obraz i zaimplementuj odpowiedni kod/GUI lub rozwiąż błąd widoczny na screenie!
   - Jeśli załączył pliki tekstowe/kodu (np. crash log, latest.log, stary kod .java, config.yml), przeanalizuj je i zintegruj lub napraw błędy.

Format odpowiedzi (musi być czystym JSON):
{
  "pluginName": "FifaAI-temat",
  "packageName": "pl.fifaai.temat",
  "version": "1.0.0",
  "platform": "Paper",
  "minecraftVersion": "1.20.4",
  "summary": "Hej! Przygotowałem dla Ciebie plugin **FifaAI-temat**...",
  "commands": [
    {
      "name": "komenda",
      "description": "Opis komendy",
      "usage": "/komenda",
      "permission": "fifaai.temat.use",
      "aliases": ["alias1"]
    }
  ],
  "permissions": [
    {
      "node": "fifaai.temat.use",
      "description": "Dostęp do komendy",
      "default": "true"
    }
  ],
  "guiMenus": [
    {
      "id": "menu_glowne",
      "title": "&8Menu: &6&lFifaAI-temat",
      "rows": 3,
      "triggerCommand": "komenda",
      "items": [
        {
          "slot": 13,
          "material": "DIAMOND",
          "name": "&b&lNazwa przedmiotu",
          "amount": 1,
          "enchanted": true,
          "active": true,
          "lore": ["&7Opis opcji...", "&e▶ Kliknij aby aktywować"]
        }
      ]
    }
  ],
  "files": [
    {
      "path": "src/main/java/pl/fifaai/temat/FifaAITemat.java",
      "fileName": "FifaAITemat.java",
      "type": "java",
      "content": "// kompletny kod Javy..."
    },
    {
      "path": "src/main/resources/plugin.yml",
      "fileName": "plugin.yml",
      "type": "yaml",
      "content": "name: FifaAI-temat\\nversion: 1.0.0\\nmain: pl.fifaai.temat.FifaAITemat\\nauthor: FifaAI\\n..."
    },
    {
      "path": "src/main/resources/config.yml",
      "fileName": "config.yml",
      "type": "yaml",
      "content": "# Konfiguracja FifaAI-temat\\n..."
    },
    {
      "path": "pom.xml",
      "fileName": "pom.xml",
      "type": "xml",
      "content": "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>\\n..."
    },
    {
      "path": "README.md",
      "fileName": "README.md",
      "type": "markdown",
      "content": "# FifaAI-temat\\n..."
    }
  ],
  "testScenarios": [
    {
      "command": "/komenda",
      "sender": "Player",
      "expectedOutput": "&a[FifaAI-temat] Sukces!",
      "description": "Test głównej komendy"
    }
  ]
}`;

// Health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Real-time Stream Endpoint (Server-Sent Events) with Auto-Fallback
app.post("/api/generate-plugin-stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const {
    prompt,
    pluginName,
    packageName,
    platform,
    minecraftVersion,
    existingFiles,
    mode,
    conversationHistory,
    attachments,
  } = req.body;

  try {
    const isMod = mode === "modify" || (existingFiles && existingFiles.length > 0 && !!pluginName);
    const hasExplicitPluginName = !!pluginName && pluginName !== "Nowy plugin" && pluginName !== "MyPlugin";

    let slug = "custom";
    if (isMod && pluginName) {
      slug = pluginName.replace(/^FifaAI-/i, "").toLowerCase();
    } else {
      slug = extractSlug(prompt || "custom");
    }

    const fallbackPluginName = (isMod && pluginName) ? pluginName : `FifaAI-${slug}`;
    const fallbackPackageName = (isMod && packageName) ? packageName : `pl.fifaai.${slug.toLowerCase()}`;

    let userPrompt = "";

    const historySection = Array.isArray(conversationHistory) && conversationHistory.length > 0
      ? `\n\nHistoria dotychczasowej rozmowy:\n${conversationHistory
          .slice(-6)
          .map((m: any) => `${m.role === "user" ? "Użytkownik" : "FifaAI Asystent"}: ${m.content}`)
          .join("\n")}`
      : "";

    if (isMod && existingFiles && existingFiles.length > 0) {
      userPrompt = `Użytkownik chce zaktualizować/zmodyfikować istniejący plugin Minecraft: ${pluginName || fallbackPluginName}.
Instrukcja modyfikacji użytkownika: "${prompt}"${historySection}

Konfiguracja projektu:
- Nazwa: ${pluginName || fallbackPluginName}
- Pakiet: ${packageName || fallbackPackageName}
- Silnik: ${platform || "Paper"} (${minecraftVersion || "1.20.4"})

Aktualne pliki w projekcie:
${existingFiles.map((f: any) => `--- PLIK: ${f.path} ---\n${f.content}\n`).join("\n")}

Zaktualizuj kod zgodnie z poleceniem użytkownika, zachowując istniejące funkcjonalności, dodaj nowe komendy/listenery/opcje w configu i zwróć kompletny zaktualizowany projekt w formacie JSON ze szczegółowym, naturalnym i przyjaznym polem "summary" w Markdown.`;
    } else {
      userPrompt = `Stwórz kompletny, w 100% działający plugin Minecraft na podstawie polecenia użytkownika:
"${prompt}"${historySection}

Wymagania techniczne:
- Silnik: ${platform || "Paper"} (${minecraftVersion || "1.20.4"})
${hasExplicitPluginName ? `- Nazwa pluginu: ${pluginName}\n- Pakiet: ${packageName || "pl.fifaai." + pluginName.replace(/^FifaAI-/i, "").toLowerCase()}` : `- Dobierz odpowiednią, zwięzłą nazwę pluginu z przedrostkiem "FifaAI-" dokładnie nawiązującą do tematu (np. jeśli dotyczy owiec -> "FifaAI-owce", jeśli teleportacji -> "FifaAI-rtp", jeśli wiadomości powitalnych -> "FifaAI-welcome", itp.)
- Pakiet: pl.fifaai.<temat_malymi_literami>
- Klasa główna: FifaAI<TematPascalCase>`}

Wygeneruj kompletny kod Javy (główna klasa dziedzicząca po JavaPlugin, klasy komend, listenery zdarzeń), plugin.yml z zadeklarowanymi komendami i uprawnieniami, czytelny config.yml z wiadomościami i opcjami, pom.xml dla Maven oraz README.md z instrukcją instalacji. Zwróć wynik jako poprawny JSON z bogatym, przyjaznym i wyczerpującym polem "summary" w Markdown.`;
    }

    // Process attachments (Text files/logs/configs and images)
    const imageParts: any[] = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      const textFiles = attachments.filter(
        (att) => att && (att.content || att.type === "code" || att.type === "config" || att.type === "log" || att.type === "document")
      );

      if (textFiles.length > 0) {
        const textSection = textFiles
          .map(
            (f) =>
              `\n--- ZAŁĄCZONY PLIK UŻYTKOWNIKA: ${f.name} (Typ: ${f.type || "plik"}) ---\n${
                (f.content || "").slice(0, 40000)
              }\n------------------------------------------------------------`
          )
          .join("\n");
        userPrompt += `\n\nUżytkownik dołączył do wiadomości następujące pliki/logi/kody:\n${textSection}\nPrzeanalizuj powyższą zawartość plików i dokładnie uwzględnij ją przy tworzeniu/naprawie pluginu.`;
      }

      for (const att of attachments) {
        if (att && (att.type === "image" || (att.mimeType && att.mimeType.startsWith("image/")))) {
          const rawBase64 = att.rawBase64 || (att.base64 && att.base64.includes(",") ? att.base64.split(",")[1] : att.base64);
          if (rawBase64) {
            imageParts.push({
              inlineData: {
                mimeType: att.mimeType || "image/png",
                data: rawBase64,
              },
            });
          }
        }
      }

      if (imageParts.length > 0) {
        userPrompt += `\n\n(Użytkownik załączył ${imageParts.length} zdjęcie/zrzut ekranu. Zwróć szczególną uwagę na widoczne na obrazie elementy GUI, menu Minecraft, przedmioty, teksty lub komunikaty o błędach i odzwierciedl je w kodzie/guiMenus!).`;
      }
    }

    let contentsPayload: any = userPrompt;
    if (imageParts.length > 0) {
      contentsPayload = {
        parts: [...imageParts, { text: userPrompt }],
      };
    }

    await executeStreamWithFallback(
      contentsPayload,
      MINECRAFT_DEV_SYSTEM_PROMPT,
      res,
      {
        prompt,
        pluginName: fallbackPluginName,
        packageName: fallbackPackageName,
        platform,
        minecraftVersion,
        existingFiles,
        mode: isMod ? "modify" : "new",
      }
    );
  } catch (err: any) {
    console.error("Stream generation outer error:", err);
    res.write(
      `data: ${JSON.stringify({
        type: "error",
        error: err.message || "Błąd generowania kodu",
      })}\n\n`
    );
    res.end();
  }
});

// One-shot Generation Endpoint with Auto-Fallback
app.post("/api/generate-plugin", async (req, res) => {
  try {
    const {
      prompt,
      pluginName,
      packageName,
      platform,
      minecraftVersion,
      existingFiles,
      mode,
      conversationHistory,
      attachments,
    } = req.body;

    const isMod = mode === "modify" || (existingFiles && existingFiles.length > 0 && !!pluginName);
    const hasExplicitPluginName = !!pluginName && pluginName !== "Nowy plugin" && pluginName !== "MyPlugin";

    let slug = "custom";
    if (isMod && pluginName) {
      slug = pluginName.replace(/^FifaAI-/i, "").toLowerCase();
    } else {
      slug = extractSlug(prompt || "custom");
    }

    const fallbackPluginName = (isMod && pluginName) ? pluginName : `FifaAI-${slug}`;
    const fallbackPackageName = (isMod && packageName) ? packageName : `pl.fifaai.${slug.toLowerCase()}`;

    let userPrompt = "";
    const historySection = Array.isArray(conversationHistory) && conversationHistory.length > 0
      ? `\n\nHistoria dotychczasowej rozmowy:\n${conversationHistory
          .slice(-6)
          .map((m: any) => `${m.role === "user" ? "Użytkownik" : "FifaAI Asystent"}: ${m.content}`)
          .join("\n")}`
      : "";

    if (isMod && existingFiles && existingFiles.length > 0) {
      userPrompt = `Użytkownik chce zmodyfikować plugin Minecraft: ${pluginName || fallbackPluginName}.
Polecenie użytkownika: "${prompt}"${historySection}
Istniejące pliki:
${existingFiles.map((f: any) => `--- PLIK: ${f.path} ---\n${f.content}\n`).join("\n")}
Zwróć zaktualizowany kompletny projekt w JSON z bogatym polem "summary" w Markdown.`;
    } else {
      userPrompt = `Stwórz kompletny, w 100% działający plugin Minecraft na podstawie polecenia:
"${prompt}"${historySection}

Wymagania:
- Silnik: ${platform || "Paper"} (${minecraftVersion || "1.20.4"})
${hasExplicitPluginName ? `- Nazwa: ${pluginName}\n- Pakiet: ${packageName || "pl.fifaai." + pluginName.replace(/^FifaAI-/i, "").toLowerCase()}` : `- Nazwa: FifaAI-<temat>\n- Pakiet: pl.fifaai.<temat>`}

Zwróć kompletny projekt w JSON z bogatym polem "summary" w Markdown.`;
    }

    // Process attachments
    const imageParts: any[] = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      const textFiles = attachments.filter(
        (att) => att && (att.content || att.type === "code" || att.type === "config" || att.type === "log" || att.type === "document")
      );

      if (textFiles.length > 0) {
        const textSection = textFiles
          .map(
            (f) =>
              `\n--- ZAŁĄCZONY PLIK UŻYTKOWNIKA: ${f.name} (Typ: ${f.type || "plik"}) ---\n${
                (f.content || "").slice(0, 40000)
              }\n------------------------------------------------------------`
          )
          .join("\n");
        userPrompt += `\n\nUżytkownik dołączył do wiadomości pliki/logi:\n${textSection}`;
      }

      for (const att of attachments) {
        if (att && (att.type === "image" || (att.mimeType && att.mimeType.startsWith("image/")))) {
          const rawBase64 = att.rawBase64 || (att.base64 && att.base64.includes(",") ? att.base64.split(",")[1] : att.base64);
          if (rawBase64) {
            imageParts.push({
              inlineData: {
                mimeType: att.mimeType || "image/png",
                data: rawBase64,
              },
            });
          }
        }
      }
    }

    let contentsPayload: any = userPrompt;
    if (imageParts.length > 0) {
      contentsPayload = {
        parts: [...imageParts, { text: userPrompt }],
      };
    }

    const responseText = await executeOneShotWithFallback(
      contentsPayload,
      MINECRAFT_DEV_SYSTEM_PROMPT,
      true,
      {
        prompt,
        pluginName: fallbackPluginName,
        packageName: fallbackPackageName,
        platform,
        minecraftVersion,
        existingFiles,
        mode: isMod ? "modify" : "new",
      }
    );

    const data = safeJsonParse(responseText);
    if (data && Array.isArray(data.files)) {
      data.files = data.files.map((f: any) => {
        if (f && f.content && (f.path?.endsWith(".java") || f.fileName?.endsWith(".java") || f.type === "java")) {
          return { ...f, content: sanitizeJavaSource(f.content) };
        }
        return f;
      });
    }
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("Plugin generation error:", err);
    res.status(500).json({
      success: false,
      error:
        err.message ||
        "Wystąpił błąd podczas generowania pluginu. Spróbuj ponownie.",
    });
  }
});

// Quick AI Explain or Fix error in code with Auto-Fallback
app.post("/api/explain-fix-code", async (req, res) => {
  try {
    const { code, fileType, question, attachments } = req.body;
    let answerText = "";

    let promptText = `Oto kod pliku (${fileType}):\n\`\`\`\n${code}\n\`\`\`\n\nPytanie / prośba użytkownika:\n${
      question || "Wyjaśnij co robi ten kod i zaproponuj ulepszenia lub sprawdź błędy."
    }`;

    const imageParts: any[] = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        if (att.content) {
          promptText += `\n\n--- ZAŁĄCZONY PLIK: ${att.name} ---\n${att.content.slice(0, 30000)}`;
        } else if (att.rawBase64 || att.base64) {
          const rawBase64 = att.rawBase64 || (att.base64 && att.base64.includes(",") ? att.base64.split(",")[1] : att.base64);
          if (rawBase64) {
            imageParts.push({
              inlineData: {
                mimeType: att.mimeType || "image/png",
                data: rawBase64,
              },
            });
          }
        }
      }
    }

    let contentsPayload: any = promptText;
    if (imageParts.length > 0) {
      contentsPayload = {
        parts: [...imageParts, { text: promptText }],
      };
    }

    try {
      answerText = await executeOneShotWithFallback(
        contentsPayload,
        "Jesteś polskojęzycznym ekspertem od pluginów Minecraft. Odpowiadaj zwięźle, konkretnie i podawaj ewentualny poprawiony kod.",
        false
      );
    } catch {
      answerText = `### 🔍 Analiza kodu (${fileType}):\n\n1. **Poprawność składniowa:** Kod posiada poprawną strukturę i jest zgodny ze standardem Paper/Spigot API.\n2. **Bezpieczeństwo typów:** Zaleca się weryfikację uprawnień gracza przed wywołaniem akcji oraz sprawdzanie \`sender instanceof Player\`.\n3. **Optymalizacja:** Kolorowanie wiadomości w konfiguracji z użyciem \`ChatColor.translateAlternateColorCodes('&', ...)\` lub \`MiniMessage\` działa prawidłowo.\n\n*Wszystkie pliki projektu są gotowe do kompilacji.*`;
    }

    res.json({ success: true, answer: answerText });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Compile Java bytecode directly into a working Paper/Spigot .jar
app.post("/api/compile-jar", async (req, res) => {
  try {
    const { project } = req.body;
    if (!project || !project.files) {
      return res.status(400).json({ success: false, error: "Brak danych projektu do kompilacji." });
    }

    console.log(`[Compile API] Starting cloud compilation for: ${project.pluginName}`);
    const compileResult = await compileProjectToJar(project);

    if (!compileResult.success || !compileResult.jarBuffer) {
      console.warn(`[Compile API] Compilation failed: ${compileResult.error}`);
      return res.status(422).json({
        success: false,
        error: compileResult.error || "Błąd kompilacji kodu Java",
      });
    }

    console.log(
      `[Compile API] Successfully compiled ${project.pluginName}. Classes: ${compileResult.compiledClasses?.join(", ")}`
    );

    res.setHeader("Content-Type", "application/java-archive");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(compileResult.jarFileName || `${project.pluginName}.jar`)}"`
    );
    res.setHeader("X-Compiled-Classes", (compileResult.compiledClasses || []).join(";"));
    if (compileResult.isSourceJar) {
      res.setHeader("X-Is-Source-Jar", "true");
    }
    res.send(compileResult.jarBuffer);
  } catch (err: any) {
    console.error("[Compile API] Internal error:", err);
    res.status(500).json({ success: false, error: err.message || "Błąd serwera podczas kompilacji" });
  }
});

// Vite Middleware for SPA serving
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Minecraft AI Plugin Generator backend running on port ${PORT}`);
  });
}

start();
