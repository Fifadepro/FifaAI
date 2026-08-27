import React, { useState, useEffect } from "react";
import { getCandidateTextureUrls } from "../utils/minecraftTextures";
import { MinecraftSvgFallback } from "./MinecraftSvgFallback";

interface MinecraftItemIconProps {
  material: string;
  enchanted?: boolean;
  className?: string;
  size?: number;
}

export const MinecraftItemIcon: React.FC<MinecraftItemIconProps> = ({
  material,
  enchanted = false,
  className = "w-7 h-7 sm:w-8 sm:h-8",
}) => {
  const candidates = getCandidateTextureUrls(material);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [allFailed, setAllFailed] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setAllFailed(false);
  }, [material]);

  const handleImageError = () => {
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex((prev) => prev + 1);
    } else {
      setAllFailed(true);
    }
  };

  const currentUrl = candidates[candidateIndex];

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      {/* Authentic Minecraft Enchantment Glint */}
      {enchanted && (
        <div
          className="absolute inset-0 rounded pointer-events-none mix-blend-color-dodge opacity-90 z-20 animate-pulse"
          style={{
            background: "radial-gradient(circle, rgba(216, 180, 254, 0.95) 0%, rgba(168, 85, 247, 0.5) 60%, transparent 100%)",
            boxShadow: "0 0 12px rgba(168, 85, 247, 0.8)",
          }}
        />
      )}

      {/* Main Texture */}
      {!allFailed ? (
        <img
          key={`${material}-${currentUrl}`}
          src={currentUrl}
          alt={material}
          onError={handleImageError}
          className="w-full h-full object-contain [image-rendering:pixelated] transition-transform duration-100 group-hover:scale-110 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
          referrerPolicy="no-referrer"
          loading="eager"
        />
      ) : (
        <MinecraftSvgFallback
          material={material}
          className="w-full h-full object-contain [image-rendering:pixelated] transition-transform duration-100 group-hover:scale-110 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
        />
      )}

      {/* Enchantment Star Sparkle */}
      {enchanted && (
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 z-30 pointer-events-none">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-200"></span>
        </span>
      )}
    </div>
  );
};
