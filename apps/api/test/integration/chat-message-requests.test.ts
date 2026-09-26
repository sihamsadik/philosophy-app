import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { jwtVerify } from "jose";
import { api, createProject, createUser, deleteProject, base } from "./helpers.js";

describe("Chat Message Requests Integration Tests", () => {
  let projectId: string;
  let sara: { id: string; token: string };
  let ahmed: { id: string; token: string };

  beforeAll(async () => {
    projectId = await createProject();
    sara = await createUser(projectId);
    ahmed = await createUser(projectId);
  });

  afterAll(async () => {
    if (projectId) await deleteProject(projectId);
  });

  it("TEST 1: Verify token signature", async () => {
    const secret = new TextEncoder().encode(process.env.ACCESS_TOKEN_SECRET);
    try {
      const decoded = await jwtVerify(sara.token, secret, { algorithms: ["HS256"] });
      console.log("Decoded Sara token:", decoded.payload);
      console.log("ProjectId:", projectId);
    } catch (e) {
      console.log("JWT Verify Error:", e);
    }

    const convoRes = await api("POST", `${base(projectId)}/chat/conversations/direct`, {
      token: sara.token,
      body: { userId: ahmed.id },
    });
    console.log("convoRes status:", convoRes.status, "body:", convoRes.body);
    expect(convoRes.status).toBe(201);
  });
});
