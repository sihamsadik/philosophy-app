import { describe, it, expect } from "vitest";
import { computeBadgesFromStats } from "./lib/badges.js";

describe("Platform Achievement Badges Logic", () => {
  it("should calculate 0% progress for a new user with 0 stats", () => {
    const badges = computeBadgesFromStats({
      reputation: 0,
      argumentsCount: 0,
      symposiumsHosted: 0,
      spacesJoined: 0,
    });

    expect(badges).toHaveLength(5);
    const masterDebater = badges.find((b) => b.code === "master_debater");
    const stoicScholar = badges.find((b) => b.code === "stoic_scholar");
    const symposiumHost = badges.find((b) => b.code === "symposium-host");
    const circleSteward = badges.find((b) => b.code === "circle_steward");
    const catalyst = badges.find((b) => b.code === "philosophical_catalyst");

    expect(masterDebater?.progressPercentage).toBe(0);
    expect(stoicScholar?.progressPercentage).toBe(0);
    expect(symposiumHost?.progressPercentage).toBe(0);
    expect(circleSteward?.progressPercentage).toBe(0);
    expect(catalyst?.progressPercentage).toBe(0);
  });

  it("should correctly compute partial progress and unlocked badges for active users", () => {
    const badges = computeBadgesFromStats({
      reputation: 500,
      argumentsCount: 5,
      symposiumsHosted: 3,
      spacesJoined: 2,
    });

    const masterDebater = badges.find((b) => b.code === "master_debater");
    const stoicScholar = badges.find((b) => b.code === "stoic_scholar");
    const symposiumHost = badges.find((b) => b.code === "symposium-host");
    const circleSteward = badges.find((b) => b.code === "circle_steward");
    const catalyst = badges.find((b) => b.code === "philosophical_catalyst");

    expect(masterDebater?.progressPercentage).toBe(100);
    expect(symposiumHost?.progressPercentage).toBe(100);
    expect(circleSteward?.progressPercentage).toBe(100);
    expect(stoicScholar?.progressPercentage).toBe(100); // 500/200 >= 100%
    expect(catalyst?.progressPercentage).toBe(50); // 500/1000 = 50%
  });

  it("should unlock philosophical catalyst at 1000 reputation", () => {
    const badges = computeBadgesFromStats({
      reputation: 1200,
      argumentsCount: 10,
      symposiumsHosted: 5,
      spacesJoined: 4,
    });

    const catalyst = badges.find((b) => b.code === "philosophical_catalyst");
    expect(catalyst?.progressPercentage).toBe(100);
  });
});
