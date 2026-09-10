import type {
  User,
  PhilosophyProfile,
  UserRecommendation,
  CompatibilityScore,
  DiscussionSummary,
  ConnectionIntent,
} from "@agora-server/contract";

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
    this.baseUrl = options?.baseUrl || "/v7";
    this.projectId = options?.projectId || "00000000-0000-0000-0000-000000000000";
    
    // Restore saved token from localStorage if available
    let storedToken = "";
    if (typeof window !== "undefined") {
      storedToken = localStorage.getItem("agora_philosophy_token") || "";
    }
    this.authToken = options?.authToken || storedToken || "mock-auth-token";
  }

  setAuthToken(token: string) {
    this.authToken = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("agora_philosophy_token", token);
      } else {
        localStorage.removeItem("agora_philosophy_token");
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
    const url = `${this.baseUrl}/${this.projectId}${path}`;
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
      const errorBody = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorBody.message || `HTTP ${response.status}`);
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
   * Update user's philosophical profile
   */
  async updatePhilosophyProfile(
    userId: string,
    philosophyProfile: Partial<PhilosophyProfile>
  ): Promise<User> {
    return this.request<User>(`/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ philosophyProfile }),
    });
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
    return this.request<{ recommendations: UserRecommendation[] }>(`/recommendations/people${queryString}`);
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
   * POST /v7/:projectId/spaces/seed-philosophy
   */
  async seedPhilosophySpaces(): Promise<{ count: number; created: any[] }> {
    return this.request<{ count: number; created: any[] }>("/spaces/seed-philosophy", {
      method: "POST",
    });
  }
}

export const agoraClient = new AgoraPhilosophyClient();
