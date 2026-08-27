/**
 * Helper to safely sanitize and parse JSON strings returned by LLMs
 * handles unescaped control characters (newlines, tabs in strings), markdown codeblocks,
 * truncated JSON streams, and extracts valid JSON objects.
 */

export function sanitizeControlCharactersInJson(jsonStr: string): string {
  let inString = false;
  let isEscaped = false;
  let result = "";

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];

    if (inString) {
      if (isEscaped) {
        result += char;
        isEscaped = false;
      } else if (char === "\\") {
        result += char;
        isEscaped = true;
      } else if (char === '"') {
        result += char;
        inString = false;
      } else if (char === "\n") {
        result += "\\n";
      } else if (char === "\r") {
        result += "\\r";
      } else if (char === "\t") {
        result += "\\t";
      } else {
        const code = char.charCodeAt(0);
        if (code < 32) {
          result += "\\u" + code.toString(16).padStart(4, "0");
        } else {
          result += char;
        }
      }
    } else {
      if (char === '"') {
        inString = true;
      }
      result += char;
    }
  }
  return result;
}

/**
 * Attempts to repair truncated JSON (e.g., when model hits token limit mid-generation)
 */
export function repairTruncatedJson(jsonStr: string): string {
  let text = jsonStr.trim();

  // Strip markdown code block wrappers
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "");
    const closingIndex = text.lastIndexOf("```");
    if (closingIndex !== -1) {
      text = text.slice(0, closingIndex);
    }
    text = text.trim();
  }

  // Find start of outermost JSON
  const startIdx = text.indexOf("{");
  if (startIdx === -1) return text;
  text = text.slice(startIdx);

  // Track open brackets and quotes
  let inString = false;
  let isEscaped = false;
  const stack: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === "\\") {
        isEscaped = true;
      } else if (ch === '"') {
        inString = false;
      }
    } else {
      if (ch === '"') {
        inString = true;
      } else if (ch === "{" || ch === "[") {
        stack.push(ch);
      } else if (ch === "}") {
        if (stack.length > 0 && stack[stack.length - 1] === "{") {
          stack.pop();
        }
      } else if (ch === "]") {
        if (stack.length > 0 && stack[stack.length - 1] === "[") {
          stack.pop();
        }
      }
    }
  }

  // If we ended inside a string, close it
  if (inString) {
    text += '"';
  }

  // Remove dangling commas, colons or unclosed key-values at the very end
  text = text.replace(/,\s*$/, "");
  text = text.replace(/:\s*$/, ': ""');

  // Close remaining open brackets in reverse order
  while (stack.length > 0) {
    const open = stack.pop();
    if (open === "{") {
      text += "}";
    } else if (open === "[") {
      text += "]";
    }
  }

  return text;
}

export function safeJsonParse<T = any>(raw: string): T {
  if (!raw || typeof raw !== "string") {
    throw new Error("Pusty lub nieprawidłowy ciąg wejściowy do parsowania JSON.");
  }

  let text = raw.trim();

  // 1. Strip markdown fences if present
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  // 2. Try direct JSON.parse
  try {
    return JSON.parse(text);
  } catch (err1) {
    // 3. Try to extract outermost JSON { ... } or [ ... ]
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const sliced = text.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(sliced);
      } catch {
        text = sliced;
      }
    }

    // 4. Sanitize unescaped control characters inside string literals
    try {
      const sanitized = sanitizeControlCharactersInJson(text);
      return JSON.parse(sanitized);
    } catch (err2) {
      // 5. Try removing trailing commas
      try {
        const cleanedCommas = sanitizeControlCharactersInJson(text).replace(
          /,\s*([}\]])/g,
          "$1"
        );
        return JSON.parse(cleanedCommas);
      } catch (err3) {
        // 6. Attempt repair of truncated JSON (e.g. stream cut off mid-way)
        try {
          const repaired = repairTruncatedJson(text);
          const sanitizedRepaired = sanitizeControlCharactersInJson(repaired).replace(
            /,\s*([}\]])/g,
            "$1"
          );
          return JSON.parse(sanitizedRepaired);
        } catch (err4) {
          // 7. Last-ditch extraction: pull out whatever fields exist using Regex
          try {
            const pluginNameMatch = raw.match(/"pluginName"\s*:\s*"([^"]+)"/i);
            const packageNameMatch = raw.match(/"packageName"\s*:\s*"([^"]+)"/i);
            const summaryMatch = raw.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/i);

            if (pluginNameMatch || summaryMatch) {
              const summary = summaryMatch
                ? summaryMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"')
                : "";
              return {
                pluginName: pluginNameMatch ? pluginNameMatch[1] : undefined,
                packageName: packageNameMatch ? packageNameMatch[1] : undefined,
                summary: summary,
                files: [],
                commands: [],
                permissions: [],
              } as unknown as T;
            }
          } catch {
            // Ignore fallback regex error
          }

          throw new Error(
            `Błąd parsowania odpowiedzi JSON: ${(err1 as Error).message}`
          );
        }
      }
    }
  }
}

