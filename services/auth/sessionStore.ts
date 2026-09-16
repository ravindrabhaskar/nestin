import { Request } from "express";
import { UserSession } from "./types.js";

class SessionStore {
  // In-Memory store indexed by sessionId
  private sessions: Map<string, UserSession> = new Map();

  constructor() {
    // Seed sample initial active sessions
    this.sessions.set("sess-owner-001", {
      id: "sess-owner-001",
      userId: "owner-001",
      token: "initial-token-owner",
      device: "MacBook Pro (macOS 15.4)",
      browser: "Chrome 128.0",
      location: "Hyderabad, Telangana, IN",
      ip: "49.204.128.45",
      lastActive: "Active Now",
      createdAt: new Date().toISOString(),
      isValid: true,
    });

    this.sessions.set("sess-tenant-001", {
      id: "sess-tenant-001",
      userId: "tenant-001",
      token: "initial-token-tenant",
      device: "iPhone 15 Pro (iOS 18.2)",
      browser: "Safari Mobile",
      location: "Bengaluru, Karnataka, IN",
      ip: "157.48.21.90",
      lastActive: "Active Now",
      createdAt: new Date().toISOString(),
      isValid: true,
    });
  }

  /**
   * Parses user agent and client IP to produce human-readable session metadata
   */
  private parseClientMetadata(req: Request) {
    const userAgent = req.headers["user-agent"] || "";
    let device = "Desktop Workstation";
    let browser = "Web Browser";

    if (/iphone|ipad|ipod/i.test(userAgent)) {
      device = "Apple iOS Device";
      browser = "Safari Mobile";
    } else if (/android/i.test(userAgent)) {
      device = "Android Device";
      browser = "Chrome Mobile";
    } else if (/macintosh|mac os x/i.test(userAgent)) {
      device = "MacBook / Mac OS";
      browser = userAgent.includes("Chrome") ? "Chrome for Mac" : "Safari";
    } else if (/windows/i.test(userAgent)) {
      device = "Windows PC";
      browser = userAgent.includes("Chrome") ? "Chrome for Windows" : "Edge";
    } else if (/linux/i.test(userAgent)) {
      device = "Linux Machine";
      browser = "Linux Browser";
    }

    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      "127.0.0.1";

    return {
      device,
      browser,
      location: "India (Hyderabad / Bengaluru Hub)",
      ip,
    };
  }

  /**
   * Registers a new active session
   */
  createSession(userId: string, req: Request, token = ""): UserSession {
    const sessionId = `sess-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const metadata = this.parseClientMetadata(req);

    const session: UserSession = {
      id: sessionId,
      userId,
      token,
      device: metadata.device,
      browser: metadata.browser,
      location: metadata.location,
      ip: metadata.ip,
      lastActive: "Active Now",
      createdAt: new Date().toISOString(),
      isValid: true,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Retrieves a session by ID
   */
  getSession(sessionId: string): UserSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Retrieves all valid sessions belonging to a specific user
   */
  getUserSessions(userId: string, currentSessionId?: string): UserSession[] {
    const results: UserSession[] = [];
    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.isValid) {
        results.push({
          ...session,
          isCurrent: session.id === currentSessionId,
        });
      }
    }
    // Return newest sessions first
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Updates last active timestamp for a session
   */
  touchSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && session.isValid) {
      session.lastActive = "Active Now";
    }
  }

  /**
   * Revokes an active session
   */
  revokeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isValid = false;
      this.sessions.delete(sessionId);
      return true;
    }
    return false;
  }

  /**
   * Revokes all active sessions for a user
   */
  revokeAllUserSessions(userId: string): void {
    for (const [id, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        session.isValid = false;
        this.sessions.delete(id);
      }
    }
  }

  /**
   * Checks if session is valid
   */
  isSessionValid(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return !!session && session.isValid;
  }
}

export const sessionStore = new SessionStore();
