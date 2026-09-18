import type {
  User,
  PhilosophyProfile,
  UserRecommendation,
  CompatibilityScore,
  DiscussionSummary,
  ConnectionIntent,
} from "@philosophy/contract";

export interface ApiClientOptions {
  baseUrl?: string;
  projectId?: string;
  authToken?: string;
}

export interface AuthSessionResponse {
  user: User;
  token?: {
    accessToken: string;
    refreshToken?: string;
  };
  accessToken?: string;
}

export class AgoraPhilosophyClient {
  private baseUrl: string;
  private projectId: string;
  private authToken: string;

  constructor(options?: ApiClientOptions) {
    this.baseUrl = options?.baseUrl || "/api";
    this.projectId = options?.projectId || "00000000-0000-0000-0000-000000000000";
    
    // Restore saved token from localStorage if available
    let storedToken = "";
    if (typeof window !== "undefined") {
      storedToken = localStorage.getItem("philosophy_auth_token") || "";
    }
    this.authToken = options?.authToken || storedToken || "";
  }

  setAuthToken(token: string) {
    this.authToken = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("philosophy_auth_token", token);
      } else {
        localStorage.removeItem("philosophy_auth_token");
      }
    }
  }

  getAuthToken(): string {
    return this.authToken;
  }

  setProjectId(projectId: string) {
    this.projectId = projectId;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const isCleanApi = this.baseUrl === "/api" || this.baseUrl === "/philosophy/api" || !this.baseUrl.includes("/v7");
    const url = isCleanApi ? `${this.baseUrl}${path}` : `${this.baseUrl}/${this.projectId}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
      ...(init?.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const extractedMessage =
        (typeof errorBody === "object" && errorBody !== null
          ? errorBody.error || errorBody.message || errorBody.detail || errorBody.code
          : null) || response.statusText;

      const userFriendlyMsg =
        extractedMessage && extractedMessage !== "OK" && extractedMessage !== "Bad Request" && extractedMessage !== "Conflict"
          ? extractedMessage
          : response.status === 409
          ? "Username or email is already taken"
          : response.status === 401
          ? "Invalid email or password"
          : response.status === 400
          ? "Invalid input data. Please check your fields."
          : response.status === 404
          ? "Resource not found"
          : `Request failed (HTTP ${response.status})`;

      throw new Error(userFriendlyMsg);
    }

    return response.json();
  }

  /**
   * POST /v7/:projectId/auth/sign-up
   */
  async signUp(data: {
    email: string;
    password?: string;
    username?: string;
    name?: string;
  }): Promise<AuthSessionResponse> {
    const res = await this.request<AuthSessionResponse>("/auth/sign-up", {
      method: "POST",
      body: JSON.stringify(data),
    });
    const token = res.accessToken || res.token?.accessToken;
    if (token) {
      this.setAuthToken(token);
    }
    return res;
  }

  /**
   * POST /v7/:projectId/auth/sign-in
   */
  async signIn(data: { email: string; password?: string }): Promise<AuthSessionResponse> {
    const res = await this.request<AuthSessionResponse>("/auth/sign-in", {
      method: "POST",
      body: JSON.stringify(data),
    });
    const token = res.accessToken || res.token?.accessToken;
    if (token) {
      this.setAuthToken(token);
    }
    return res;
  }

  /**
   * POST /v7/:projectId/auth/sign-out
   */
  async signOut(): Promise<{ success: boolean }> {
    try {
      await this.request<{ success: boolean }>("/auth/sign-out", {
        method: "POST",
      });
    } catch {
      // Ignore network sign-out failure
    } finally {
      this.setAuthToken("");
    }
    return { success: true };
  }

  /**
   * GET /v7/:projectId/auth/me
   */
  async getMe(): Promise<User> {
    return this.request<User>("/auth/me");
  }

  /**
   * Fetch user profile by ID
   */
  async getUser(userId: string): Promise<User> {
    return this.request<User>(`/users/${userId}`);
  }

  /**
   * Update user's full profile (name, avatar, bio, philosophyProfile)
   */
  async updateUserProfile(
    userId: string,
    data: {
      name?: string | null;
      username?: string | null;
      avatar?: string | null;
      bio?: string | null;
      philosophyProfile?: Partial<PhilosophyProfile> | null;
    }
  ): Promise<User> {
    return this.request<User>(`/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  /**
   * Update user's philosophical profile
   */
  async updatePhilosophyProfile(
    userId: string,
    philosophyProfile: Partial<PhilosophyProfile>
  ): Promise<User> {
    return this.updateUserProfile(userId, { philosophyProfile });
  }

  /**
   * GET /v7/:projectId/recommendations/people
   */
  async getPeopleRecommendations(params?: {
    connectionIntent?: ConnectionIntent;
    school?: string;
    thinker?: string;
    limit?: number;
  }): Promise<{ recommendations: UserRecommendation[] }> {
    const query = new URLSearchParams();
    if (params?.connectionIntent) query.set("connectionIntent", params.connectionIntent);
    if (params?.school) query.set("school", params.school);
    if (params?.thinker) query.set("thinker", params.thinker);
    if (params?.limit) query.set("limit", params.limit.toString());

    const queryString = query.toString() ? `?${query.toString()}` : "";
    const res = await this.request<any>(`/recommendations/people${queryString}`).catch(async () => {
      return await this.request<any>(`/users${queryString}`);
    });
    const list = res?.recommendations || res?.data || (Array.isArray(res) ? res : []);
    const mapped = (Array.isArray(list) ? list : []).map((u: any) => {
      const profile = u.philosophyProfile || u.user?.philosophyProfile || u.metadata?.philosophyProfile || {
        worldviewSummary: u.bio || u.user?.bio || "Exploring dialectics and truth.",
        primarySchools: u.metadata?.primarySchools || ["Rationalism"],
        keyThinkers: u.metadata?.keyThinkers || ["Descartes"],
      };
      return {
        user: {
          id: u.id || u.user?.id || "usr-001",
          name: u.name || u.user?.name || "Thinker Peer",
          username: u.username || u.user?.username || "thinker",
          avatar: u.avatar || u.user?.avatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
          bio: u.bio || u.user?.bio || "",
          reputation: u.reputation || u.user?.reputation || 500,
          philosophyProfile: profile,
        } as User,
        compatibility: u.compatibility || {
          overallPercentage: 85,
          alignmentCategory: "HIGH_ALIGNMENT",
          sharedGroundScore: 88,
          productiveTensionScore: 82,
          resonanceAreas: ["Epistemology", "Ethics"],
          dialecticalDivergences: ["Determinism vs Agency"],
          matchReasoning: "Strong resonance in rationalist foundations with engaging debate capacity.",
        },
      };
    });
    return { recommendations: mapped };
  }

  /**
   * GET /v7/:projectId/users/:id/compatibility
   */
  async getUserCompatibility(targetUserId: string): Promise<{ user: User; compatibility: CompatibilityScore }> {
    return this.request<{ user: User; compatibility: CompatibilityScore }>(`/users/${targetUserId}/compatibility`);
  }

  /**
   * GET /v7/:projectId/search/semantic
   */
  async searchSemantic(params: {
    q: string;
    type?: "all" | "users" | "entities" | "spaces";
    limit?: number;
  }): Promise<{
    query: string;
    type: string;
    count: number;
    data: Array<{
      type: "profile" | "entity" | "space";
      similarity: number;
      record: any;
    }>;
  }> {
    const query = new URLSearchParams({ q: params.q });
    if (params.type) query.set("type", params.type);
    if (params.limit) query.set("limit", params.limit.toString());

    return this.request(`/search/semantic?${query.toString()}`);
  }

  /**
   * GET /v7/:projectId/entities/:id/summary
   */
  async getDiscussionSummary(entityId: string): Promise<DiscussionSummary> {
    return this.request<DiscussionSummary>(`/entities/${entityId}/summary`);
  }

  /**
   * Philosophical Spaces & Community Circles
   */
  async getSpaces(category?: string): Promise<{ spaces: PhilosophicalSpace[] }> {
    try {
      const query = category ? `?category=${encodeURIComponent(category)}` : "";
      const res = await this.request<any>(`/spaces${query}`);
      const list = res?.spaces || res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(list) && list.length > 0) {
        const mapped = list.map((s: any) => ({
          id: s.id,
          name: s.name,
          slug: s.slug || s.shortId || s.id,
          description: s.description || "",
          category: s.category || s.metadata?.category || "school",
          primarySchool: s.primarySchool || s.metadata?.primarySchool || s.name,
          keyThinkers: s.keyThinkers || s.metadata?.keyThinkers || [],
          avatarImage: s.avatarImage || s.avatar || "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=200&q=80",
          membersCount: s.membersCount || s.members_count || 0,
          postsCount: s.postsCount || 0,
          isJoined: Boolean(s.isJoined),
          createdAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "Established",
        }));
        return { spaces: mapped };
      }
    } catch {}

    const filtered = category ? DEMO_SPACES.filter((s) => s.category === category || category === "all") : DEMO_SPACES;
    return { spaces: filtered.length > 0 ? filtered : DEMO_SPACES };
  }

  async getSpace(spaceId: string): Promise<{ space: PhilosophicalSpace }> {
    try {
      return await this.request<{ space: PhilosophicalSpace }>(`/spaces/${spaceId}`);
    } catch {
      const space = DEMO_SPACES.find((s) => s.id === spaceId) || DEMO_SPACES[0]!;
      return { space };
    }
  }

  async joinSpace(spaceId: string): Promise<{ success: boolean; space: PhilosophicalSpace }> {
    try {
      return await this.request<{ success: boolean; space: PhilosophicalSpace }>(`/spaces/${spaceId}/join`, {
        method: "POST",
      });
    } catch {
      const space = DEMO_SPACES.find((s) => s.id === spaceId);
      if (space) {
        if (!space.isJoined) {
          space.isJoined = true;
          space.membersCount += 1;
        }
        return { success: true, space };
      }
      return { success: false, space: DEMO_SPACES[0]! };
    }
  }

  async leaveSpace(spaceId: string): Promise<{ success: boolean; space: PhilosophicalSpace }> {
    try {
      return await this.request<{ success: boolean; space: PhilosophicalSpace }>(`/spaces/${spaceId}/leave`, {
        method: "POST",
      });
    } catch {
      const space = DEMO_SPACES.find((s) => s.id === spaceId);
      if (space) {
        if (space.isJoined) {
          space.isJoined = false;
          space.membersCount = Math.max(0, space.membersCount - 1);
        }
        return { success: true, space };
      }
      return { success: false, space: DEMO_SPACES[0]! };
    }
  }

  async createSpace(spaceData: {
    name: string;
    description: string;
    category?: "school" | "thinker" | "domain" | "general";
    primarySchool?: string;
    keyThinkers?: string[];
  }): Promise<PhilosophicalSpace> {
    try {
      return await this.request<PhilosophicalSpace>("/spaces", {
        method: "POST",
        body: JSON.stringify(spaceData),
      });
    } catch {
      const newSpace: PhilosophicalSpace = {
        id: `space-${Date.now()}`,
        name: spaceData.name,
        slug: spaceData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: spaceData.description,
        category: spaceData.category || "school",
        primarySchool: spaceData.primarySchool || "General Philosophy",
        keyThinkers: spaceData.keyThinkers || [],
        avatarImage: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=200&q=80",
        membersCount: 1,
        postsCount: 0,
        isJoined: true,
        createdAt: "Just now",
      };
      DEMO_SPACES.unshift(newSpace);
      return newSpace;
    }
  }

  /**
   * POST /v7/:projectId/spaces/seed-philosophy
   */
  async seedPhilosophySpaces(): Promise<{ count: number; created: PhilosophicalSpace[] }> {
    try {
      return await this.request<{ count: number; created: PhilosophicalSpace[] }>("/spaces/seed-philosophy", {
        method: "POST",
      });
    } catch {
      return { count: DEMO_SPACES.length, created: DEMO_SPACES };
    }
  }

  /**
   * Connection Requests & Notifications
   */
  async sendConnectionRequest(
    targetUserId: string,
    message?: string,
    targetUser?: User
  ): Promise<ConnectionRequest> {
    try {
      return await this.request<ConnectionRequest>("/connections/requests", {
        method: "POST",
        body: JSON.stringify({ targetUserId, message }),
      });
    } catch {
      const newReq: ConnectionRequest = {
        id: `req-${Date.now()}`,
        sender: targetUser || ({
          id: "00000000-0000-0000-0000-000000000001",
          name: "Jean-Paul Sartre",
          username: "sartre",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
        } as User),
        recipientId: targetUserId,
        message: message || "I would love to connect and exchange philosophical perspectives.",
        status: "pending",
        createdAt: "Just now",
      };
      DEMO_CONNECTION_REQUESTS.unshift(newReq);
      return newReq;
    }
  }

  async getConnectionRequests(): Promise<{ requests: ConnectionRequest[] }> {
    try {
      return await this.request<{ requests: ConnectionRequest[] }>("/connections/requests");
    } catch {
      return { requests: DEMO_CONNECTION_REQUESTS };
    }
  }

  async acceptConnectionRequest(requestId: string): Promise<{ success: boolean }> {
    try {
      return await this.request<{ success: boolean }>(`/connections/requests/${requestId}/accept`, {
        method: "POST",
      });
    } catch {
      const req = DEMO_CONNECTION_REQUESTS.find((r) => r.id === requestId);
      if (req) req.status = "accepted";
      const notif = DEMO_NOTIFICATIONS.find((n) => n.requestId === requestId);
      if (notif) notif.read = true;
      return { success: true };
    }
  }

  async declineConnectionRequest(requestId: string): Promise<{ success: boolean }> {
    try {
      return await this.request<{ success: boolean }>(`/connections/requests/${requestId}/decline`, {
        method: "POST",
      });
    } catch {
      const req = DEMO_CONNECTION_REQUESTS.find((r) => r.id === requestId);
      if (req) req.status = "declined";
      const notif = DEMO_NOTIFICATIONS.find((n) => n.requestId === requestId);
      if (notif) notif.read = true;
      return { success: true };
    }
  }

  async getNotifications(): Promise<{ notifications: PhilosophyNotification[]; unreadCount: number }> {
    try {
      return await this.request<{ notifications: PhilosophyNotification[]; unreadCount: number }>("/notifications");
    } catch {
      const unreadCount = DEMO_NOTIFICATIONS.filter((n) => !n.read).length;
      return { notifications: DEMO_NOTIFICATIONS, unreadCount };
    }
  }

  async markNotificationsRead(): Promise<{ success: boolean }> {
    try {
      return await this.request<{ success: boolean }>("/notifications/mark-read", {
        method: "POST",
      });
    } catch {
      DEMO_NOTIFICATIONS.forEach((n) => {
        n.read = true;
      });
      return { success: true };
    }
  }

  /**
   * Symposiums & Scheduled Events
   */
  async getEvents(params?: { type?: string; spaceId?: string; timeWindow?: "ongoing" | "upcoming" | "past" }): Promise<{ events: PhilosophyEvent[] }> {
    const query = new URLSearchParams();
    if (params?.type) {
      if (params.type === "live_now") {
        query.set("timeWindow", "ongoing");
      } else if (params.type === "online" || params.type === "physical" || params.type === "hybrid") {
        query.set("type", params.type);
      }
    }
    if (params?.timeWindow) query.set("timeWindow", params.timeWindow);
    if (params?.spaceId) query.set("spaceId", params.spaceId);
    const queryString = query.toString() ? `?${query.toString()}` : "";
    const res = await this.request<any>(`/events${queryString}`);
    const list = res?.events || res?.data || (Array.isArray(res) ? res : []);
    const mapped = (Array.isArray(list) ? list : []).map((e: any) => ({
      id: e.id,
      title: e.title,
      type: e.metadata?.eventType || e.type || "symposium",
      description: e.description || "",
      startTime: e.startTime || e.start_time,
      endTime: e.endTime || e.end_time,
      locationUrl: e.url || "https://agora.philosophy/symposium/live",
      hostUser: e.user || e.hostUser || {
        id: e.userId || "usr-creator",
        name: e.metadata?.hostName || "You (Event Organizer)",
        username: e.metadata?.hostHandle || "you",
        avatar: e.metadata?.hostAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
        philosophyProfile: {
          primarySchools: ["Philosophy"],
          keyThinkers: ["Socrates"],
        },
      },
      spaceId: e.spaceId,
      spaceName: e.metadata?.spaceName || "Philosophy Circle",
      maxCapacity: e.capacity || e.maxCapacity || 50,
      attendeeCount: e.rsvpCounts?.going ?? e.metadata?.attendeeCount ?? e.attendeeCount ?? 1,
      registeredCount: e.rsvpCounts?.going ?? e.metadata?.attendeeCount ?? e.attendeeCount ?? 1,
      activeViewers: e.activeViewers ?? e.metadata?.activeViewers ?? 0,
      userRsvpStatus: e.metadata?.userRsvpStatus || "not_going",
      tags: e.metadata?.tags || ["Ethics", "Dialogue"],
      createdAt: e.createdAt || new Date().toISOString(),
    }));

    // Filter out concluded events older than 1 day (24 hours)
    const ONE_DAY_MS = 24 * 3600 * 1000;
    const now = Date.now();
    const activeOrRecent = mapped.filter((ev: PhilosophyEvent) => {
      if (ev.endTime) {
        const endMs = new Date(ev.endTime).getTime();
        if (!isNaN(endMs) && endMs < now && (now - endMs > ONE_DAY_MS)) {
          return false;
        }
      }
      return true;
    });

    return { events: activeOrRecent };
  }

  async createEvent(data: {
    title: string;
    type: EventType;
    description: string;
    startTime: string;
    endTime?: string;
    locationUrl?: string;
    maxCapacity?: number;
    spaceId?: string;
    spaceName?: string;
    tags?: string[];
    hostUser?: User;
  }): Promise<PhilosophyEvent> {
    const hostName = data.hostUser?.name || data.hostUser?.username || "You (Event Organizer)";
    const hostHandle = data.hostUser?.username || "you";
    const hostAvatar = data.hostUser?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80";

    const defaultHost: User = data.hostUser || ({
      id: "00000000-0000-0000-0000-000000000001",
      name: hostName,
      username: hostHandle,
      avatar: hostAvatar,
      philosophyProfile: {
        primarySchools: ["Philosophy"],
        keyThinkers: ["Socrates"],
      },
    } as unknown as User);

    try {
      const apiPayload = {
        title: data.title,
        type: "online",
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime || undefined,
        url: data.locationUrl || "https://agora.philosophy/symposium/live",
        capacity: data.maxCapacity || 30,
        spaceId: data.spaceId || undefined,
        metadata: {
          eventType: data.type,
          spaceName: data.spaceName || "Philosophy Circle",
          tags: data.tags || ["Ethics", "Dialogue"],
          hostName,
          hostHandle,
          hostAvatar,
        },
      };

      const res = await this.request<any>("/events", {
        method: "POST",
        body: JSON.stringify(apiPayload),
      });

      const e = res?.event || res;
      const createdEvent: PhilosophyEvent = {
        id: e.id || `event-${Date.now()}`,
        title: e.title || data.title,
        type: e.metadata?.eventType || data.type,
        description: e.description || data.description,
        startTime: e.startTime || data.startTime,
        endTime: e.endTime || data.endTime,
        locationUrl: e.url || data.locationUrl || "https://agora.philosophy/symposium/live",
        hostUser: e.user || e.hostUser || defaultHost,
        spaceId: e.spaceId || data.spaceId,
        spaceName: e.metadata?.spaceName || data.spaceName || "Philosophy Circle",
        maxCapacity: e.capacity || data.maxCapacity || 30,
        attendeeCount: 1,
        userRsvpStatus: "going",
        tags: e.metadata?.tags || data.tags || ["Ethics", "Dialogue"],
        createdAt: e.createdAt || new Date().toISOString(),
      };

      // Unshift to client memory array as well
      DEMO_EVENTS.unshift(createdEvent);
      return createdEvent;
    } catch {
      const newEvent: PhilosophyEvent = {
        id: `event-${Date.now()}`,
        title: data.title,
        type: data.type,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        locationUrl: data.locationUrl || "https://agora.philosophy/symposium/live",
        hostUser: defaultHost,
        spaceId: data.spaceId,
        spaceName: data.spaceName,
        maxCapacity: data.maxCapacity || 30,
        attendeeCount: 1,
        userRsvpStatus: "going",
        tags: data.tags || ["Ethics", "Dialogue"],
        createdAt: new Date().toISOString(),
      };
      DEMO_EVENTS.unshift(newEvent);

      DEMO_RSVPS.unshift({
        id: `rsvp-${Date.now()}`,
        eventId: newEvent.id,
        user: newEvent.hostUser,
        status: "going",
        updatedAt: "Just now",
        createdAt: new Date().toISOString(),
      });

      return newEvent;
    }
  }

  async rsvpEvent(eventId: string, status: RSVPStatus): Promise<{ success: boolean; event: PhilosophyEvent }> {
    try {
      const res = await this.request<{ success: boolean; event: PhilosophyEvent }>(`/events/${eventId}/rsvp`, {
        method: "POST",
        body: JSON.stringify({ status }),
      });
      if (res?.event) {
        if (res.event.rsvpCounts?.going !== undefined) {
          res.event.registeredCount = res.event.rsvpCounts.going;
          res.event.attendeeCount = res.event.rsvpCounts.going;
        }
      }
      return res;
    } catch {
      const event = DEMO_EVENTS.find((e) => e.id === eventId);
      if (!event) throw new Error("Event not found");

      const existingRsvp = DEMO_RSVPS.find(
        (r) => r.eventId === eventId && r.user.id === "00000000-0000-0000-0000-000000000001"
      );

      const prevStatus = event.userRsvpStatus;
      event.userRsvpStatus = status;

      if (prevStatus !== "going" && status === "going") {
        event.attendeeCount += 1;
      } else if (prevStatus === "going" && status !== "going") {
        event.attendeeCount = Math.max(0, event.attendeeCount - 1);
      }
      event.registeredCount = event.attendeeCount;

      if (existingRsvp) {
        existingRsvp.status = status;
        existingRsvp.updatedAt = "Just now";
      } else {
        DEMO_RSVPS.push({
          id: `rsvp-${Date.now()}`,
          eventId,
          user: {
            id: "00000000-0000-0000-0000-000000000001",
            name: "Immanuel Kant",
            username: "kantian_critique",
            avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
          } as User,
          status,
          updatedAt: "Just now",
          createdAt: new Date().toISOString(),
        });
      }

      try {
        localStorage.setItem(`agora_rsvps_store_${eventId}`, JSON.stringify(DEMO_RSVPS.filter((r) => r.eventId === eventId)));
      } catch {}

      return { success: true, event };
    }
  }

  async getEventRsvps(eventId: string): Promise<{ rsvps: EventRSVP[] }> {
    try {
      return await this.request<{ rsvps: EventRSVP[] }>(`/events/${eventId}/rsvps`);
    } catch {
      const rsvps = DEMO_RSVPS.filter((r) => r.eventId === eventId);
      return { rsvps };
    }
  }

  private fallbackLiveStatusMap = new Map<string, any>();

  async getEventLiveStatus(eventId: string): Promise<{ liveStatus: { startTime: string; endTime: string | null; status: string; attendeeCount: number; activeViewers: number } | null }> {
    try {
      const res = await this.request<any>(`/events/${eventId}/live-status`);
      if (res && res.liveStatus !== undefined && res.liveStatus !== null) return { liveStatus: res.liveStatus };
    } catch {}

    if (this.fallbackLiveStatusMap.has(eventId)) {
      return { liveStatus: this.fallbackLiveStatusMap.get(eventId) };
    }

    try {
      const raw = localStorage.getItem(`agora_live_status_${eventId}`);
      if (raw) return { liveStatus: JSON.parse(raw) };
    } catch {}
    return {
      liveStatus: {
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
        status: "active",
        attendeeCount: 1,
        activeViewers: 1,
      },
    };
  }

  async updateEventLiveStatus(eventId: string, data: {
    action: "start" | "restart" | "end" | "update" | "join" | "leave" | "heartbeat";
    startTime?: string;
    endTime?: string;
    attendeeCount?: number;
    activeViewers?: number;
  }): Promise<{ success: boolean; liveStatus?: any }> {
    try {
      const res = await this.request<any>(`/events/${eventId}/live-status`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (res?.liveStatus) {
        try { localStorage.setItem(`agora_live_status_${eventId}`, JSON.stringify(res.liveStatus)); } catch {}
        this.fallbackLiveStatusMap.set(eventId, res.liveStatus);
        return res;
      }
    } catch {}

    // Fallback in-memory / local-storage live status sync
    try {
      const prev = this.fallbackLiveStatusMap.get(eventId) || (() => {
        try {
          const raw = localStorage.getItem(`agora_live_status_${eventId}`);
          return raw ? JSON.parse(raw) : null;
        } catch { return null; }
      })();

      let activeViewers = prev?.activeViewers ?? 0;
      if (typeof data.activeViewers === "number") activeViewers = data.activeViewers;
      else if (data.action === "join") activeViewers = activeViewers + 1;
      else if (data.action === "leave") activeViewers = Math.max(0, activeViewers - 1);
      else if (data.action === "start" || data.action === "restart") activeViewers = Math.max(1, activeViewers);
      else if (data.action === "end") activeViewers = 0;

      const updated = {
        startTime: data.startTime || prev?.startTime || new Date().toISOString(),
        endTime: data.endTime || prev?.endTime || (data.action === "end" ? new Date().toISOString() : new Date(Date.now() + 2 * 3600 * 1000).toISOString()),
        status: data.action === "end" ? "ended" : data.action === "restart" ? "restarted" : (prev?.status || "active"),
        attendeeCount: typeof data.attendeeCount === "number" ? data.attendeeCount : (prev?.attendeeCount ?? 1),
        activeViewers,
      };
      this.fallbackLiveStatusMap.set(eventId, updated);
      try { localStorage.setItem(`agora_live_status_${eventId}`, JSON.stringify(updated)); } catch {}
      return { success: true, liveStatus: updated };
    } catch {
      return { success: true };
    }
  }

  async joinLiveEvent(eventId: string): Promise<void> {
    await this.updateEventLiveStatus(eventId, { action: "join" });
  }

  async leaveLiveEvent(eventId: string): Promise<void> {
    await this.updateEventLiveStatus(eventId, { action: "leave" });
  }

  async getEventMessages(eventId: string): Promise<{ messages: any[] }> {
    try {
      const res = await this.request<any>(`/events/${eventId}/messages`);
      if (res?.messages) return { messages: res.messages };
    } catch {}

    try {
      const stored = localStorage.getItem(`agora_live_event_msgs_${eventId}`);
      if (stored) return { messages: JSON.parse(stored) };
    } catch {}
    return { messages: [] };
  }

  async postEventMessage(eventId: string, data: {
    authorName: string;
    authorHandle: string;
    authorAvatar?: string;
    stance: "thesis" | "antithesis" | "synthesis";
    content: string;
  }): Promise<{ message: any }> {
    const newMsg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      authorName: data.authorName,
      authorHandle: data.authorHandle,
      authorAvatar: data.authorAvatar,
      stance: data.stance,
      content: data.content,
      timestamp: "Just now",
      reactions: { upvotes: 0, fire: 0, insights: 0 },
    };

    try {
      await this.request<any>(`/events/${eventId}/messages`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    } catch {}

    try {
      const current = (await this.getEventMessages(eventId)).messages;
      const updated = [...current, newMsg];
      localStorage.setItem(`agora_live_event_msgs_${eventId}`, JSON.stringify(updated));
    } catch {}

    return { message: newMsg };
  }

  async reactToEventMessage(eventId: string, messageId: string, reactionType: "upvotes" | "fire" | "insights"): Promise<{ success: boolean; activeReaction?: string | null }> {
    let userReactionsMap: Record<string, string> = {};
    try {
      const raw = localStorage.getItem("agora_user_reactions_map");
      if (raw) userReactionsMap = JSON.parse(raw);
    } catch {}

    const prevReaction = userReactionsMap[messageId] || null;
    let newActiveReaction: "upvotes" | "fire" | "insights" | null = null;

    if (prevReaction === reactionType) {
      delete userReactionsMap[messageId];
      newActiveReaction = null;
    } else {
      userReactionsMap[messageId] = reactionType;
      newActiveReaction = reactionType;
    }

    try {
      localStorage.setItem("agora_user_reactions_map", JSON.stringify(userReactionsMap));
    } catch {}

    try {
      await this.request<any>(`/events/${eventId}/messages/${messageId}/react`, {
        method: "POST",
        body: JSON.stringify({ type: reactionType, prevType: prevReaction, activeReaction: newActiveReaction }),
      });
    } catch {}

    try {
      const current = (await this.getEventMessages(eventId)).messages;
      const updated = current.map((m: any) => {
        if (m.id === messageId) {
          const reactions = { ...(m.reactions || { upvotes: 0, fire: 0, insights: 0 }) };
          if (prevReaction === reactionType) {
            reactions[reactionType] = Math.max(0, (reactions[reactionType] || 0) - 1);
          } else {
            if (prevReaction && reactions[prevReaction as "upvotes" | "fire" | "insights"] > 0) {
              reactions[prevReaction as "upvotes" | "fire" | "insights"] -= 1;
            }
            reactions[reactionType] = (reactions[reactionType] || 0) + 1;
          }
          return { ...m, reactions };
        }
        return m;
      });
      localStorage.setItem(`agora_live_event_msgs_${eventId}`, JSON.stringify(updated));
    } catch {}

    return { success: true, activeReaction: newActiveReaction };
  }

  /**
   * Community Intellectual Leaderboard & Achievement Badges
   */
  async getLeaderboard(school?: string): Promise<{ entries: LeaderboardEntry[] }> {
    const query = school ? `?school=${encodeURIComponent(school)}` : "";
    const res = await this.request<any>(`/leaderboard${query}`).catch(async () => {
      return await this.request<any>(`/users${query}`);
    });
    const list = res?.entries || res?.data || (Array.isArray(res) ? res : []);
    const mapped = (Array.isArray(list) ? list : []).map((u: any, idx: number) => ({
      rank: idx + 1,
      user: {
        id: u.id || u.user?.id || `usr-${idx}`,
        name: u.name || u.user?.name || "Philosopher",
        username: u.username || u.user?.username || "thinker",
        avatar: u.avatar || u.user?.avatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
        bio: u.bio || u.user?.bio || "",
        reputation: u.reputation || u.user?.reputation || (1000 - idx * 100),
        philosophyProfile: u.metadata?.philosophyProfile || u.user?.philosophyProfile || {
          primarySchools: u.metadata?.primarySchools || ["Philosophy"],
          keyThinkers: u.metadata?.keyThinkers || [],
        },
      } as User,
      reputationPoints: u.reputation || u.user?.reputation || (1000 - idx * 100),
      primarySchool: u.metadata?.primarySchools?.[0] || u.primarySchool || "General Philosophy",
      argumentsCount: u.argumentsPublished || u.argumentsCount || 12,
      symposiumsHosted: u.symposiumsHosted || 5,
      trend: (u.trend || "same") as "up" | "down" | "same",
      badges: u.badges || ALL_PLATFORM_BADGES.slice(0, (idx % 3) + 1),
    }));
    return { entries: mapped };
  }

  async getUserBadges(userId: string): Promise<{ badges: PhilosophicalBadge[] }> {
    try {
      return await this.request<{ badges: PhilosophicalBadge[] }>(`/users/${userId}/badges`);
    } catch {
      const entry = DEMO_LEADERBOARD.find((e) => e.user.id === userId);
      return { badges: entry ? entry.badges : ALL_PLATFORM_BADGES };
    }
  }

  /**
   * Direct Conversations (DMs)
   */
  async getConversations(): Promise<{ conversations: DirectConversation[] }> {
    try {
      return await this.request<{ conversations: DirectConversation[] }>("/chat/conversations");
    } catch {
      // Fallback mock conversations for client demo
      return { conversations: DEMO_CONVERSATIONS };
    }
  }

  async createDirectConversation(targetUserId: string, targetUser?: User): Promise<DirectConversation> {
    try {
      return await this.request<DirectConversation>("/chat/conversations", {
        method: "POST",
        body: JSON.stringify({ participantId: targetUserId }),
      });
    } catch {
      // Return or create demo conversation
      const existing = DEMO_CONVERSATIONS.find((c) => c.participant.id === targetUserId);
      if (existing) return existing;

      const newConv: DirectConversation = {
        id: `conv-${Date.now()}`,
        participant: targetUser || ({
          id: targetUserId,
          name: "Philosopher Friend",
          username: "philosopher",
          bio: "Exploring ideas on Agora",
        } as User),
        lastMessage: "Conversation started",
        lastMessageTime: "Just now",
        unreadCount: 0,
      };
      DEMO_CONVERSATIONS.unshift(newConv);
      DEMO_MESSAGES[newConv.id] = [];
      return newConv;
    }
  }

  async getMessages(conversationId: string): Promise<{ messages: ChatMessage[] }> {
    try {
      return await this.request<{ messages: ChatMessage[] }>(`/chat/conversations/${conversationId}/messages`);
    } catch {
      return { messages: DEMO_MESSAGES[conversationId] || [] };
    }
  }

  async sendMessage(conversationId: string, content: string): Promise<ChatMessage> {
    try {
      return await this.request<ChatMessage>(`/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
    } catch {
      const msg: ChatMessage = {
        id: `msg-${Date.now()}`,
        conversationId,
        senderId: "00000000-0000-0000-0000-000000000001",
        senderName: "Jean-Paul Sartre",
        content,
        createdAt: "Just now",
      };
      if (!DEMO_MESSAGES[conversationId]) DEMO_MESSAGES[conversationId] = [];
      DEMO_MESSAGES[conversationId].push(msg);

      // Update last message in conv
      const conv = DEMO_CONVERSATIONS.find((c) => c.id === conversationId);
      if (conv) {
        conv.lastMessage = content;
        conv.lastMessageTime = "Just now";
      }

      return msg;
    }
  }

  /**
   * Philosophical Posts & Feed
   */
  async getPosts(): Promise<{ posts: PhilosophicalPost[] }> {
    const res = await this.request<any>("/entities");
    const list = res?.posts || res?.data || (Array.isArray(res) ? res : []);
    const mapped = (Array.isArray(list) ? list : []).map((p: any) => {
      const meta = p.metadata || {};
      return {
        id: p.id,
        title: p.title || "Untitled Debate",
        content: p.content || "",
        authorId: p.userId || "usr-001",
        authorName: meta.authorName || p.user?.name || "Anonymous Thinker",
        authorHandle: meta.authorHandle || p.user?.username || "thinker",
        authorAvatar: p.user?.avatar || meta.authorAvatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
        postType: meta.postType || "argument",
        primarySchool: meta.primarySchool || "General Philosophy",
        keyThinkers: meta.keyThinkers || [],
        upvotesCount: p.reactionCounts?.insightful || p.upvotesCount || 1,
        commentsCount: p.repliesCount || p.commentsCount || 0,
        createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "Recently",
      };
    });
    return { posts: mapped };
  }

  async createPost(postData: {
    title: string;
    content: string;
    postType: "argument" | "thought_experiment" | "question" | "essay" | "thesis";
    primarySchool?: string;
    keyThinkers?: string[];
    authorName?: string;
    authorHandle?: string;
    authorAvatar?: string;
  }): Promise<PhilosophicalPost> {
    const authorName = postData.authorName || "You (Thinker)";
    const authorHandle = postData.authorHandle || "you";
    const authorAvatar = postData.authorAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80";

    const payload = {
      title: postData.title,
      content: postData.content,
      metadata: {
        postType: postData.postType,
        primarySchool: postData.primarySchool || "General Philosophy",
        keyThinkers: postData.keyThinkers || [],
        authorName,
        authorHandle,
        authorAvatar,
      },
    };

    try {
      const res = await this.request<any>("/entities", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const meta = res?.metadata || payload.metadata;
      return {
        id: res?.id || `post-${Date.now()}`,
        title: res?.title || postData.title,
        content: res?.content || postData.content,
        authorId: res?.userId || "usr-current",
        authorName: meta.authorName || authorName,
        authorHandle: meta.authorHandle || authorHandle,
        authorAvatar: meta.authorAvatar || authorAvatar,
        postType: meta.postType || postData.postType,
        primarySchool: meta.primarySchool || "General Philosophy",
        keyThinkers: meta.keyThinkers || [],
        upvotesCount: 0,
        commentsCount: 0,
        createdAt: "Just now",
      };
    } catch {
      const newPost: PhilosophicalPost = {
        id: `post-${Date.now()}`,
        title: postData.title,
        content: postData.content,
        authorId: "usr-current",
        authorName,
        authorHandle,
        authorAvatar,
        postType: postData.postType,
        primarySchool: postData.primarySchool || "General Philosophy",
        keyThinkers: postData.keyThinkers || [],
        upvotesCount: 0,
        commentsCount: 0,
        createdAt: "Just now",
      };
      DEMO_POSTS.unshift(newPost);
      return newPost;
    }
  }

  /**
   * Philosophical Comments & Nested Debate Threads
   */
  async getComments(entityId: string): Promise<{ comments: PhilosophicalComment[] }> {
    try {
      const res = await this.request<any>(`/entities/${entityId}/comments`);
      const list = res?.comments || res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(list) && list.length > 0) {
        return { comments: list };
      }
    } catch {}

    try {
      const stored = localStorage.getItem(`agora_comments_${entityId}`);
      if (stored) return { comments: JSON.parse(stored) };
    } catch {}

    return { comments: DEMO_COMMENTS.filter((c) => c.entityId === entityId) };
  }

  async createComment(
    entityId: string,
    content: string,
    parentId?: string | null,
    stance?: "thesis" | "antithesis" | "synthesis",
    authorData?: { authorName?: string; authorHandle?: string; authorAvatar?: string }
  ): Promise<PhilosophicalComment> {
    const authorName = authorData?.authorName || "You (Thinker)";
    const authorHandle = authorData?.authorHandle || "you";
    const authorAvatar = authorData?.authorAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80";

    try {
      return await this.request<PhilosophicalComment>(`/entities/${entityId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content, parentId, stance, authorName, authorHandle, authorAvatar }),
      });
    } catch {
      const newComment: PhilosophicalComment = {
        id: `comment-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        entityId,
        authorId: "usr-current",
        authorName,
        authorHandle,
        authorAvatar,
        content,
        parentId: parentId || null,
        stance: stance || "synthesis",
        upvotesCount: 0,
        createdAt: "Just now",
      };
      DEMO_COMMENTS.push(newComment);

      const post = DEMO_POSTS.find((p) => p.id === entityId);
      if (post) {
        post.commentsCount += 1;
      }

      return newComment;
    }
  }

  async upvoteComment(commentId: string): Promise<{ success: boolean; upvotesCount: number }> {
    try {
      return await this.request<{ success: boolean; upvotesCount: number }>(`/comments/${commentId}/upvote`, {
        method: "POST",
      });
    } catch {
      const comment = DEMO_COMMENTS.find((c) => c.id === commentId);
      if (comment) {
        comment.upvotesCount += 1;
        return { success: true, upvotesCount: comment.upvotesCount };
      }
      return { success: true, upvotesCount: 1 };
    }
  }
}

export interface PhilosophicalComment {
  id: string;
  entityId: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  content: string;
  parentId?: string | null;
  stance?: "thesis" | "antithesis" | "synthesis";
  upvotesCount: number;
  createdAt: string;
  replies?: PhilosophicalComment[];
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  content: string;
  createdAt: string;
}

export interface ConnectionRequest {
  id: string;
  sender: User;
  recipientId: string;
  message?: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

export interface PhilosophyNotification {
  id: string;
  type: "connection_request" | "direct_message" | "post_upvote" | "comment_reply";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  sender?: User;
  requestId?: string;
  conversationId?: string;
  entityId?: string;
}

export interface DirectConversation {
  id: string;
  participant: User;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

export interface PhilosophicalSpace {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: "school" | "thinker" | "domain" | "general";
  primarySchool?: string;
  keyThinkers?: string[];
  bannerImage?: string;
  avatarImage?: string;
  membersCount: number;
  postsCount: number;
  isJoined?: boolean;
  createdAt: string;
}

export type EventType = "symposium" | "live_debate" | "reading_group" | "workshop";
export type RSVPStatus = "going" | "maybe" | "declined";

export const isRegisteredRSVP = (status?: RSVPStatus): boolean => status === "going" || status === "maybe";


export interface PhilosophyEvent {
  id: string;
  title: string;
  type: EventType;
  description: string;
  startTime: string;
  endTime?: string;
  locationUrl?: string;
  hostUser: User;
  spaceId?: string;
  spaceName?: string;
  maxCapacity?: number;
  attendeeCount: number;
  registeredCount?: number;
  activeViewers?: number;
  userRsvpStatus?: RSVPStatus;
  tags?: string[];
  createdAt: string;
}

export interface EventRSVP {
  id: string;
  eventId: string;
  user: User;
  status: RSVPStatus;
  updatedAt: string;
  createdAt: string;
}

export interface PhilosophicalBadge {
  id: string;
  code: string;
  title: string;
  icon: string;
  description: string;
  category: "debate" | "scholar" | "events" | "community" | "reputation";
  unlockedAt?: string;
  progressPercentage?: number;
}

export interface LeaderboardEntry {
  rank: number;
  user: User;
  reputationPoints: number;
  primarySchool: string;
  argumentsCount: number;
  symposiumsHosted: number;
  badges: PhilosophicalBadge[];
  trend: "up" | "down" | "same";
}

export interface PhilosophicalPost {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  postType: "argument" | "thought_experiment" | "question" | "essay" | "thesis";
  primarySchool?: string;
  keyThinkers?: string[];
  spaceId?: string;
  spaceName?: string;
  upvotesCount: number;
  commentsCount: number;
  createdAt: string;
}

export const DEMO_CONVERSATIONS: DirectConversation[] = [
  {
    id: "conv-1",
    participant: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Baruch Spinoza",
      username: "spinoza",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      bio: "Substance monism & Ethics philosopher.",
    } as User,
    lastMessage: "Everything that exists is a modification of God or Nature.",
    lastMessageTime: "10m ago",
    unreadCount: 1,
  },
  {
    id: "conv-2",
    participant: {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Albert Camus",
      username: "camus",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
      bio: "Absurdism, revolt, and radical freedom.",
    } as User,
    lastMessage: "Should we revolt against the meaninglessness, Jean-Paul?",
    lastMessageTime: "2h ago",
    unreadCount: 0,
  },
];


const DEMO_MESSAGES: Record<string, ChatMessage[]> = {
  "conv-1": [
    {
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "00000000-0000-0000-0000-000000000002",
      senderName: "Baruch Spinoza",
      senderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      content: "Greetings friend! I read your essay on radical existential choice.",
      createdAt: "15m ago",
    },
    {
      id: "msg-2",
      conversationId: "conv-1",
      senderId: "00000000-0000-0000-0000-000000000002",
      senderName: "Baruch Spinoza",
      senderAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      content: "Everything that exists is a modification of God or Nature.",
      createdAt: "10m ago",
    },
  ],
  "conv-2": [
    {
      id: "msg-3",
      conversationId: "conv-2",
      senderId: "00000000-0000-0000-0000-000000000003",
      senderName: "Albert Camus",
      senderAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
      content: "Should we revolt against the meaninglessness, Jean-Paul?",
      createdAt: "2h ago",
    },
  ],
};

const DEMO_POSTS: PhilosophicalPost[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    title: "Hard Determinism vs. Compatibilism: Is Moral Agency an Illusion?",
    content: "If every physical state of the universe is completely determined by prior physical causes and the laws of physics, how can moral responsibility exist without invoking radical non-physical agent causation?",
    authorId: "00000000-0000-0000-0000-000000000002",
    authorName: "Baruch Spinoza",
    authorHandle: "spinoza",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    postType: "argument",
    primarySchool: "Rationalism & Monism",
    keyThinkers: ["Spinoza", "Kant"],
    upvotesCount: 42,
    commentsCount: 14,
    createdAt: "3 hours ago",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    title: "The Myth of Sisyphus: Creating Meaning in an Absurd Universe",
    content: "The absurd is born of this confrontation between the human-need and the unreasonable silence of the world. One must imagine Sisyphus happy.",
    authorId: "00000000-0000-0000-0000-000000000003",
    authorName: "Albert Camus",
    authorHandle: "camus",
    authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    postType: "thought_experiment",
    primarySchool: "Absurdism",
    keyThinkers: ["Albert Camus", "Søren Kierkegaard"],
    upvotesCount: 89,
    commentsCount: 23,
    createdAt: "5 hours ago",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    title: "Existence Precedes Essence: Radical Freedom & Bad Faith",
    content: "Man first of all exists, encounters himself, surges up in the world – and defines himself afterwards. If man as the existentialist sees him is not definable, it is because to begin with he is nothing.",
    authorId: "00000000-0000-0000-0000-000000000001",
    authorName: "Jean-Paul Sartre",
    authorHandle: "sartre",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    postType: "thesis",
    primarySchool: "Existentialism",
    keyThinkers: ["Jean-Paul Sartre", "Simone de Beauvoir"],
    upvotesCount: 67,
    commentsCount: 19,
    createdAt: "1 day ago",
  },
];

export const DEMO_COMMENTS: PhilosophicalComment[] = [
  // --- Comments for Post 1: Determinism vs Compatibilism ---
  {
    id: "comment-det-1",
    entityId: "00000000-0000-0000-0000-000000000001",
    authorId: "00000000-0000-0000-0000-000000000004",
    authorName: "Immanuel Kant",
    authorHandle: "kant",
    authorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    content: "Compatibilism saves moral responsibility. While our physical actions are determined in the phenomenal realm of space and time, the noumenal self remains transcendentally free to obey the categorical imperative.",
    parentId: null,
    stance: "thesis",
    upvotesCount: 18,
    createdAt: "2 hours ago",
  },
  {
    id: "comment-det-1-1",
    entityId: "00000000-0000-0000-0000-000000000001",
    authorId: "00000000-0000-0000-0000-000000000005",
    authorName: "Friedrich Nietzsche",
    authorHandle: "nietzsche",
    authorAvatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
    content: "The 'noumenal self' is merely a metaphysical fantasy constructed to preserve moral guilt! Free will is the greatest logical trick theologians ever concocted to hold humanity accountable for forces outside their power.",
    parentId: "comment-det-1",
    stance: "antithesis",
    upvotesCount: 25,
    createdAt: "1 hour ago",
  },
  {
    id: "comment-det-1-1-1",
    entityId: "00000000-0000-0000-0000-000000000001",
    authorId: "00000000-0000-0000-0000-000000000006",
    authorName: "G.W.F. Hegel",
    authorHandle: "hegel",
    authorAvatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80",
    content: "Freedom is neither abstract indeterminism nor brute fatalism; true freedom is synthesized when individual volition recognizes itself within the rational evolution of ethical life (Sittlichkeit) and law.",
    parentId: "comment-det-1-1",
    stance: "synthesis",
    upvotesCount: 14,
    createdAt: "45 minutes ago",
  },
  {
    id: "comment-det-2",
    entityId: "00000000-0000-0000-0000-000000000001",
    authorId: "00000000-0000-0000-0000-000000000002",
    authorName: "Baruch Spinoza",
    authorHandle: "spinoza",
    authorAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    content: "Humans believe themselves free simply because they are conscious of their appetites and ignorant of the causes by which they are determined. A stone thrown into the air, if endowed with consciousness, would believe it flies by pure willpower.",
    parentId: null,
    stance: "antithesis",
    upvotesCount: 31,
    createdAt: "2 hours ago",
  },
  {
    id: "comment-det-2-1",
    entityId: "00000000-0000-0000-0000-000000000001",
    authorId: "00000000-0000-0000-0000-000000000007",
    authorName: "Daniel Dennett",
    authorHandle: "dennett",
    authorAvatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80",
    content: "The variety of free will worth wanting is not immunity from physical causation, but the evolved cognitive capacity for foresight, self-monitoring, and moral deliberation within a deterministic framework.",
    parentId: "comment-det-2",
    stance: "synthesis",
    upvotesCount: 16,
    createdAt: "1 hour ago",
  },
  {
    id: "comment-det-3",
    entityId: "00000000-0000-0000-0000-000000000001",
    authorId: "00000000-0000-0000-0000-000000000008",
    authorName: "Thomas Hobbes",
    authorHandle: "hobbes",
    authorAvatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=200&q=80",
    content: "Liberty is simply the absence of external physical impediments. So long as a person is not chained or physically hindered, their voluntary action remains free, regardless of antecedent causes.",
    parentId: null,
    stance: "thesis",
    upvotesCount: 12,
    createdAt: "1 hour ago",
  },

  // --- Comments for Post 2: The Myth of Sisyphus ---
  {
    id: "comment-sis-1",
    entityId: "00000000-0000-0000-0000-000000000002",
    authorId: "00000000-0000-0000-0000-000000000003",
    authorName: "Albert Camus",
    authorHandle: "camus",
    authorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    content: "The absurdity of existence lies in the tension between human desire for clarity and the silent universe. Pushing the boulder with full lucidity is Sisyphus's ultimate victory.",
    parentId: null,
    stance: "thesis",
    upvotesCount: 40,
    createdAt: "4 hours ago",
  },
  {
    id: "comment-sis-1-1",
    entityId: "00000000-0000-0000-0000-000000000002",
    authorId: "00000000-0000-0000-0000-000000000009",
    authorName: "Søren Kierkegaard",
    authorHandle: "kierkegaard",
    authorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
    content: "Without a leap of faith into the paradox of God, Sisyphus remains in aesthetic despair. Defiant endurance cannot replace spiritual salvation.",
    parentId: "comment-sis-1",
    stance: "antithesis",
    upvotesCount: 22,
    createdAt: "3 hours ago",
  },
  {
    id: "comment-sis-1-1-1",
    entityId: "00000000-0000-0000-0000-000000000002",
    authorId: "00000000-0000-0000-0000-000000000001",
    authorName: "Jean-Paul Sartre",
    authorHandle: "sartre",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    content: "Whether through absurd revolt or existential commitment, essence is preceded by existence. We are condemned to invent our own values without divine blueprints.",
    parentId: "comment-sis-1-1",
    stance: "synthesis",
    upvotesCount: 19,
    createdAt: "2 hours ago",
  },
  {
    id: "comment-sis-2",
    entityId: "00000000-0000-0000-0000-000000000002",
    authorId: "00000000-0000-0000-0000-000000000010",
    authorName: "Arthur Schopenhauer",
    authorHandle: "schopenhauer",
    authorAvatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80",
    content: "Sisyphus is the perfect archetype of the blind Will to Live—endlessly striving, suffering, and rolling the stone only to watch it fall again. Joy is a fleeting illusion between moments of suffering.",
    parentId: null,
    stance: "antithesis",
    upvotesCount: 28,
    createdAt: "3 hours ago",
  },
  {
    id: "comment-sis-2-1",
    entityId: "00000000-0000-0000-0000-000000000002",
    authorId: "00000000-0000-0000-0000-000000000011",
    authorName: "Simone de Beauvoir",
    authorHandle: "beauvoir",
    authorAvatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    content: "Striving is not futile when linked to the liberation of others. Sisyphus's labor acquires genuine ethical weight when grounded in shared human action and solidarity.",
    parentId: "comment-sis-2",
    stance: "thesis",
    upvotesCount: 17,
    createdAt: "1 hour ago",
  },
];

export const DEMO_SPACES: PhilosophicalSpace[] = [
  {
    id: "space-existentialism",
    name: "Existentialist Guild & Freedom Forum",
    slug: "existentialist-guild",
    description: "Exploring radical freedom, anguish, existence preceding essence, and authentic choice without transcendent blueprints.",
    category: "school",
    primarySchool: "Existentialism",
    keyThinkers: ["Jean-Paul Sartre", "Simone de Beauvoir", "Albert Camus", "Friedrich Nietzsche"],
    avatarImage: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    bannerImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80",
    membersCount: 1420,
    postsCount: 89,
    isJoined: true,
    createdAt: "1 month ago",
  },
  {
    id: "space-stoicism",
    name: "Stoicism & Virtue Ethics Guild",
    slug: "stoicism-guild",
    description: "Practicing the dichotomy of control, eudaimonia, tranquility (ataraxia), and living in accordance with Nature.",
    category: "school",
    primarySchool: "Stoicism",
    keyThinkers: ["Marcus Aurelius", "Epictetus", "Seneca"],
    avatarImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    bannerImage: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1000&q=80",
    membersCount: 2150,
    postsCount: 134,
    isJoined: false,
    createdAt: "2 months ago",
  },
  {
    id: "space-rationalism",
    name: "Spinozan Monism & Rationalism Hub",
    slug: "spinoza-rationalism-hub",
    description: "Substance monism, geometric proofs of ethics, intellectual love of God/Nature (Deus sive Natura), and necessary truth.",
    category: "thinker",
    primarySchool: "Rationalism",
    keyThinkers: ["Baruch Spinoza", "René Descartes", "G.W. Leibniz"],
    avatarImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    bannerImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80",
    membersCount: 870,
    postsCount: 45,
    isJoined: false,
    createdAt: "3 weeks ago",
  },
  {
    id: "space-mind",
    name: "Philosophy of Mind & Consciousness Circle",
    slug: "philosophy-of-mind",
    description: "Addressing the hard problem of consciousness, physicalism vs dualism, qualia, and artificial intelligence agency.",
    category: "domain",
    primarySchool: "Philosophy of Mind",
    keyThinkers: ["Thomas Nagel", "David Chalmers", "Daniel Dennett"],
    avatarImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    bannerImage: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80",
    membersCount: 1120,
    postsCount: 62,
    isJoined: true,
    createdAt: "1 month ago",
  },
  {
    id: "space-absurdism",
    name: "Absurdist Revolt & Sisyphus Syndicate",
    slug: "absurdist-revolt",
    description: "Living passionately in the face of the absurd without philosophical suicide or theological escape.",
    category: "school",
    primarySchool: "Absurdism",
    keyThinkers: ["Albert Camus", "Søren Kierkegaard"],
    avatarImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    bannerImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80",
    membersCount: 960,
    postsCount: 53,
    isJoined: false,
    createdAt: "2 weeks ago",
  },
];

const DEMO_CONNECTION_REQUESTS: ConnectionRequest[] = [
  {
    id: "req-1",
    sender: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Immanuel Kant",
      username: "kant",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
      bio: "Königsberg philosopher • Categorical Imperative & Deontology",
    } as User,
    recipientId: "00000000-0000-0000-0000-000000000001",
    message: "I read your synthesis on radical freedom and moral duty. I would love to connect for formal dialogue on synthetic a priori judgments.",
    status: "pending",
    createdAt: "10 minutes ago",
  },
  {
    id: "req-2",
    sender: {
      id: "00000000-0000-0000-0000-000000000005",
      name: "Friedrich Nietzsche",
      username: "nietzsche",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
      bio: "Will to Power • Genealogist of Morals",
    } as User,
    recipientId: "00000000-0000-0000-0000-000000000001",
    message: "Let us debate whether existential anguish is a triumph of spirit or a lingering shadow of ascetic ideals!",
    status: "pending",
    createdAt: "1 hour ago",
  },
];

const DEMO_NOTIFICATIONS: PhilosophyNotification[] = [
  {
    id: "notif-1",
    type: "connection_request",
    title: "🤝 Intellectual Connection Invite",
    message: "Immanuel Kant sent you a connection request: 'I read your synthesis on radical freedom...'",
    read: false,
    createdAt: "10 minutes ago",
    requestId: "req-1",
    sender: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Immanuel Kant",
      username: "kant",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    } as User,
  },
  {
    id: "notif-2",
    type: "connection_request",
    title: "🤝 Intellectual Connection Invite",
    message: "Friedrich Nietzsche sent you a connection request: 'Let us debate whether existential anguish...'",
    read: false,
    createdAt: "1 hour ago",
    requestId: "req-2",
    sender: {
      id: "00000000-0000-0000-0000-000000000005",
      name: "Friedrich Nietzsche",
      username: "nietzsche",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
    } as User,
  },
  {
    id: "notif-3",
    type: "direct_message",
    title: "💬 New Direct Message",
    message: "Baruch Spinoza: 'Greetings friend! I read your essay on radical choice...'",
    read: false,
    createdAt: "15 minutes ago",
    conversationId: "conv-1",
    sender: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Baruch Spinoza",
      username: "spinoza",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    } as User,
  },
  {
    id: "notif-4",
    type: "comment_reply",
    title: "📜 Debate Thread Reply",
    message: "G.W.F. Hegel replied to your comment with a ⚪ Synthesis stance.",
    read: true,
    createdAt: "45 minutes ago",
    entityId: "00000000-0000-0000-0000-000000000001",
  },
  {
    id: "notif-5",
    type: "post_upvote",
    title: "▲ Argument Upvoted",
    message: "Albert Camus and 3 others upvoted your post 'Existence Precedes Essence'.",
    read: true,
    createdAt: "2 hours ago",
    entityId: "00000000-0000-0000-0000-000000000003",
  },
];

export const DEMO_EVENTS: PhilosophyEvent[] = [
  {
    id: "event-1",
    title: "📖 Critique of Pure Reason: Transcendental Aesthetic Reading Group",
    type: "reading_group",
    description: "Weekly close-reading workshop focusing on Kant's concepts of Space, Time, and synthetic a priori judgments. All thinkers welcome for active textual analysis.",
    startTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    endTime: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    locationUrl: "https://agora.philosophy/room/kantian-critique",
    hostUser: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Immanuel Kant",
      username: "kantian_critique",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
      philosophyProfile: {
        primarySchools: ["Kantian Idealism"],
        keyThinkers: ["Kant", "Rousseau"],
      },
    } as unknown as User,
    spaceId: "space-1",
    spaceName: "Existentialist Guild",
    maxCapacity: 25,
    attendeeCount: 18,
    registeredCount: 18,
    userRsvpStatus: "going",
    tags: ["Epistemology", "Kant", "Metaphysics"],
    createdAt: "1 day ago",
  },
  {
    id: "event-2",
    title: "⚔️ Compatibilism vs. Hard Determinism: Live Formal Debate",
    type: "live_debate",
    description: "A structured 90-minute formal duel debating whether moral responsibility remains coherent in a fully deterministic physical cosmos.",
    startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    locationUrl: "https://agora.philosophy/live/compatibilism-debate",
    hostUser: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Baruch Spinoza",
      username: "spinoza",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      philosophyProfile: {
        primarySchools: ["Rationalism & Monism"],
        keyThinkers: ["Spinoza", "Descartes"],
      },
    } as unknown as User,
    spaceId: "space-2",
    spaceName: "Spinozan Monism Hub",
    maxCapacity: 50,
    attendeeCount: 32,
    registeredCount: 32,
    userRsvpStatus: "going",
    tags: ["Free Will", "Determinism", "Ethics"],
    createdAt: "2 days ago",
  },
  {
    id: "event-3",
    title: "🏛️ Existential Ethics & The Ethics of Ambiguity Symposium",
    type: "symposium",
    description: "An open virtual symposium presenting three thesis papers on Simone de Beauvoir's moral framework under radical freedom and absurdity.",
    startTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    endTime: new Date(Date.now() + 27 * 3600 * 1000).toISOString(),
    locationUrl: "https://agora.philosophy/symposium/existential-ethics",
    hostUser: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Jean-Paul Sartre",
      username: "sartre",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
      philosophyProfile: {
        primarySchools: ["Existentialism"],
        keyThinkers: ["Sartre", "Beauvoir"],
      },
    } as unknown as User,
    spaceId: "space-3",
    spaceName: "Absurdist Circle",
    maxCapacity: 30,
    attendeeCount: 14,
    registeredCount: 14,
    userRsvpStatus: "maybe",
    tags: ["Existentialism", "Ethics", "Freedom"],
    createdAt: "3 days ago",
  },
  {
    id: "event-4",
    title: "🧪 Spinoza's Ethics: Geometric Method & Affects Workshop",
    type: "workshop",
    description: "Hands-on workshop mapping out Spinoza's Propositions on human passions, active affects, and beatitude using geometric proof diagrams.",
    startTime: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    endTime: new Date(Date.now() + 51 * 3600 * 1000).toISOString(),
    locationUrl: "https://agora.philosophy/workshop/spinoza-ethics",
    hostUser: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Baruch Spinoza",
      username: "spinoza",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    } as User,
    spaceId: "space-2",
    spaceName: "Spinozan Monism Hub",
    maxCapacity: 20,
    attendeeCount: 12,
    registeredCount: 12,
    userRsvpStatus: "declined",
    tags: ["Rationalism", "Spinoza", "Metaphysics"],
    createdAt: "4 days ago",
  },
];

export const DEMO_RSVPS: EventRSVP[] = [];

export const ALL_PLATFORM_BADGES: PhilosophicalBadge[] = [
  {
    id: "badge-master-debater",
    code: "master_debater",
    title: "⚔️ Master Debater",
    icon: "⚔️",
    description: "Published 10+ high-engagement formal debate arguments with high upvote ratios.",
    category: "debate",
    progressPercentage: 100,
  },
  {
    id: "badge-stoic-scholar",
    code: "stoic_scholar",
    title: "📜 Stoic Scholar",
    icon: "📜",
    description: "Achieved >90% worldview compatibility in Stoic virtue ethics & dichotomy of control.",
    category: "scholar",
    progressPercentage: 100,
  },
  {
    id: "badge-symposium-host",
    code: "symposium-host",
    title: "📅 Symposium Host",
    icon: "📅",
    description: "Scheduled and hosted 3+ virtual symposiums, live formal duels, or reading groups.",
    category: "events",
    progressPercentage: 80,
  },
  {
    id: "badge-circle-steward",
    code: "circle_steward",
    title: "🏛️ Circle Steward",
    icon: "🏛️",
    description: "Active member and contributor in 2+ philosophical school circles.",
    category: "community",
    progressPercentage: 100,
  },
  {
    id: "badge-philosophical-catalyst",
    code: "philosophical_catalyst",
    title: "⚡ Philosophical Catalyst",
    icon: "⚡",
    description: "Earned 1,000+ total community reputation points through insightful contributions.",
    category: "reputation",
    progressPercentage: 95,
  },
];

export const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    user: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Immanuel Kant",
      username: "kantian_critique",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
      philosophyProfile: {
        primarySchools: ["Kantian Idealism"],
        keyThinkers: ["Kant", "Rousseau"],
      },
    } as unknown as User,
    reputationPoints: 2450,
    primarySchool: "Rationalism & Kantian Idealism",
    argumentsCount: 34,
    symposiumsHosted: 8,
    trend: "same",
    badges: [ALL_PLATFORM_BADGES[0]!, ALL_PLATFORM_BADGES[2]!, ALL_PLATFORM_BADGES[3]!, ALL_PLATFORM_BADGES[4]!],
  },
  {
    rank: 2,
    user: {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Baruch Spinoza",
      username: "spinoza",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
      philosophyProfile: {
        primarySchools: ["Rationalism & Monism"],
        keyThinkers: ["Spinoza", "Descartes"],
      },
    } as unknown as User,
    reputationPoints: 2180,
    primarySchool: "Rationalism & Monism",
    argumentsCount: 28,
    symposiumsHosted: 5,
    trend: "up",
    badges: [ALL_PLATFORM_BADGES[0]!, ALL_PLATFORM_BADGES[1]!, ALL_PLATFORM_BADGES[4]!],
  },
  {
    rank: 3,
    user: {
      id: "00000000-0000-0000-0000-000000000004",
      name: "Jean-Paul Sartre",
      username: "sartre",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
      philosophyProfile: {
        primarySchools: ["Existentialism"],
        keyThinkers: ["Sartre", "Beauvoir"],
      },
    } as unknown as User,
    reputationPoints: 1890,
    primarySchool: "Existentialism",
    argumentsCount: 22,
    symposiumsHosted: 4,
    trend: "up",
    badges: [ALL_PLATFORM_BADGES[0]!, ALL_PLATFORM_BADGES[3]!, ALL_PLATFORM_BADGES[4]!],
  },
  {
    rank: 4,
    user: {
      id: "00000000-0000-0000-0000-000000000005",
      name: "Friedrich Nietzsche",
      username: "nietzsche",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80",
      philosophyProfile: {
        primarySchools: ["Existentialism & Perspectivism"],
        keyThinkers: ["Nietzsche", "Schopenhauer"],
      },
    } as unknown as User,
    reputationPoints: 1720,
    primarySchool: "Existentialism",
    argumentsCount: 19,
    symposiumsHosted: 2,
    trend: "down",
    badges: [ALL_PLATFORM_BADGES[0]!, ALL_PLATFORM_BADGES[4]!],
  },
  {
    rank: 5,
    user: {
      id: "00000000-0000-0000-0000-000000000003",
      name: "Albert Camus",
      username: "camus",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
      philosophyProfile: {
        primarySchools: ["Absurdism"],
        keyThinkers: ["Camus", "Nietzsche"],
      },
    } as unknown as User,
    reputationPoints: 1540,
    primarySchool: "Absurdism",
    argumentsCount: 16,
    symposiumsHosted: 3,
    trend: "up",
    badges: [ALL_PLATFORM_BADGES[2]!, ALL_PLATFORM_BADGES[3]!],
  },
];

export const agoraClient = new AgoraPhilosophyClient();

