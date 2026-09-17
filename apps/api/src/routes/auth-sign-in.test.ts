import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createApp } from "../app.js";
import { getDb } from "../db/index.js";
import { projects } from "../db/schema/index.js";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

const app = createApp();

async function createProject(): Promise<string> {
  const [p] = await getDb()
    .insert(projects)
    .values({ clientId: `test-${randomUUID()}`, name: "integration" })
    .returning();
  return p!.id;
}

async function deleteProject(projectId: string) {
  await getDb().delete(projects).where(eq(projects.id, projectId));
}

async function request(method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await app.request(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

describe("auth sign-in and sign-up flow", () => {
  let projectId: string;

  beforeAll(async () => {
    projectId = await createProject();
  });

  afterAll(async () => {
    if (projectId) await deleteProject(projectId);
  });

  it("signs up a new user successfully and signs in with valid credentials", async () => {
    const email = `testuser_${Date.now()}@example.com`;
    const password = "Password123!";
    const basePath = `/v7/${projectId}`;

    // Sign up
    const signUpRes = await request("POST", `${basePath}/auth/sign-up`, {
      email,
      password,
      name: "Test User",
      username: `user_${Date.now()}`,
    });

    expect(signUpRes.status).toBe(201);
    expect(signUpRes.body.accessToken).toBeTruthy();
    expect(signUpRes.body.user).toBeTruthy();
    expect(signUpRes.body.user.email).toBe(email);

    // Sign in
    const signInRes = await request("POST", `${basePath}/auth/sign-in`, {
      email,
      password,
    });

    expect(signInRes.status).toBe(200);
    expect(signInRes.body.accessToken).toBeTruthy();
    expect(signInRes.body.user).toBeTruthy();
    expect(signInRes.body.user.email).toBe(email);
  });

  it("returns 401 Unauthorized for wrong password (never 500)", async () => {
    const email = `testuser_wrong_${Date.now()}@example.com`;
    const password = "Password123!";
    const basePath = `/v7/${projectId}`;

    await request("POST", `${basePath}/auth/sign-up`, {
      email,
      password,
      name: "Test User",
    });

    const signInRes = await request("POST", `${basePath}/auth/sign-in`, {
      email,
      password: "WrongPassword123!",
    });

    expect(signInRes.status).toBe(401);
    expect(signInRes.body.error).toBe("Invalid email or password");
    expect(signInRes.body.code).toBe("auth/invalid-credentials");
  });

  it("returns 401 Unauthorized for non-existent account (never 500)", async () => {
    const basePath = `/v7/${projectId}`;
    const signInRes = await request("POST", `${basePath}/auth/sign-in`, {
      email: "nonexistent_account_999@example.com",
      password: "Password123!",
    });

    expect(signInRes.status).toBe(401);
    expect(signInRes.body.error).toBe("Invalid email or password");
  });
});
