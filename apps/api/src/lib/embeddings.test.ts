import { describe, it, expect } from "vitest";
import { buildProfileEmbedText, buildSpaceEmbedText } from "./embeddings.js";

describe("buildProfileEmbedText", () => {
  it("formats profile details into structured embedding input text", () => {
    const text = buildProfileEmbedText({
      name: "Jean-Paul Sartre",
      username: "sartre",
      bio: "Existence precedes essence.",
      philosophyProfile: {
        worldviewSummary: "Radical freedom and responsibility.",
        primarySchools: ["Existentialism", "Phenomenology"],
        keyThinkers: ["Heidegger", "Husserl"],
        coreQuestions: ["How to live authentically without bad faith?"],
        favoriteTexts: ["Being and Nothingness"],
        connectionIntents: ["discussion"],
      },
    });

    expect(text).toContain("Name: Jean-Paul Sartre");
    expect(text).toContain("Username: sartre");
    expect(text).toContain("Bio: Existence precedes essence.");
    expect(text).toContain("Worldview: Radical freedom and responsibility.");
    expect(text).toContain("Philosophical Schools: Existentialism, Phenomenology");
    expect(text).toContain("Key Thinkers: Heidegger, Husserl");
    expect(text).toContain("Core Questions: How to live authentically without bad faith?");
    expect(text).toContain("Favorite Texts: Being and Nothingness");
  });
});

describe("buildSpaceEmbedText", () => {
  it("formats space details into structured embedding input text", () => {
    const text = buildSpaceEmbedText({
      name: "Existentialism",
      description: "Exploration of freedom and meaning.",
      philosophyMetadata: {
        categoryType: "school",
        canonicalName: "Existentialism",
        discourseRules: ["Charitable Interpretation"],
      },
    });

    expect(text).toContain("Space: Existentialism");
    expect(text).toContain("Description: Exploration of freedom and meaning.");
    expect(text).toContain("Category: school");
    expect(text).toContain("Canonical Name: Existentialism");
    expect(text).toContain("Discourse Rules: Charitable Interpretation");
  });
});
