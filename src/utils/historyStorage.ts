import { ConversationSession, PluginProject, GenerationSettings, ConversationMessage } from "../types";

const STORAGE_KEY = "fifaai_minecraft_plugin_sessions";
const ACTIVE_SESSION_KEY = "fifaai_active_session_id";

export function loadAllSessions(): ConversationSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const sessions = JSON.parse(raw);
    if (Array.isArray(sessions)) {
      return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    return [];
  } catch (e) {
    console.error("Failed to load sessions from localStorage:", e);
    return [];
  }
}

export function getSession(id: string): ConversationSession | null {
  const sessions = loadAllSessions();
  return sessions.find((s) => s.id === id) || null;
}

export function saveSession(session: ConversationSession): void {
  try {
    const sessions = loadAllSessions();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);
    
    // Auto-derive clean title if empty or default
    let title = session.title;
    if (!title || title === "Nowa rozmowa" || title === "Nowy plugin") {
      const firstUserMsg = session.messages.find((m) => m.role === "user");
      if (firstUserMsg && firstUserMsg.content) {
        title = firstUserMsg.content.slice(0, 45).trim() + (firstUserMsg.content.length > 45 ? "..." : "");
      } else if (session.project && session.project.pluginName) {
        title = session.project.pluginName;
      } else {
        title = "Plugin " + new Date().toLocaleDateString("pl-PL");
      }
    }

    const updatedSession: ConversationSession = {
      ...session,
      title,
      updatedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      sessions[existingIndex] = updatedSession;
    } else {
      sessions.unshift(updatedSession);
    }

    // Limit stored sessions to 50 to prevent localStorage quota exhaustion
    const trimmed = sessions.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error("Failed to save session to localStorage:", e);
  }
}

export function deleteSession(id: string): ConversationSession[] {
  try {
    const sessions = loadAllSessions().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return sessions;
  } catch (e) {
    console.error("Failed to delete session:", e);
    return [];
  }
}

export function renameSession(id: string, newTitle: string): ConversationSession[] {
  try {
    const sessions = loadAllSessions();
    const target = sessions.find((s) => s.id === id);
    if (target) {
      target.title = newTitle.trim() || target.title;
      target.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
    return sessions;
  } catch (e) {
    console.error("Failed to rename session:", e);
    return [];
  }
}

export function clearAllSessions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch (e) {
    console.error("Failed to clear sessions:", e);
  }
}

export function getStoredActiveSessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch {
    return null;
  }
}

export function setStoredActiveSessionId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_SESSION_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  } catch {}
}

export function exportSessionsToJson(): string {
  const sessions = loadAllSessions();
  return JSON.stringify(sessions, null, 2);
}

export function importSessionsFromJson(jsonStr: string): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) {
      return { success: false, count: 0, error: "Nieprawidłowy format pliku JSON." };
    }
    const current = loadAllSessions();
    const existingIds = new Set(current.map((s) => s.id));
    
    let added = 0;
    for (const item of parsed) {
      if (item.id && Array.isArray(item.messages) && item.project) {
        if (!existingIds.has(item.id)) {
          current.push(item);
          added++;
        }
      }
    }

    current.sort((a, b) => b.updatedAt - a.updatedAt);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current.slice(0, 50)));
    return { success: true, count: added };
  } catch (e: any) {
    return { success: false, count: 0, error: e.message || "Błąd parsowania pliku JSON." };
  }
}
