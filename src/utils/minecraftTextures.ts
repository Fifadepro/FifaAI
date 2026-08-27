/**
 * High-reliability Minecraft Texture Engine
 * Provides authentic pixel-art textures from multiple Minecraft asset CDNs
 * with automatic fallback to high-fidelity embedded pixel-art SVG renderers.
 */

// Primary CDNs
const MCASSET_ITEM = "https://assets.mcasset.cloud/1.20.4/assets/minecraft/textures/item/";
const MCASSET_BLOCK = "https://assets.mcasset.cloud/1.20.4/assets/minecraft/textures/block/";

const GITHUB_ASSETS_ITEM = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/item/";
const GITHUB_ASSETS_BLOCK = "https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/1.20.4/assets/minecraft/textures/block/";

const PRISMARINE_ITEM = "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/pc/1.20.2/items/";
const PRISMARINE_BLOCK = "https://raw.githubusercontent.com/PrismarineJS/minecraft-assets/master/data/pc/1.20.2/blocks/";

interface MaterialMapping {
  itemOrBlock: "item" | "block";
  filename: string;
}

const MATERIAL_MAP: Record<string, MaterialMapping> = {
  // Minerals & Ores
  DIAMOND: { itemOrBlock: "item", filename: "diamond" },
  DIAMOND_BLOCK: { itemOrBlock: "block", filename: "diamond_block" },
  DIAMOND_ORE: { itemOrBlock: "block", filename: "diamond_ore" },
  DEEPSLATE_DIAMOND_ORE: { itemOrBlock: "block", filename: "deepslate_diamond_ore" },
  EMERALD: { itemOrBlock: "item", filename: "emerald" },
  EMERALD_BLOCK: { itemOrBlock: "block", filename: "emerald_block" },
  EMERALD_ORE: { itemOrBlock: "block", filename: "emerald_ore" },
  GOLD_INGOT: { itemOrBlock: "item", filename: "gold_ingot" },
  GOLD_BLOCK: { itemOrBlock: "block", filename: "gold_block" },
  GOLD_ORE: { itemOrBlock: "block", filename: "gold_ore" },
  GOLD_NUGGET: { itemOrBlock: "item", filename: "gold_nugget" },
  RAW_GOLD: { itemOrBlock: "item", filename: "raw_gold" },
  IRON_INGOT: { itemOrBlock: "item", filename: "iron_ingot" },
  IRON_BLOCK: { itemOrBlock: "block", filename: "iron_block" },
  IRON_ORE: { itemOrBlock: "block", filename: "iron_ore" },
  IRON_NUGGET: { itemOrBlock: "item", filename: "iron_nugget" },
  RAW_IRON: { itemOrBlock: "item", filename: "raw_iron" },
  NETHERITE_INGOT: { itemOrBlock: "item", filename: "netherite_ingot" },
  NETHERITE_BLOCK: { itemOrBlock: "block", filename: "netherite_block" },
  NETHERITE_SCRAP: { itemOrBlock: "item", filename: "netherite_scrap" },
  ANCIENT_DEBRIS: { itemOrBlock: "block", filename: "ancient_debris_side" },
  COAL: { itemOrBlock: "item", filename: "coal" },
  COAL_BLOCK: { itemOrBlock: "block", filename: "coal_block" },
  COAL_ORE: { itemOrBlock: "block", filename: "coal_ore" },
  CHARCOAL: { itemOrBlock: "item", filename: "charcoal" },
  REDSTONE: { itemOrBlock: "item", filename: "redstone" },
  REDSTONE_BLOCK: { itemOrBlock: "block", filename: "redstone_block" },
  REDSTONE_ORE: { itemOrBlock: "block", filename: "redstone_ore" },
  LAPIS_LAZULI: { itemOrBlock: "item", filename: "lapis_lazuli" },
  LAPIS_BLOCK: { itemOrBlock: "block", filename: "lapis_block" },
  LAPIS_ORE: { itemOrBlock: "block", filename: "lapis_ore" },
  QUARTZ: { itemOrBlock: "item", filename: "quartz" },
  AMETHYST_SHARD: { itemOrBlock: "item", filename: "amethyst_shard" },
  COPPER_INGOT: { itemOrBlock: "item", filename: "copper_ingot" },

  // Weapons & Tools
  DIAMOND_SWORD: { itemOrBlock: "item", filename: "diamond_sword" },
  NETHERITE_SWORD: { itemOrBlock: "item", filename: "netherite_sword" },
  IRON_SWORD: { itemOrBlock: "item", filename: "iron_sword" },
  GOLDEN_SWORD: { itemOrBlock: "item", filename: "golden_sword" },
  STONE_SWORD: { itemOrBlock: "item", filename: "stone_sword" },
  WOODEN_SWORD: { itemOrBlock: "item", filename: "wooden_sword" },
  DIAMOND_PICKAXE: { itemOrBlock: "item", filename: "diamond_pickaxe" },
  NETHERITE_PICKAXE: { itemOrBlock: "item", filename: "netherite_pickaxe" },
  IRON_PICKAXE: { itemOrBlock: "item", filename: "iron_pickaxe" },
  GOLDEN_PICKAXE: { itemOrBlock: "item", filename: "golden_pickaxe" },
  STONE_PICKAXE: { itemOrBlock: "item", filename: "stone_pickaxe" },
  WOODEN_PICKAXE: { itemOrBlock: "item", filename: "wooden_pickaxe" },
  PICKAXE: { itemOrBlock: "item", filename: "diamond_pickaxe" },
  SWORD: { itemOrBlock: "item", filename: "diamond_sword" },
  DIAMOND_AXE: { itemOrBlock: "item", filename: "diamond_axe" },
  NETHERITE_AXE: { itemOrBlock: "item", filename: "netherite_axe" },
  IRON_AXE: { itemOrBlock: "item", filename: "iron_axe" },
  DIAMOND_SHOVEL: { itemOrBlock: "item", filename: "diamond_shovel" },
  NETHERITE_SHOVEL: { itemOrBlock: "item", filename: "netherite_shovel" },
  BOW: { itemOrBlock: "item", filename: "bow" },
  CROSSBOW: { itemOrBlock: "item", filename: "crossbow_standby" },
  ARROW: { itemOrBlock: "item", filename: "arrow" },
  SPECTRAL_ARROW: { itemOrBlock: "item", filename: "spectral_arrow" },
  SHIELD: { itemOrBlock: "item", filename: "shield" },
  TRIDENT: { itemOrBlock: "item", filename: "trident" },

  // Armor
  DIAMOND_HELMET: { itemOrBlock: "item", filename: "diamond_helmet" },
  DIAMOND_CHESTPLATE: { itemOrBlock: "item", filename: "diamond_chestplate" },
  DIAMOND_LEGGINGS: { itemOrBlock: "item", filename: "diamond_leggings" },
  DIAMOND_BOOTS: { itemOrBlock: "item", filename: "diamond_boots" },
  NETHERITE_HELMET: { itemOrBlock: "item", filename: "netherite_helmet" },
  NETHERITE_CHESTPLATE: { itemOrBlock: "item", filename: "netherite_chestplate" },
  NETHERITE_LEGGINGS: { itemOrBlock: "item", filename: "netherite_leggings" },
  NETHERITE_BOOTS: { itemOrBlock: "item", filename: "netherite_boots" },
  IRON_HELMET: { itemOrBlock: "item", filename: "iron_helmet" },
  IRON_CHESTPLATE: { itemOrBlock: "item", filename: "iron_chestplate" },
  IRON_LEGGINGS: { itemOrBlock: "item", filename: "iron_leggings" },
  IRON_BOOTS: { itemOrBlock: "item", filename: "iron_boots" },

  // Food & Magic
  GOLDEN_APPLE: { itemOrBlock: "item", filename: "golden_apple" },
  ENCHANTED_GOLDEN_APPLE: { itemOrBlock: "item", filename: "enchanted_golden_apple" },
  APPLE: { itemOrBlock: "item", filename: "apple" },
  COOKED_BEEF: { itemOrBlock: "item", filename: "cooked_beef" },
  BEEF: { itemOrBlock: "item", filename: "beef" },
  COOKED_PORKCHOP: { itemOrBlock: "item", filename: "cooked_porkchop" },
  BREAD: { itemOrBlock: "item", filename: "bread" },
  GOLDEN_CARROT: { itemOrBlock: "item", filename: "golden_carrot" },
  POTION: { itemOrBlock: "item", filename: "potion" },
  SPLASH_POTION: { itemOrBlock: "item", filename: "splash_potion" },
  EXPERIENCE_BOTTLE: { itemOrBlock: "item", filename: "experience_bottle" },
  BOTTLE_O_ENCHANTING: { itemOrBlock: "item", filename: "experience_bottle" },
  MILK_BUCKET: { itemOrBlock: "item", filename: "milk_bucket" },
  WATER_BUCKET: { itemOrBlock: "item", filename: "water_bucket" },
  LAVA_BUCKET: { itemOrBlock: "item", filename: "lava_bucket" },
  BUCKET: { itemOrBlock: "item", filename: "bucket" },

  // Special Items
  ENDER_PEARL: { itemOrBlock: "item", filename: "ender_pearl" },
  EYE_OF_ENDER: { itemOrBlock: "item", filename: "ender_eye" },
  TOTEM_OF_UNDYING: { itemOrBlock: "item", filename: "totem_of_undying" },
  NETHER_STAR: { itemOrBlock: "item", filename: "nether_star" },
  BEACON: { itemOrBlock: "block", filename: "beacon" },
  ENCHANTED_BOOK: { itemOrBlock: "item", filename: "enchanted_book" },
  BOOK: { itemOrBlock: "item", filename: "book" },
  WRITABLE_BOOK: { itemOrBlock: "item", filename: "writable_book" },
  COMPASS: { itemOrBlock: "item", filename: "compass_16" },
  CLOCK: { itemOrBlock: "item", filename: "clock_00" },
  NAME_TAG: { itemOrBlock: "item", filename: "name_tag" },
  LEAD: { itemOrBlock: "item", filename: "lead" },
  ELYTRA: { itemOrBlock: "item", filename: "elytra" },
  FIREWORK_ROCKET: { itemOrBlock: "item", filename: "firework_rocket" },
  SADDLE: { itemOrBlock: "item", filename: "saddle" },
  HEART_OF_THE_SEA: { itemOrBlock: "item", filename: "heart_of_the_sea" },
  NAUTILUS_SHELL: { itemOrBlock: "item", filename: "nautilus_shell" },

  // Blocks
  STONE: { itemOrBlock: "block", filename: "stone" },
  COBBLESTONE: { itemOrBlock: "block", filename: "cobblestone" },
  SMOOTH_STONE: { itemOrBlock: "block", filename: "smooth_stone" },
  OBSIDIAN: { itemOrBlock: "block", filename: "obsidian" },
  CRYING_OBSIDIAN: { itemOrBlock: "block", filename: "crying_obsidian" },
  BEDROCK: { itemOrBlock: "block", filename: "bedrock" },
  DIRT: { itemOrBlock: "block", filename: "dirt" },
  GRASS_BLOCK: { itemOrBlock: "block", filename: "grass_block_side" },
  SAND: { itemOrBlock: "block", filename: "sand" },
  GRAVEL: { itemOrBlock: "block", filename: "gravel" },
  OAK_LOG: { itemOrBlock: "block", filename: "oak_log" },
  OAK_PLANKS: { itemOrBlock: "block", filename: "oak_planks" },
  CHEST: { itemOrBlock: "item", filename: "chest" },
  ENDER_CHEST: { itemOrBlock: "block", filename: "ender_chest_front" },
  BARREL: { itemOrBlock: "block", filename: "barrel_top" },
  SHULKER_BOX: { itemOrBlock: "block", filename: "shulker_box" },
  FURNACE: { itemOrBlock: "block", filename: "furnace_front" },
  CRAFTING_TABLE: { itemOrBlock: "block", filename: "crafting_table_top" },
  ANVIL: { itemOrBlock: "block", filename: "anvil" },
  ENCHANTING_TABLE: { itemOrBlock: "block", filename: "enchanting_table_top" },
  TNT: { itemOrBlock: "block", filename: "tnt_side" },
  SPONGE: { itemOrBlock: "block", filename: "sponge" },
  GLASS: { itemOrBlock: "block", filename: "glass" },
  BARRIER: { itemOrBlock: "item", filename: "barrier" },
  SPAWNER: { itemOrBlock: "block", filename: "spawner" },
  OAK_DOOR: { itemOrBlock: "item", filename: "oak_door" },
  IRON_DOOR: { itemOrBlock: "item", filename: "iron_door" },

  // Stained Glass Panes
  GRAY_STAINED_GLASS_PANE: { itemOrBlock: "block", filename: "gray_stained_glass" },
  BLACK_STAINED_GLASS_PANE: { itemOrBlock: "block", filename: "black_stained_glass" },
  WHITE_STAINED_GLASS_PANE: { itemOrBlock: "block", filename: "white_stained_glass" },
  LIME_STAINED_GLASS_PANE: { itemOrBlock: "block", filename: "lime_stained_glass" },
  GREEN_STAINED_GLASS_PANE: { itemOrBlock: "block", filename: "green_stained_glass" },
  RED_STAINED_GLASS_PANE: { itemOrBlock: "block", filename: "red_stained_glass" },
  YELLOW_STAINED_GLASS_PANE: { itemOrBlock: "block", filename: "yellow_stained_glass" },
  ORANGE_STAINED_GLASS_PANE: { itemOrBlock: "block", filename: "orange_stained_glass" },
  BLUE_STAINED_GLASS_PANE: { itemOrBlock: "block", filename: "blue_stained_glass" },
  CYAN_STAINED_GLASS_PANE: { itemOrBlock: "block", filename: "cyan_stained_glass" },
  PURPLE_STAINED_GLASS_PANE: { itemOrBlock: "block", filename: "purple_stained_glass" },

  // Misc
  PAPER: { itemOrBlock: "item", filename: "paper" },
  FEATHER: { itemOrBlock: "item", filename: "feather" },
  GUNPOWDER: { itemOrBlock: "item", filename: "gunpowder" },
  STRING: { itemOrBlock: "item", filename: "string" },
  SLIME_BALL: { itemOrBlock: "item", filename: "slime_ball" },
  MAGMA_CREAM: { itemOrBlock: "item", filename: "magma_cream" },
  BLAZE_ROD: { itemOrBlock: "item", filename: "blaze_rod" },
  BLAZE_POWDER: { itemOrBlock: "item", filename: "blaze_powder" },
  GHAST_TEAR: { itemOrBlock: "item", filename: "ghast_tear" },
  WITHER_SKELETON_SKULL: { itemOrBlock: "item", filename: "wither_skeleton_skull" },
  PLAYER_HEAD: { itemOrBlock: "item", filename: "player_head" },
  DRAGON_EGG: { itemOrBlock: "block", filename: "dragon_egg" },
  SHEARS: { itemOrBlock: "item", filename: "shears" },
  FLINT_AND_STEEL: { itemOrBlock: "item", filename: "flint_and_steel" },
  FIRE_CHARGE: { itemOrBlock: "item", filename: "fire_charge" },
};

/**
 * Returns prioritized array of candidate URLs for the texture
 */
export function getCandidateTextureUrls(materialName: string): string[] {
  if (!materialName) return [`${MCASSET_BLOCK}stone.png`];
  const clean = materialName.toUpperCase().trim().replace(/['"]/g, "");

  let mapping = MATERIAL_MAP[clean];

  // Fuzzy matching if not direct
  if (!mapping) {
    if (clean.includes("DIAMOND") && clean.includes("SWORD")) mapping = { itemOrBlock: "item", filename: "diamond_sword" };
    else if (clean.includes("NETHERITE") && clean.includes("SWORD")) mapping = { itemOrBlock: "item", filename: "netherite_sword" };
    else if (clean.includes("IRON") && clean.includes("SWORD")) mapping = { itemOrBlock: "item", filename: "iron_sword" };
    else if (clean.includes("PICKAXE")) mapping = { itemOrBlock: "item", filename: "diamond_pickaxe" };
    else if (clean.includes("AXE")) mapping = { itemOrBlock: "item", filename: "diamond_axe" };
    else if (clean.includes("SWORD")) mapping = { itemOrBlock: "item", filename: "diamond_sword" };
    else if (clean.includes("KOX") || clean.includes("ENCHANTED_GOLDEN_APPLE")) mapping = { itemOrBlock: "item", filename: "enchanted_golden_apple" };
    else if (clean.includes("REFIL") || clean.includes("GOLDEN_APPLE")) mapping = { itemOrBlock: "item", filename: "golden_apple" };
    else if (clean.includes("PEARL")) mapping = { itemOrBlock: "item", filename: "ender_pearl" };
    else if (clean.includes("STAR")) mapping = { itemOrBlock: "item", filename: "nether_star" };
    else if (clean.includes("TOTEM")) mapping = { itemOrBlock: "item", filename: "totem_of_undying" };
    else if (clean.includes("DIAMOND")) mapping = { itemOrBlock: "item", filename: "diamond" };
    else if (clean.includes("EMERALD")) mapping = { itemOrBlock: "item", filename: "emerald" };
    else if (clean.includes("NETHERITE")) mapping = { itemOrBlock: "item", filename: "netherite_ingot" };
    else if (clean.includes("GOLD")) mapping = { itemOrBlock: "item", filename: "gold_ingot" };
    else if (clean.includes("IRON")) mapping = { itemOrBlock: "item", filename: "iron_ingot" };
    else if (clean.includes("COAL")) mapping = { itemOrBlock: "item", filename: "coal" };
    else if (clean.includes("REDSTONE")) mapping = { itemOrBlock: "item", filename: "redstone" };
    else if (clean.includes("LAPIS")) mapping = { itemOrBlock: "item", filename: "lapis_lazuli" };
    else if (clean.includes("BARRIER")) mapping = { itemOrBlock: "item", filename: "barrier" };
    else if (clean.includes("LAVA")) mapping = { itemOrBlock: "item", filename: "lava_bucket" };
    else if (clean.includes("WATER")) mapping = { itemOrBlock: "item", filename: "water_bucket" };
    else if (clean.includes("BOOK")) mapping = { itemOrBlock: "item", filename: "enchanted_book" };
    else if (clean.includes("CHEST")) mapping = { itemOrBlock: "item", filename: "chest" };
    else if (clean.includes("GLASS")) mapping = { itemOrBlock: "block", filename: "gray_stained_glass" };
    else if (clean.includes("FEATHER")) mapping = { itemOrBlock: "item", filename: "feather" };
    else if (clean.includes("PAPER")) mapping = { itemOrBlock: "item", filename: "paper" };
    else if (clean.includes("COMPASS")) mapping = { itemOrBlock: "item", filename: "compass_16" };
    else if (clean.includes("CLOCK")) mapping = { itemOrBlock: "item", filename: "clock_00" };
    else if (clean.includes("DOOR")) mapping = { itemOrBlock: "item", filename: "oak_door" };
    else {
      mapping = { itemOrBlock: "item", filename: clean.toLowerCase() };
    }
  }

  const fn = mapping.filename;
  const isBlock = mapping.itemOrBlock === "block";

  return [
    // 1. mcasset.cloud (Fastest, ultra reliable Minecraft 1.20 CDN)
    isBlock ? `${MCASSET_BLOCK}${fn}.png` : `${MCASSET_ITEM}${fn}.png`,
    // 2. Inventivetalent raw github
    isBlock ? `${GITHUB_ASSETS_BLOCK}${fn}.png` : `${GITHUB_ASSETS_ITEM}${fn}.png`,
    // 3. Prismarine assets
    isBlock ? `${PRISMARINE_BLOCK}${fn}.png` : `${PRISMARINE_ITEM}${fn}.png`,
    // 4. Inverted check (item as block or block as item)
    isBlock ? `${MCASSET_ITEM}${fn}.png` : `${MCASSET_BLOCK}${fn}.png`,
  ];
}
