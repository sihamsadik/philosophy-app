import { describe, it, expect } from "vitest";
import { calculateIntellectualCompatibility } from "./intellectual-matching.js";
import type { User } from "@philosophy/contract";

describe("calculateIntellectualCompatibility", () => {
  const userA = {
    id: "user-1",
    name: "User A",
    username: "usera",
    reputation: 100,
    philosophyProfile: {
      worldviewSummary: "Hard determinist exploring agency.",
      primarySchools: ["Determinism", "Rationalism"],
      keyThinkers: ["Spinoza", "Kant"],
      coreQuestions: ["Does free will exist under determinism?"],
      favoriteTexts: ["Ethics"],
      connectionIntents: ["discussion", "intellectual"],
    },
  } as unknown as User;

  const userB = {
    id: "user-2",
    name: "User B",
    username: "userb",
    reputation: 90,
    philosophyProfile: {
      worldviewSummary: "Compatibilist defense of moral responsibility.",
      primarySchools: ["Compatibilism", "Existentialism"],
      keyThinkers: ["Kant", "Daniel Dennett"],
      coreQuestions: ["Does free will exist under determinism?"],
      favoriteTexts: ["Ethics"],
      connectionIntents: ["discussion"],
    },
  } as unknown as User;

  const userC = {
    id: "user-3",
    name: "User C",
    username: "userc",
    reputation: 80,
    philosophyProfile: {
      worldviewSummary: "Phenomenological inquiry into perception.",
      primarySchools: ["Phenomenology"],
      keyThinkers: ["Husserl", "Merleau-Ponty"],
      coreQuestions: ["What is the structure of conscious experience?"],
      favoriteTexts: ["Phenomenology of Perception"],
      connectionIntents: ["friendship"],
    },
  } as unknown as User;

  it("calculates dual-axis scores for overlapping core question with distinct schools (Productive Tension)", () => {
    const result = calculateIntellectualCompatibility(userA, userB);

    expect(result.sharedGroundScore).toBeGreaterThan(0);
    expect(result.productiveTensionScore).toBeGreaterThan(50);
    expect(result.overallScore).toBeGreaterThan(30);
    expect(result.overlappingThinkers).toContain("Kant");
    expect(result.overlappingQuestions).toContain("Does free will exist under determinism?");
    expect(result.explanation).toContain("Does free will exist under determinism?");
  });

  it("handles low similarity profiles gracefully", () => {
    const result = calculateIntellectualCompatibility(userA, userC);

    expect(result.sharedGroundScore).toBe(0);
    expect(result.overlappingSchools).toEqual([]);
    expect(result.explanation).toBe("Potential for new intellectual discovery through distinct worldviews and interests.");
  });
});
