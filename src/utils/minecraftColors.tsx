import React from "react";

const MC_COLOR_MAP: Record<string, string> = {
  "0": "#000000", // Black
  "1": "#0000AA", // Dark Blue
  "2": "#00AA00", // Dark Green
  "3": "#00AAAA", // Dark Aqua
  "4": "#AA0000", // Dark Red
  "5": "#AA00AA", // Dark Purple
  "6": "#FFAA00", // Gold
  "7": "#AAAAAA", // Gray
  "8": "#555555", // Dark Gray
  "9": "#5555FF", // Blue
  "a": "#55FF55", // Green
  "b": "#55FFFF", // Aqua
  "c": "#FF5555", // Red
  "d": "#FF55FF", // Light Purple
  "e": "#FFFF55", // Yellow
  "f": "#FFFFFF", // White
};

export interface FormattedSegment {
  text: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

export function parseMinecraftText(input: string): FormattedSegment[] {
  if (!input) return [];

  // Normalize § to &
  const text = input.replace(/§/g, "&");
  const segments: FormattedSegment[] = [];

  let currentColor = "#FFFFFF";
  let isBold = false;
  let isItalic = false;
  let isUnderline = false;
  let isStrikethrough = false;

  let currentBuffer = "";

  const pushCurrent = () => {
    if (currentBuffer.length > 0) {
      segments.push({
        text: currentBuffer,
        color: currentColor,
        bold: isBold,
        italic: isItalic,
        underline: isUnderline,
        strikethrough: isStrikethrough,
      });
      currentBuffer = "";
    }
  };

  for (let i = 0; i < text.length; i++) {
    if (text[i] === "&" && i + 1 < text.length) {
      const code = text[i + 1].toLowerCase();

      // Check for Hex color: &#RRGGBB
      if (code === "#" && i + 7 < text.length) {
        const hex = text.substring(i + 2, i + 8);
        if (/^[0-9a-fA-F]{6}$/.test(hex)) {
          pushCurrent();
          currentColor = `#${hex}`;
          i += 7;
          continue;
        }
      }

      if (MC_COLOR_MAP[code] !== undefined) {
        pushCurrent();
        currentColor = MC_COLOR_MAP[code];
        isBold = false;
        isItalic = false;
        isUnderline = false;
        isStrikethrough = false;
        i++;
        continue;
      } else if (code === "l") {
        pushCurrent();
        isBold = true;
        i++;
        continue;
      } else if (code === "o") {
        pushCurrent();
        isItalic = true;
        i++;
        continue;
      } else if (code === "n") {
        pushCurrent();
        isUnderline = true;
        i++;
        continue;
      } else if (code === "m") {
        pushCurrent();
        isStrikethrough = true;
        i++;
        continue;
      } else if (code === "r") {
        pushCurrent();
        currentColor = "#FFFFFF";
        isBold = false;
        isItalic = false;
        isUnderline = false;
        isStrikethrough = false;
        i++;
        continue;
      }
    }

    currentBuffer += text[i];
  }

  pushCurrent();
  return segments;
}

export function MinecraftTextRenderer({
  text,
  className = "",
  defaultColor = "#FFFFFF",
}: {
  text: string;
  className?: string;
  defaultColor?: string;
}) {
  const segments = parseMinecraftText(text);

  return (
    <span className={`font-mono inline-block ${className}`}>
      {segments.map((seg, idx) => (
        <span
          key={idx}
          style={{
            color: seg.color || defaultColor,
            fontWeight: seg.bold ? "bold" : "normal",
            fontStyle: seg.italic ? "italic" : "normal",
            textDecoration: [
              seg.underline ? "underline" : "",
              seg.strikethrough ? "line-through" : "",
            ]
              .filter(Boolean)
              .join(" ") || "none",
            textShadow: "1px 1px 0px rgba(0,0,0,0.7)",
          }}
        >
          {seg.text}
        </span>
      ))}
    </span>
  );
}
