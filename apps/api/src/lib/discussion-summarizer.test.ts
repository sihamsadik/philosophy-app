import { describe, it, expect } from "vitest";
import { discussionSummarySchema } from "@philosophy/contract";

describe("Discussion Summary Schema", () => {
  it("validates a structured discussion summary object", () => {
    const validSummary = {
      entityId: "00000000-0000-0000-0000-000000000001",
      commentCount: 4,
      mainPositions: [
        {
          title: "Hard Determinism",
          proponent: "Spinoza",
          summary: "All events are causally determined by antecedent states and laws of nature.",
        },
        {
          title: "Compatibilism",
          proponent: "Kant",
          summary: "Free will consists in acting according to rational principles despite physical causality.",
        },
      ],
      keyArguments: [
        {
          argument: "Premise of physical closure implies no uncaused actions.",
          rebuttal: "Moral agency requires internal rational evaluation regardless of physical sub-structures.",
        },
      ],
      pointsOfAgreement: ["Both stances accept physical causality in nature."],
      pointsOfDisagreement: ["Whether moral responsibility requires alternative possibilities."],
      unresolvedQuestions: ["Can agent-causation be formulated without substance dualism?"],
      generatedAt: new Date().toISOString(),
    };

    const parsed = discussionSummarySchema.safeParse(validSummary);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.mainPositions).toHaveLength(2);
      expect(parsed.data.keyArguments[0]?.rebuttal).toBeDefined();
    }
  });
});
