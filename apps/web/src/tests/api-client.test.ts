import { describe, it, expect, beforeEach } from "vitest";
import { AgoraPhilosophyClient } from "../lib/api-client.js";

describe("AgoraPhilosophyClient Integration & Data Flow Tests", () => {
  let client: AgoraPhilosophyClient;

  beforeEach(() => {
    try { localStorage.clear(); } catch {}
    client = new AgoraPhilosophyClient({
      baseUrl: "http://localhost:5001/v7",
      projectId: "00000000-0000-0000-0000-000000000000",
      authToken: "test-auth-token",
    });
  });


  describe("Authentication & Token Lifecycle", () => {
    it("should store and retrieve auth token correctly", () => {
      client.setAuthToken("custom-jwt-token");
      expect(client.getAuthToken()).toBe("custom-jwt-token");
    });

    it("should handle signIn fallback data cleanly", async () => {
      const res = await client.signIn({ email: "sartre@agora.philosophy", password: "password123" });
      expect(res).toBeDefined();
      expect(res.user || res.accessToken).toBeDefined();
    });

    it("should handle signOut and clear auth token", async () => {
      client.setAuthToken("token-to-clear");
      const res = await client.signOut();
      expect(res.success).toBe(true);
      expect(client.getAuthToken()).toBe("");
    });
  });

  describe("Direct Messaging (DMs)", () => {
    it("should fetch list of direct conversations", async () => {
      const { conversations } = await client.getConversations();
      expect(Array.isArray(conversations)).toBe(true);
      expect(conversations.length).toBeGreaterThan(0);
      expect(conversations[0]!.participant).toBeDefined();
    });

    it("should create or return direct conversation with a target user", async () => {
      const targetUserId = "00000000-0000-0000-0000-000000000002";
      const conv = await client.createDirectConversation(targetUserId);
      expect(conv.id).toBeDefined();
      expect(conv.participant).toBeDefined();
    });

    it("should fetch messages and send new chat message", async () => {
      const convId = "conv-1";
      const { messages: initialMsgs } = await client.getMessages(convId);
      expect(Array.isArray(initialMsgs)).toBe(true);

      const content = "Testing real-time philosophical chat message transmission.";
      const newMsg = await client.sendMessage(convId, content);
      expect(newMsg.content).toBe(content);
      expect(newMsg.conversationId).toBe(convId);
    });
  });

  describe("Philosophical Posts & Feed", () => {
    it("should fetch community posts list", async () => {
      const { posts } = await client.getPosts();
      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThan(0);
      expect(posts[0]!.title).toBeDefined();
      expect(posts[0]!.postType).toBeDefined();
    });

    it("should publish a new philosophical post", async () => {
      const postData = {
        title: "On the Coherence of Synthetic A Priori Truths",
        content: "How can mathematical propositions be both informative and necessary?",
        postType: "argument" as const,
        primarySchool: "Kantian Idealism",
        keyThinkers: ["Kant", "Frege"],
        authorName: "Immanuel Kant",
        authorHandle: "kantian_critique",
      };

      const newPost = await client.createPost(postData);
      expect(newPost.id).toBeDefined();
      expect(newPost.title).toBe(postData.title);
      expect(newPost.upvotesCount).toBe(1);
    });
  });

  describe("Philosophical Circles & Spaces", () => {
    it("should fetch spaces list and filter by category", async () => {
      const { spaces } = await client.getSpaces("school");
      expect(Array.isArray(spaces)).toBe(true);
      expect(spaces.length).toBeGreaterThan(0);
    });

    it("should fetch single space details and handle join/leave", async () => {
      const spaceId = "space-existentialism";
      const { space } = await client.getSpace(spaceId);
      expect(space.id).toBe(spaceId);

      const joinRes = await client.joinSpace(spaceId);
      expect(joinRes.success).toBe(true);

      const leaveRes = await client.leaveSpace(spaceId);
      expect(leaveRes.success).toBe(true);
    });
  });

  describe("Symposiums & Scheduled Events", () => {
    it("should fetch events list and filter by type", async () => {
      const { events } = await client.getEvents({ type: "reading_group" });
      expect(Array.isArray(events)).toBe(true);
    });

    it("should schedule a new symposium event and handle RSVP", async () => {
      const eventData = {
        title: "Ethics of Ambiguity Reading Group",
        type: "reading_group" as const,
        description: "Close textual analysis of Simone de Beauvoir's foundational text.",
        startTime: new Date(Date.now() + 86400000).toISOString(),
        locationUrl: "https://agora.philosophy/room/ethics-ambiguity",
      };

      const createdEvent = await client.createEvent(eventData);
      expect(createdEvent.id).toBeDefined();
      expect(createdEvent.title).toBe(eventData.title);

      const rsvpRes = await client.rsvpEvent(createdEvent.id, "going");
      expect(rsvpRes.success).toBe(true);
      expect(rsvpRes.event.userRsvpStatus).toBe("going");

      const { rsvps } = await client.getEventRsvps(createdEvent.id);
      expect(Array.isArray(rsvps)).toBe(true);
    });
  });

  describe("Reputation Leaderboard & Badges", () => {
    it("should fetch community leaderboard rankings", async () => {
      const { entries } = await client.getLeaderboard();
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0]!.rank).toBe(1);
      expect(entries[0]!.reputationPoints).toBeGreaterThan(0);
    });


    it("should fetch user achievement badges", async () => {
      const { badges } = await client.getUserBadges("00000000-0000-0000-0000-000000000001");
      expect(Array.isArray(badges)).toBe(true);
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe("Connection Requests & Notifications", () => {
    it("should send and retrieve connection requests", async () => {
      const req = await client.sendConnectionRequest(
        "00000000-0000-0000-0000-000000000002",
        "Let us discuss substance monism."
      );
      expect(req.id).toBeDefined();
      expect(req.status).toBe("pending");

      const { requests } = await client.getConnectionRequests();
      expect(Array.isArray(requests)).toBe(true);
    });

    it("should accept connection request and update status", async () => {
      const res = await client.acceptConnectionRequest("req-1");
      expect(res.success).toBe(true);
    });

    it("should fetch notifications list and mark all read", async () => {
      const { notifications, unreadCount } = await client.getNotifications();
      expect(Array.isArray(notifications)).toBe(true);
      expect(typeof unreadCount).toBe("number");

      const markRes = await client.markNotificationsRead();
      expect(markRes.success).toBe(true);
    });
  });
});
