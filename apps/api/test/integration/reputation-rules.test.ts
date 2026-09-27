// apps/api/test/integration/reputation-rules.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, createProject, createUser, deleteProject, base } from "./helpers.js";
import { getDb } from "../../src/db/index.js";
import { profiles, connections, reactions, entities } from "../../src/db/schema/index.js";
import { eq } from "drizzle-orm";

describe("reputation system rules (integration)", () => {
  let projectId: string;
  let B: string;
  let user1: { id: string; token: string };
  let user2: { id: string; token: string };

  beforeAll(async () => {
    projectId = await createProject();
    B = base(projectId);
    user1 = await createUser(projectId);
    user2 = await createUser(projectId);
  });

  afterAll(async () => {
    if (projectId) await deleteProject(projectId);
  });

  it("downvoting a post does NOT deduct reputation points (downvote = 0 points)", async () => {
    // User1 creates a post
    const postRes = await api("POST", `${B}/entities`, {
      token: user1.token,
      body: { title: "On Free Will", content: "Is determinism true?", keywords: ["free-will"] },
    });
    expect(postRes.status).toBe(201);
    const post = postRes.body;

    // Get user1 initial reputation
    const [u1Before] = await getDb().select({ reputation: profiles.reputation }).from(profiles).where(eq(profiles.id, user1.id));
    const initialRep = u1Before.reputation;

    // User2 downvotes user1's post
    const reactRes = await api("POST", `${B}/entities/${post.id}/reactions`, {
      token: user2.token,
      body: { reactionType: "downvote" },
    });
    expect(reactRes.status).toBe(200);

    // User1 reputation should NOT decrease by 1
    const [u1After] = await getDb().select({ reputation: profiles.reputation }).from(profiles).where(eq(profiles.id, user1.id));
    expect(u1After.reputation).toBe(initialRep);
  });

  it("upvoting a post DOES award +1 reputation point to the author", async () => {
    // User1 creates a post
    const postRes = await api("POST", `${B}/entities`, {
      token: user1.token,
      body: { title: "On Reason", content: "Critique of pure reason", keywords: ["reason"] },
    });
    expect(postRes.status).toBe(201);
    const post = postRes.body;

    const [u1Before] = await getDb().select({ reputation: profiles.reputation }).from(profiles).where(eq(profiles.id, user1.id));
    const initialRep = u1Before.reputation;

    // User2 upvotes user1's post
    const reactRes = await api("POST", `${B}/entities/${post.id}/reactions`, {
      token: user2.token,
      body: { reactionType: "upvote" },
    });
    expect(reactRes.status).toBe(200);

    // User1 reputation increases by +1
    const [u1After] = await getDb().select({ reputation: profiles.reputation }).from(profiles).where(eq(profiles.id, user1.id));
    expect(u1After.reputation).toBe(initialRep + 1);
  });

  it("accepting a connection request awards +5 reputation points to the recipient", async () => {
    // Get user2 initial reputation
    const [u2Before] = await getDb().select({ reputation: profiles.reputation }).from(profiles).where(eq(profiles.id, user2.id));
    const initialRep = u2Before.reputation;

    // User1 sends connection request to User2
    const reqRes = await api("POST", `${B}/connections`, {
      token: user1.token,
      body: { addresseeId: user2.id, message: "Let's discuss Ethics!" },
    });
    expect(reqRes.status).toBe(201);
    const conn = reqRes.body;

    // User2 accepts connection request (status='connected')
    const acceptRes = await api("PATCH", `${B}/connections/${conn.id}`, {
      token: user2.token,
      body: { status: "connected" },
    });
    expect(acceptRes.status).toBe(200);

    // User2 reputation should be incremented by +5
    const [u2After] = await getDb().select({ reputation: profiles.reputation }).from(profiles).where(eq(profiles.id, user2.id));
    expect(u2After.reputation).toBe(initialRep + 5);
  });

  it("love reaction awards +2 reputation points to the author", async () => {
    const postRes = await api("POST", `${B}/entities`, {
      token: user1.token,
      body: { title: "Love & Existence", content: "Love is the fundamental force", keywords: ["love"] },
    });
    expect(postRes.status).toBe(201);
    const post = postRes.body;

    const [u1Before] = await getDb().select({ reputation: profiles.reputation }).from(profiles).where(eq(profiles.id, user1.id));

    const reactRes = await api("POST", `${B}/entities/${post.id}/reactions`, {
      token: user2.token,
      body: { reactionType: "love" },
    });
    expect(reactRes.status).toBe(200);

    const [u1After] = await getDb().select({ reputation: profiles.reputation }).from(profiles).where(eq(profiles.id, user1.id));
    expect(u1After.reputation).toBe(u1Before.reputation + 2);
  });

  it("top suggested post bonus (+25 points) is awarded when a post reaches 5+ engagement", async () => {
    // Create a new post by user1
    const postRes = await api("POST", `${B}/entities`, {
      token: user1.token,
      body: { title: "Milestone Post", content: "Discussing top suggested status", keywords: ["top"] },
    });
    expect(postRes.status).toBe(201);
    const post = postRes.body;

    const [u1Before] = await getDb().select({ reputation: profiles.reputation }).from(profiles).where(eq(profiles.id, user1.id));

    // Create 5 comments on the post to reach 5 engagement
    for (let i = 0; i < 5; i++) {
      const cRes = await api("POST", `${B}/comments`, {
        token: user2.token,
        body: { entityId: post.id, content: `Insightful contribution #${i + 1}` },
      });
      expect(cRes.status).toBe(201);
    }

    // Author should receive +25 bonus points once
    const [u1After] = await getDb().select({ reputation: profiles.reputation }).from(profiles).where(eq(profiles.id, user1.id));
    expect(u1After.reputation).toBe(u1Before.reputation + 25);
  });
});
