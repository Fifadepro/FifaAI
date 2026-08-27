import React from "react";

interface SvgFallbackProps {
  material: string;
  className?: string;
}

export const MinecraftSvgFallback: React.FC<SvgFallbackProps> = ({ material, className = "w-full h-full" }) => {
  const mat = (material || "STONE").toUpperCase();

  // Diamond
  if (mat.includes("DIAMOND") && !mat.includes("SWORD") && !mat.includes("PICKAXE") && !mat.includes("BLOCK")) {
    return (
      <svg viewBox="0 0 16 16" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 2H11V4H13V7H11V9H9V12H7V14H6V12H4V9H2V7H4V4H5V2Z" fill="#55FFFF" />
        <path d="M6 3H10V5H12V7H10V9H8V11H7V9H5V7H3V5H5V3Z" fill="#E0FFFF" />
        <path d="M6 4H9V6H11V7H9V8H7V10H6V8H4V7H6V4Z" fill="#FFFFFF" />
        <path d="M5 2H11V3H5V2ZM11 4H13V5H11V4ZM11 7H13V8H11V7ZM9 9H11V10H9V9ZM7 12H9V13H7V12ZM4 4H2V5H4V4ZM4 7H2V8H4V7ZM6 9H4V10H6V9ZM6 12H7V14H6V12Z" fill="#00AAAA" />
      </svg>
    );
  }

  // Emerald
  if (mat.includes("EMERALD") && !mat.includes("BLOCK")) {
    return (
      <svg viewBox="0 0 16 16" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 3H12V5H14V11H12V13H4V11H2V5H4V3Z" fill="#55FF55" />
        <path d="M5 4H11V6H13V10H11V12H5V10H3V6H5V4Z" fill="#17DD62" />
        <path d="M6 5H10V7H11V9H10V11H6V9H5V7H6V5Z" fill="#E8FFE8" />
        <path d="M4 3H12V4H4V3ZM12 5H14V6H12V5ZM12 11H14V12H12V11ZM4 13H12V14H4V13ZM2 5H4V6H2V5ZM2 11H4V12H2V11Z" fill="#00AA00" />
      </svg>
    );
  }

  // Gold Ingot
  if (mat.includes("GOLD_INGOT") || mat.includes("GOLDEN_INGOT")) {
    return (
      <svg viewBox="0 0 16 16" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 6H13V11H3V6Z" fill="#FFAA00" />
        <path d="M4 5H12V7H4V5Z" fill="#FFFF55" />
        <path d="M4 6H11V8H4V6Z" fill="#FFFFAA" />
        <path d="M3 11H13V12H3V11ZM2 6H3V11H2V6ZM13 6H14V11H13V6ZM3 5H4V6H3V5ZM12 5H13V6H12V5Z" fill="#AA7700" />
      </svg>
    );
  }

  // Iron Ingot
  if (mat.includes("IRON_INGOT")) {
    return (
      <svg viewBox="0 0 16 16" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 6H13V11H3V6Z" fill="#D8D8D8" />
        <path d="M4 5H12V7H4V5Z" fill="#FFFFFF" />
        <path d="M4 6H11V8H4V6Z" fill="#EFEFEF" />
        <path d="M3 11H13V12H3V11ZM2 6H3V11H2V6ZM13 6H14V11H13V6ZM3 5H4V6H3V5ZM12 5H13V6H12V5Z" fill="#888888" />
      </svg>
    );
  }

  // Netherite Ingot
  if (mat.includes("NETHERITE_INGOT") || mat.includes("NETHERITE")) {
    return (
      <svg viewBox="0 0 16 16" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 6H13V11H3V6Z" fill="#4B3F44" />
        <path d="M4 5H12V7H4V5Z" fill="#716268" />
        <path d="M4 6H11V8H4V6Z" fill="#918086" />
        <path d="M3 11H13V12H3V11ZM2 6H3V11H2V6ZM13 6H14V11H13V6ZM3 5H4V6H3V5ZM12 5H13V6H12V5Z" fill="#2E262A" />
      </svg>
    );
  }

  // Golden Apple / Kox
  if (mat.includes("GOLDEN_APPLE") || mat.includes("APPLE")) {
    const isEnchanted = mat.includes("ENCHANTED") || mat.includes("KOX");
    return (
      <svg viewBox="0 0 16 16" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 1H9V3H8V1Z" fill="#8B5A2B" />
        <path d="M9 2H11V3H9V2Z" fill="#55FF55" />
        <path d="M4 4H12V12H4V4Z" fill={isEnchanted ? "#FF55FF" : "#FFAA00"} />
        <path d="M5 5H8V8H5V5Z" fill={isEnchanted ? "#FFFFFF" : "#FFFF55"} />
        <path d="M5 4H11V5H5V4ZM4 5H5V11H4V5ZM11 5H12V11H11V5ZM5 12H11V13H5V12Z" fill={isEnchanted ? "#AA00AA" : "#CC7700"} />
      </svg>
    );
  }

  // Ender Pearl
  if (mat.includes("PEARL")) {
    return (
      <svg viewBox="0 0 16 16" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="6" fill="#0E4A48" />
        <circle cx="8" cy="8" r="4.5" fill="#1CD1B0" />
        <circle cx="6.5" cy="6.5" r="2" fill="#8CF6E4" />
        <circle cx="6" cy="6" r="0.8" fill="#FFFFFF" />
      </svg>
    );
  }

  // Nether Star
  if (mat.includes("STAR")) {
    return (
      <svg viewBox="0 0 16 16" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 1L10 6L15 8L10 10L8 15L6 10L1 8L6 6L8 1Z" fill="#FFFFFF" />
        <path d="M8 3L9.5 6.5L13 8L9.5 9.5L8 13L6.5 9.5L3 8L6.5 6.5L8 3Z" fill="#FFFF55" />
        <circle cx="8" cy="8" r="1.5" fill="#55FFFF" />
      </svg>
    );
  }

  // Barrier
  if (mat.includes("BARRIER")) {
    return (
      <svg viewBox="0 0 16 16" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="6" stroke="#FF0000" strokeWidth="2" fill="none" />
        <line x1="4" y1="4" x2="12" y2="12" stroke="#FF0000" strokeWidth="2" />
      </svg>
    );
  }

  // Sword
  if (mat.includes("SWORD")) {
    return (
      <svg viewBox="0 0 16 16" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2H14V4H12V2ZM10 4H12V6H10V4ZM8 6H10V8H8V6ZM6 8H8V10H6V8Z" fill="#55FFFF" />
        <path d="M4 10H6V12H4V10ZM3 11H5V13H3V11Z" fill="#8B5A2B" />
        <path d="M2 13H4V15H2V13Z" fill="#555555" />
      </svg>
    );
  }

  // Pickaxe
  if (mat.includes("PICKAXE")) {
    return (
      <svg viewBox="0 0 16 16" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 2H14V5H12V4H9V3H7V2Z" fill="#55FFFF" />
        <path d="M5 4H7V6H5V4ZM4 6H6V8H4V6ZM3 8H5V10H3V8ZM2 10H4V12H2V10ZM1 12H3V14H1V12Z" fill="#8B5A2B" />
      </svg>
    );
  }

  // Chest / Block
  if (mat.includes("CHEST")) {
    return (
      <svg viewBox="0 0 16 16" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="12" height="12" fill="#8B5A2B" stroke="#373737" strokeWidth="1" />
        <rect x="7" y="5" width="2" height="3" fill="#D8D8D8" stroke="#222222" strokeWidth="0.5" />
        <line x1="2" y1="6" x2="14" y2="6" stroke="#2B1A0D" strokeWidth="1" />
      </svg>
    );
  }

  // Lava Bucket
  if (mat.includes("LAVA")) {
    return (
      <svg viewBox="0 0 16 16" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 4H12V6H13V12H11V14H5V12H3V6H4V4Z" fill="#888888" />
        <path d="M5 6H11V10H10V12H6V10H5V6Z" fill="#FF5500" />
        <path d="M6 7H10V9H9V10H7V9H6V7Z" fill="#FFAA00" />
      </svg>
    );
  }

  // Glass Pane
  if (mat.includes("GLASS")) {
    return (
      <svg viewBox="0 0 16 16" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="10" height="10" fill="#555555" fillOpacity="0.4" stroke="#888888" strokeWidth="1" />
        <line x1="5" y1="5" x2="7" y2="7" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.8" />
        <line x1="9" y1="9" x2="11" y2="11" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.8" />
      </svg>
    );
  }

  // Default Stone Block
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="14" height="14" fill="#787878" stroke="#484848" strokeWidth="1" />
      <rect x="3" y="3" width="4" height="3" fill="#606060" />
      <rect x="9" y="5" width="4" height="3" fill="#909090" />
      <rect x="4" y="9" width="5" height="3" fill="#606060" />
      <rect x="10" y="10" width="3" height="3" fill="#909090" />
    </svg>
  );
};
