import { describe, it, expect, vi } from "vitest";
import { AgoraPhilosophyClient } from "./api-client.js";

describe("AgoraPhilosophyClient", () => {
  it("initializes client with default configuration", () => {
    const client = new AgoraPhilosophyClient();
    expect(client).toBeDefined();
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
      "https://api.example.com/v7/proj-123/recommendations/people?connectionIntent=discussion&school=Existentialism&limit=5",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );

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
});
