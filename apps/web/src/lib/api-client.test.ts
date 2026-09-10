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
});
