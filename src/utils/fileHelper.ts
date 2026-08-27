export interface MessageAttachment {
  id: string;
  name: string;
  type: "image" | "code" | "log" | "config" | "document" | "other";
  mimeType: string;
  size: number;
  base64?: string; // Data URL format (data:image/png;base64,...)
  rawBase64?: string; // Pure Base64 without header for Gemini inlineData
  content?: string; // Decoded string content for logs, code, text, configs
  previewUrl?: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function detectFileType(fileName: string, mimeType: string): MessageAttachment["type"] {
  const lowerName = fileName.toLowerCase();
  const lowerMime = mimeType.toLowerCase();

  if (
    lowerMime.startsWith("image/") ||
    lowerName.match(/\.(png|jpe?g|webp|gif|svg|bmp|ico)$/i)
  ) {
    return "image";
  }

  if (
    lowerName.endsWith(".log") ||
    lowerName.includes("crash") ||
    lowerName.includes("error") ||
    lowerName.includes("latest.log")
  ) {
    return "log";
  }

  if (
    lowerName.match(/\.(yml|yaml|json|toml|properties|ini|conf|cfg|xml)$/i)
  ) {
    return "config";
  }

  if (
    lowerName.match(
      /\.(java|kt|kts|ts|tsx|js|jsx|py|cpp|c|cs|h|html|css|scss|php|sql|sh|bat)$/i
    )
  ) {
    return "code";
  }

  if (lowerName.match(/\.(txt|md|markdown|pdf|doc|docx)$/i)) {
    return "document";
  }

  return "other";
}

/**
 * Processes a File instance into a structured MessageAttachment with
 * Base64 encoding for images and text parsing for logs/code/config.
 */
export async function processUploadedFile(file: File): Promise<MessageAttachment> {
  const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const mimeType = file.type || "application/octet-stream";
  const type = detectFileType(file.name, mimeType);
  const size = file.size;

  if (type === "image") {
    const dataUrl = await readFileAsDataURL(file);
    const rawBase64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;

    return {
      id,
      name: file.name,
      type: "image",
      mimeType: mimeType.startsWith("image/") ? mimeType : "image/png",
      size,
      base64: dataUrl,
      rawBase64,
      previewUrl: dataUrl,
    };
  }

  // If text, code, log, config, document or small file (< 2MB)
  if (
    type === "code" ||
    type === "config" ||
    type === "log" ||
    type === "document" ||
    size <= 2 * 1024 * 1024
  ) {
    try {
      const textContent = await readFileAsText(file);
      const dataUrl = await readFileAsDataURL(file).catch(() => undefined);
      const rawBase64 = dataUrl && dataUrl.includes(",") ? dataUrl.split(",")[1] : undefined;

      return {
        id,
        name: file.name,
        type,
        mimeType: mimeType || "text/plain",
        size,
        content: textContent,
        base64: dataUrl,
        rawBase64,
      };
    } catch {
      // Fallback to binary representation
      const dataUrl = await readFileAsDataURL(file);
      const rawBase64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      return {
        id,
        name: file.name,
        type,
        mimeType,
        size,
        base64: dataUrl,
        rawBase64,
      };
    }
  }

  // Fallback for large files
  const dataUrl = await readFileAsDataURL(file);
  const rawBase64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;

  return {
    id,
    name: file.name,
    type,
    mimeType,
    size,
    base64: dataUrl,
    rawBase64,
  };
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file, "UTF-8");
  });
}
