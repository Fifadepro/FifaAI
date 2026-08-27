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
  
  // Explicit plugin theme detection (prioritize specific themes)
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
