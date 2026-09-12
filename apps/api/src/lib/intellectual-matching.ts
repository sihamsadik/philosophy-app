import type { User, CompatibilityScore } from "@philosophy/contract";

function normalizeStringList(list?: string[] | null): string[] {
  if (!Array.isArray(list)) return [];
  return list.map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function findOverlap(listA?: string[] | null, listB?: string[] | null): string[] {
  const normA = normalizeStringList(listA);
  const normB = normalizeStringList(listB);
  const setB = new Set(normB);

  const matched = new Set<string>();
  if (Array.isArray(listA)) {
    for (const item of listA) {
      if (setB.has(item.trim().toLowerCase())) {
        matched.add(item.trim());
      }
    }
  }
  return [...matched];
}

/**
 * Calculates dual-axis intellectual compatibility between user A and user B:
 * 1. Shared Ground Score (Similarity: schools, thinkers, questions, texts)
 * 2. Productive Tension Score (Meaningful Difference: shared questions/topics, but distinct perspectives)
 * 3. Human-readable explainable AI compatibility breakdown.
 */
export function calculateIntellectualCompatibility(targetUser: User, candidateUser: User): CompatibilityScore {
  const targetP = targetUser.philosophyProfile;
  const candidateP = candidateUser.philosophyProfile;

  const overlappingSchools = findOverlap(targetP?.primarySchools, candidateP?.primarySchools);
  const overlappingThinkers = findOverlap(targetP?.keyThinkers, candidateP?.keyThinkers);
  const overlappingQuestions = findOverlap(targetP?.coreQuestions, candidateP?.coreQuestions);
  const overlappingTexts = findOverlap(targetP?.favoriteTexts, candidateP?.favoriteTexts);

  // 1. Shared Ground Score (0..100)
  const schoolsScore = Math.min(100, overlappingSchools.length * 35);
  const thinkersScore = Math.min(100, overlappingThinkers.length * 30);
  const textsScore = Math.min(100, overlappingTexts.length * 25);
  const questionsScore = Math.min(100, overlappingQuestions.length * 25);

  const sharedGroundRaw = (schoolsScore * 0.35) + (thinkersScore * 0.30) + (textsScore * 0.15) + (questionsScore * 0.20);
  const sharedGroundScore = Math.min(100, Math.round(sharedGroundRaw));

  // 2. Productive Tension Score (0..100)
  const hasSharedQuestionsOrTexts = overlappingQuestions.length > 0 || overlappingTexts.length > 0;
  const distinctSchoolsCount = (targetP?.primarySchools?.length ?? 0) + (candidateP?.primarySchools?.length ?? 0) - (overlappingSchools.length * 2);

  let productiveTensionRaw = 0;
  if (hasSharedQuestionsOrTexts && distinctSchoolsCount > 0) {
    productiveTensionRaw = 50 + (distinctSchoolsCount * 15) + (overlappingQuestions.length * 15);
  } else if (overlappingQuestions.length > 0) {
    productiveTensionRaw = 40 + (overlappingQuestions.length * 20);
  } else if (distinctSchoolsCount > 0 && overlappingThinkers.length > 0) {
    productiveTensionRaw = 35 + (overlappingThinkers.length * 15);
  }

  const productiveTensionScore = Math.min(100, Math.round(productiveTensionRaw));

  // 3. Overall Combined Score (0..100)
  const overallRaw = (sharedGroundScore * 0.6) + (productiveTensionScore * 0.4);
  const overallScore = Math.min(100, Math.max(10, Math.round(overallRaw)));

  // 4. Generate Explainable Compatibility text
  const explanationParts: string[] = [];

  if (overlappingSchools.length > 0) {
    explanationParts.push(`Both of you share an interest in ${overlappingSchools.join(" and ")}.`);
  }

  if (overlappingThinkers.length > 0) {
    explanationParts.push(`You share key thinkers including ${overlappingThinkers.join(", ")}.`);
  }

  if (overlappingQuestions.length > 0) {
    if (distinctSchoolsCount > 0) {
      explanationParts.push(`You both explore questions like "${overlappingQuestions[0]}", but approach it from complementary perspectives.`);
    } else {
      explanationParts.push(`You both care deeply about the question: "${overlappingQuestions[0]}".`);
    }
  } else if (distinctSchoolsCount > 0 && overlappingSchools.length > 0) {
    explanationParts.push(`Your shared ground in ${overlappingSchools[0]} provides a foundation for exploring your distinct philosophical perspectives.`);
  }

  if (explanationParts.length === 0) {
    explanationParts.push("Potential for new intellectual discovery through distinct worldviews and interests.");
  }

  const explanation = explanationParts.join(" ");

  return {
    overallScore,
    sharedGroundScore,
    productiveTensionScore,
    overlappingSchools,
    overlappingThinkers,
    overlappingQuestions,
    overlappingTexts,
    explanation,
  };
}
