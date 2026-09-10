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
    try {
      return await this.request<{ posts: PhilosophicalPost[] }>("/entities");
    } catch {
      return { posts: DEMO_POSTS };
    }
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
    try {
      return await this.request<PhilosophicalPost>("/entities", {
        method: "POST",
        body: JSON.stringify(postData),
      });
    } catch {
      const newPost: PhilosophicalPost = {
        id: `post-${Date.now()}`,
        title: postData.title,
        content: postData.content,
        authorId: "00000000-0000-0000-0000-000000000001",
        authorName: postData.authorName || "Jean-Paul Sartre",
        authorHandle: postData.authorHandle || "sartre",
        authorAvatar: postData.authorAvatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
        postType: postData.postType,
        primarySchool: postData.primarySchool || "Existentialism",
        keyThinkers: postData.keyThinkers || ["Sartre"],
        upvotesCount: 1,
        commentsCount: 0,
        createdAt: "Just now",
      };
      DEMO_POSTS.unshift(newPost);
      return newPost;
    }
  }
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

export interface DirectConversation {
  id: string;
  participant: User;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
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
  upvotesCount: number;
  commentsCount: number;
  createdAt: string;
}

const DEMO_CONVERSATIONS: DirectConversation[] = [
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

export const agoraClient = new AgoraPhilosophyClient();

