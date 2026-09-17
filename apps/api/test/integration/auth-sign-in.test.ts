import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { api, createProject, deleteProject, base } from "./helpers.js";

describe("auth sign-in and sign-up flow (integration)", () => {
  let projectId: string;

  beforeAll(async () => {
    projectId = await createProject();
  });

  afterAll(async () => {
    if (projectId) await deleteProject(projectId);
  });

  it("signs up a new user successfully and signs in", async () => {
    const email = `testuser_${Date.now()}@example.com`;
    const password = "Password123!";

    // Sign up
    const signUpRes = await api("POST", `${base(projectId)}/auth/sign-up`, {
      body: { email, password, name: "Test User", username: `user_${Date.now()}` },
    });

    expect(signUpRes.status).toBe(201);
    expect(signUpRes.body.accessToken).toBeTruthy();
    expect(signUpRes.body.user).toBeTruthy();
    expect(signUpRes.body.user.email).toBe(email);

    // Sign in with valid credentials
    const signInRes = await api("POST", `${base(projectId)}/auth/sign-in`, {
      body: { email, password },
    });

    expect(signInRes.status).toBe(200);
    expect(signInRes.body.accessToken).toBeTruthy();
    expect(signInRes.body.user).toBeTruthy();
    expect(signInRes.body.user.email).toBe(email);
  });

  it("returns 401 Unauthorized for incorrect password (never 500)", async () => {
    const email = `testuser_wrong_${Date.now()}@example.com`;
    const password = "Password123!";

    await api("POST", `${base(projectId)}/auth/sign-up`, {
      body: { email, password, name: "Test User" },
    });

    const signInRes = await api("POST", `${base(projectId)}/auth/sign-in`, {
      body: { email, password: "WrongPassword123!" },
    });

    expect(signInRes.status).toBe(401);
    expect(signInRes.body.error).toBe("Invalid email or password");
    expect(signInRes.body.code).toBe("auth/invalid-credentials");
  });

  it("returns 401 Unauthorized for non-existent account (never 500)", async () => {
    const signInRes = await api("POST", `${base(projectId)}/auth/sign-in`, {
      body: { email: "nonexistent_account_999@example.com", password: "Password123!" },
    });

    expect(signInRes.status).toBe(401);
    expect(signInRes.body.error).toBe("Invalid email or password");
  });
});
