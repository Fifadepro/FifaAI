export interface ProjectFile {
  path: string;
  fileName: string;
  type: "java" | "yaml" | "xml" | "markdown" | "json";
  content: string;
}

export interface CommandInfo {
  name: string;
  description?: string;
  usage?: string;
  permission?: string;
  aliases?: string[];
}

export interface PermissionInfo {
  node: string;
  name?: string;
  description?: string;
  default?: string;
}

export interface TestScenario {
  command: string;
  sender: "Player" | "Console";
  expectedOutput: string;
  description?: string;
}

export interface GuiMenuItem {
  slot: number;
  material: string;
  name: string;
  amount?: number;
  lore?: string[];
  enchanted?: boolean;
  actionKey?: string;
  active?: boolean;
  commandOnClick?: string;
  targetMenuId?: string; // If this item opens a sub-category / another GUI
}

export interface GuiMenuDefinition {
  id: string;
  title: string;
  rows: number; // 1 to 6
  triggerCommand?: string;
  parentMenuId?: string; // If this is a sub-category
  categoryName?: string;
  items: GuiMenuItem[];
}

export interface PluginProject {
  pluginName: string;
  packageName: string;
  version: string;
  platform: string;
  minecraftVersion: string;
  summary: string;
  commands: CommandInfo[];
  permissions: PermissionInfo[];
  files: ProjectFile[];
  testScenarios?: TestScenario[];
  guiMenus?: GuiMenuDefinition[];
}

export interface GenerationSettings {
  pluginName: string;
  packageName: string;
  platform: "Paper" | "Spigot" | "Purpur" | "Bukkit" | "Fabric";
  minecraftVersion: "1.21" | "1.20.4" | "1.20.2" | "1.19.4" | "1.16.5" | "1.12.2";
  javaVersion: "Java 21" | "Java 17" | "Java 8";
  buildTool: "Maven" | "Gradle";
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: "image" | "code" | "log" | "config" | "document" | "other";
  mimeType: string;
  size: number;
  base64?: string;
  rawBase64?: string;
  content?: string;
  previewUrl?: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  attachments?: MessageAttachment[];
  projectSnapshot?: PluginProject;
  isStreaming?: boolean;
  rawStreamingCode?: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  role: "player" | "console" | "system" | "plugin";
  text: string;
  timestamp: string;
}

export interface ConversationSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ConversationMessage[];
  project: PluginProject;
  settings: GenerationSettings;
  activeFilePath?: string;
}
