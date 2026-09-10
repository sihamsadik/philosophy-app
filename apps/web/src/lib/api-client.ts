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

export class AgoraPhilosophyClient {
  private baseUrl: string;
  private projectId: string;
  private authToken: string;

  constructor(options?: ApiClientOptions) {
    this.baseUrl = options?.baseUrl || "/v7";
    this.projectId = options?.projectId || "00000000-0000-0000-0000-000000000000";
    this.authToken = options?.authToken || "mock-auth-token";
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  setProjectId(projectId: string) {
    this.projectId = projectId;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}/${this.projectId}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.authToken}`,
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
   * Fetch current user or specific user profile with PhilosophyProfile
   */
  async getUser(userId: string): Promise<User> {
    return this.request<User>(`/users/${userId}`);
  }

  /**
   * Update current user's philosophical profile
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
   * Dual-axis intellectual recommendations with filtering
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
   * Specific target user compatibility analysis
   */
  async getUserCompatibility(targetUserId: string): Promise<{ user: User; compatibility: CompatibilityScore }> {
    return this.request<{ user: User; compatibility: CompatibilityScore }>(`/users/${targetUserId}/compatibility`);
  }

  /**
   * GET /v7/:projectId/search/semantic
   * Semantic concept search across profiles, entities, and spaces
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
   * AI debate analysis & discussion summarization
   */
  async getDiscussionSummary(entityId: string): Promise<DiscussionSummary> {
    return this.request<DiscussionSummary>(`/entities/${entityId}/summary`);
  }

  /**
   * POST /v7/:projectId/spaces/seed-philosophy
   * Pre-seed philosophy spaces with tailored discourse rules
   */
  async seedPhilosophySpaces(): Promise<{ count: number; created: any[] }> {
    return this.request<{ count: number; created: any[] }>("/spaces/seed-philosophy", {
      method: "POST",
    });
  }
}

export const agoraClient = new AgoraPhilosophyClient();
