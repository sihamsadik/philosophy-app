import { describe, it, expect, vi } from "vitest";
import { AgoraPhilosophyClient } from "./api-client.js";

describe("AgoraPhilosophyClient", () => {
  it("initializes client with default configuration", () => {
    const client = new AgoraPhilosophyClient();
    expect(client).toBeDefined();
  });

  it("uses the dedicated unread-DM aggregate rather than notifications", async () => {
    const client = new AgoraPhilosophyClient({ baseUrl: "https://api.example.com/v7", projectId: "project-1" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ totalUnread: 6 }),
    } as any);
    await expect(client.getUnreadMessageCount()).resolves.toBe(6);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.example.com/v7/project-1/chat/conversations/unread-count",
      expect.anything(),
    );
    fetchSpy.mockRestore();
  });

  it("retains unread count and peer read cursor for direct conversations", async () => {
    const client = new AgoraPhilosophyClient({ baseUrl: "https://api.example.com/v7", projectId: "project-1" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ id: "conversation-1", unreadCount: 3, peerLastReadAt: "2026-09-25T10:00:00Z" }),
    } as any);
    const conversation = await client.createDirectConversation("peer-1");
    expect(conversation).toMatchObject({ unreadCount: 3, peerLastReadAt: "2026-09-25T10:00:00Z" });
    fetchSpy.mockRestore();
  });

  it("constructs correct recommendation query parameters", async () => {
    const client = new AgoraPhilosophyClient({ baseUrl: "https://api.example.com/v7", projectId: "proj-123" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: [] }),
    } as any);

    await client.getPeopleRecommendations({
      connectionIntent: "discussion",
      school: "Existentialism",
      limit: 5,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.example.com/v7/proj-123/recommendations/people?intent=discussion&school=Existentialism&limit=5",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );

    fetchSpy.mockRestore();
  });

  it("maps backend recommendation compatibility to the gauge contract", async () => {
    const client = new AgoraPhilosophyClient({ baseUrl: "https://api.example.com/v7", projectId: "project-1", authToken: "token" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: [{
        user: { id: "peer-1", name: "Sara", philosophyProfile: { primarySchools: ["Ethics"] } },
        compatibility: {
          overallScore: 76,
          sharedGroundScore: 60,
          productiveTensionScore: 100,
          overlappingSchools: ["Ethics"],
          overlappingThinkers: [],
          overlappingQuestions: ["What is a good life?"],
          overlappingTexts: [],
          explanation: "Shared ethical questions, different traditions.",
        },
      }] }),
    } as any);
    const { recommendations } = await client.getPeopleRecommendations();
    expect(recommendations[0]).toMatchObject({
      user: { id: "peer-1", name: "Sara" },
      compatibility: { overallScore: 76, overlappingQuestions: ["What is a good life?"] },
    });
    fetchSpy.mockRestore();
  });

  it("uses existing sample peers with valid compatibility data when unauthenticated offline", async () => {
    const client = new AgoraPhilosophyClient();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    const { recommendations } = await client.getPeopleRecommendations({ limit: 2 });
    expect(recommendations).toHaveLength(2);
    expect(recommendations[0]?.user.id).toBeTruthy();
    expect(recommendations[0]?.compatibility).toMatchObject({
      overallScore: expect.any(Number),
      overlappingSchools: expect.any(Array),
      explanation: expect.any(String),
    });
    fetchSpy.mockRestore();
  });

  it("does not disguise an authenticated recommendation API failure with fake peers", async () => {
    const client = new AgoraPhilosophyClient({ authToken: "token" });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("API unavailable"));
    await expect(client.getPeopleRecommendations()).rejects.toThrow("API unavailable");
    fetchSpy.mockRestore();
  });

  it("fetches demo comments when network request falls back", async () => {
    const client = new AgoraPhilosophyClient();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const res = await client.getComments("00000000-0000-0000-0000-000000000001");
    expect(res.comments.length).toBeGreaterThan(0);
    expect(res.comments[0]?.entityId).toBe("00000000-0000-0000-0000-000000000001");
    expect(res.comments[0]?.stance).toBeDefined();

    fetchSpy.mockRestore();
  });

  it("loads nested comments and replies for opening a reply notification target", async () => {
    const client = new AgoraPhilosophyClient({
      baseUrl: "https://api.example.com/v7",
      projectId: "project-1",
      authToken: "token",
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{
          id: "parent-1",
          entityId: "post-1",
          userId: "user-b",
          content: "Parent comment",
          replies: [{
            id: "reply-1",
            entityId: "post-1",
            userId: "user-c",
            parentId: "parent-1",
            content: "Direct reply",
            replies: [{
              id: "reply-2",
              entityId: "post-1",
              userId: "user-d",
              parentId: "reply-1",
              content: "Nested reply",
              replies: [],
            }],
          }],
        }],
      }),
    } as any);

    const { comments } = await client.getComments("post-1", true);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.example.com/v7/project-1/comments/thread?entityId=post-1",
      expect.anything()
    );
    expect(comments.map((comment) => [comment.id, comment.parentId])).toEqual([
      ["parent-1", null],
      ["reply-1", "parent-1"],
      ["reply-2", "reply-1"],
    ]);

    fetchSpy.mockRestore();
  });

  it("preserves reply notification references for navigation", async () => {
    const client = new AgoraPhilosophyClient({
      baseUrl: "https://api.example.com/v7",
      projectId: "project-1",
      authToken: "token",
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{
        id: "notification-1",
        type: "comment-reply",
        action: "open-comment",
        userId: "user-b",
        isRead: false,
        createdAt: "2026-09-24T10:00:00.000Z",
        metadata: {
          entityId: "post-1",
          commentId: "parent-1",
          replyId: "reply-1",
          initiatorId: "user-c",
          initiatorName: "Sara",
          replyContent: "Direct reply",
        },
      }] }),
    } as any);

    const { notifications } = await client.getNotifications();
    expect(notifications[0]).toMatchObject({
      type: "comment_reply",
      title: expect.stringContaining("Sara"),
      entityId: "post-1",
      commentId: "parent-1",
      replyId: "reply-1",
      read: false,
      sourceType: "comment-reply",
    });

    const { activities, unreadCount } = await client.getReplyActivities();
    expect(activities.map((activity) => activity.id)).toEqual(["notification-1"]);
    expect(unreadCount).toBe(1);

    fetchSpy.mockRestore();
  });

  it("creates a new comment and handles upvoting in fallback mode", async () => {
    const client = new AgoraPhilosophyClient();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const newComment = await client.createComment(
      "00000000-0000-0000-0000-000000000001",
      "Determinism and free will are compatible under reflective equilibrium.",
      null,
      "synthesis"
    );

    expect(newComment.content).toBe("Determinism and free will are compatible under reflective equilibrium.");
    expect(newComment.stance).toBe("synthesis");

    const upvoteRes = await client.upvoteComment(newComment.id);
    expect(upvoteRes.success).toBe(true);
    expect(upvoteRes.upvotesCount).toBe(1);

    fetchSpy.mockRestore();
  });

  it("fetches demo spaces and handles joining/leaving in fallback mode", async () => {
    const client = new AgoraPhilosophyClient();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const { spaces } = await client.getSpaces("school");
    expect(spaces.length).toBeGreaterThan(0);
    const targetSpace = spaces[0];
    expect(targetSpace?.name).toBeDefined();

    if (targetSpace) {
      const initialCount = targetSpace.membersCount;
      const joinRes = await client.joinSpace(targetSpace.id);
      expect(joinRes.success).toBe(true);
      expect(joinRes.space.isJoined).toBe(true);

      const leaveRes = await client.leaveSpace(targetSpace.id);
      expect(leaveRes.success).toBe(true);
      expect(leaveRes.space.isJoined).toBe(false);
    }

    fetchSpy.mockRestore();
  });

  it("tracks live event active viewers presence in fallback mode", async () => {
    const client = new AgoraPhilosophyClient();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const eventId = "event-2";
    await client.joinLiveEvent(eventId);
    let statusRes = await client.getEventLiveStatus(eventId);
    expect(statusRes.liveStatus?.activeViewers).toBe(1);

    await client.joinLiveEvent(eventId);
    statusRes = await client.getEventLiveStatus(eventId);
    expect(statusRes.liveStatus?.activeViewers).toBe(2);

    await client.leaveLiveEvent(eventId);
    statusRes = await client.getEventLiveStatus(eventId);
    expect(statusRes.liveStatus?.activeViewers).toBe(1);

    fetchSpy.mockRestore();
  });
});
