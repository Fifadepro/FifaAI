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
}

export interface GenerationSettings {
  pluginName: string;
  packageName: string;
  platform: "Paper" | "Spigot" | "Purpur" | "Bukkit" | "Fabric";
  minecraftVersion: "1.21" | "1.20.4" | "1.20.2" | "1.19.4" | "1.16.5" | "1.12.2";
  javaVersion: "Java 21" | "Java 17" | "Java 8";
  buildTool: "Maven" | "Gradle";
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
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
