import { and, eq, isNull, asc } from "drizzle-orm";
import type { DiscussionSummary, PhilosophicalPosition, ArgumentRebuttal } from "@agora-server/contract";
import { getDb } from "../db/index.js";
import { entities, comments, profiles } from "../db/schema/index.js";
import { Errors } from "../http/errors.js";
import { env } from "./env.js";

interface CommentWithAuthor {
  id: string;
  parentId: string | null;
  content: string;
  createdAt: Date;
  authorName: string | null;
  username: string | null;
}

/**
 * Heuristic debate analyzer fallback when LLM API keys are not present.
 * Evaluates comment tree structure, thesis statements, agreements, rebuttals, and open questions.
 */
function analyzeDebateHeuristically(
  entityTitle: string,
  entityContent: string,
  commentsList: CommentWithAuthor[]
): {
  mainPositions: PhilosophicalPosition[];
  keyArguments: ArgumentRebuttal[];
  pointsOfAgreement: string[];
  pointsOfDisagreement: string[];
  unresolvedQuestions: string[];
} {
  const mainPositions: PhilosophicalPosition[] = [
    {
      title: entityTitle || "Original Philosophical Thesis",
      summary: entityContent ? entityContent.slice(0, 180) + (entityContent.length > 180 ? "..." : "") : "Primary thesis presented in post.",
    },
  ];

  const keyArguments: ArgumentRebuttal[] = [];
  const pointsOfAgreement: string[] = [];
  const pointsOfDisagreement: string[] = [];
  const unresolvedQuestions: string[] = [];

  const agreeKeywords = ["agree", "exactly", "concur", "aligned", "indeed", "spot on"];
  const disagreeKeywords = ["disagree", "however", "contrary", "flaw", "objection", "rebuttal", "counterargument"];

  for (const c of commentsList) {
    const text = c.content.trim();
    const author = c.authorName || c.username || "Anonymous thinker";

    // 1. Identify questions
    if (text.includes("?")) {
      const sentences = text.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if (sentence.includes("?") && sentence.length > 15) {
          unresolvedQuestions.push(sentence.trim());
        }
      }
    }

    // 2. Identify Agreement vs Disagreement
    const lower = text.toLowerCase();
    const isAgree = agreeKeywords.some((k) => lower.includes(k));
    const isDisagree = disagreeKeywords.some((k) => lower.includes(k));

    if (isAgree) {
      pointsOfAgreement.push(`${author} supports the stance on: "${text.slice(0, 100)}..."`);
    }

    if (isDisagree) {
      pointsOfDisagreement.push(`${author} raises an objection: "${text.slice(0, 100)}..."`);
      keyArguments.push({
        argument: `Objection from ${author}: ${text.slice(0, 140)}`,
        rebuttal: c.parentId ? "Rebutted in sub-thread reply." : undefined,
      });
    } else if (c.parentId && !isAgree) {
      keyArguments.push({
        argument: `${author}'s response: ${text.slice(0, 140)}`,
      });
    }

    // Extract secondary positions from top-level comments
    if (!c.parentId && text.length > 50 && mainPositions.length < 4) {
      mainPositions.push({
        title: `Counter-Perspective by ${author}`,
        proponent: author,
        summary: text.slice(0, 160) + (text.length > 160 ? "..." : ""),
      });
    }
  }

  // Ensure default non-empty fallback lists if thread was quiet
  if (pointsOfAgreement.length === 0 && commentsList.length > 0) {
    pointsOfAgreement.push("General consensus on exploring foundational terminology and premises.");
  }
  if (pointsOfDisagreement.length === 0 && commentsList.length > 0) {
    pointsOfDisagreement.push("Divergent perspectives on core metaphysical / ethical implications.");
  }
  if (unresolvedQuestions.length === 0) {
    unresolvedQuestions.push("How do these arguments hold up under edge-case thought experiments?");
  }

  return {
    mainPositions,
    keyArguments: keyArguments.slice(0, 6),
    pointsOfAgreement: pointsOfAgreement.slice(0, 4),
    pointsOfDisagreement: pointsOfDisagreement.slice(0, 4),
    unresolvedQuestions: unresolvedQuestions.slice(0, 4),
  };
}

/**
 * LLM-based debate summarization over Anthropic API.
 */
async function summarizeDebateWithLLM(
  entityTitle: string,
  entityContent: string,
  commentsList: CommentWithAuthor[]
): Promise<{
  mainPositions: PhilosophicalPosition[];
  keyArguments: ArgumentRebuttal[];
  pointsOfAgreement: string[];
  pointsOfDisagreement: string[];
  unresolvedQuestions: string[];
} | null> {
  if (!env.ANTHROPIC_API_KEY) return null;

  const threadTranscript = commentsList
    .map((c, i) => `[Comment #${i + 1}] Author: ${c.authorName || c.username || "User"} (Parent: ${c.parentId ?? "None"})\n${c.content}`)
    .join("\n\n");

  const prompt = `Post Title: ${entityTitle}\nPost Content: ${entityContent}\n\nDiscussion Thread:\n${threadTranscript}\n\nPlease analyze this philosophical discussion and provide a JSON summary.`;
  const system = `You are a world-class philosophical debate analyst. Analyze the provided post and discussion comments and extract structured philosophical insights.
Return ONLY valid JSON matching this schema:
{
  "mainPositions": [{ "title": string, "proponent": string, "summary": string }],
  "keyArguments": [{ "argument": string, "rebuttal": string }],
  "pointsOfAgreement": [string],
  "pointsOfDisagreement": [string],
  "unresolvedQuestions": [string]
}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const rawText = data?.content?.[0]?.text;
    if (!rawText) return null;

    const cleanedJson = rawText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    return JSON.parse(cleanedJson);
  } catch {
    return null;
  }
}

/**
 * Generates structured AI discussion summary & debate analysis for an entity.
 */
export async function generateDiscussionSummary(projectId: string, entityId: string): Promise<DiscussionSummary> {
  const [entityRow] = await getDb()
    .select()
    .from(entities)
    .where(and(eq(entities.projectId, projectId), eq(entities.id, entityId), isNull(entities.deletedAt)))
    .limit(1);

  if (!entityRow) {
    throw Errors.notFound("entities/not-found", "Entity not found");
  }

  const commentRows = await getDb()
    .select({
      id: comments.id,
      parentId: comments.parentId,
      content: comments.content,
      createdAt: comments.createdAt,
      authorName: profiles.name,
      username: profiles.username,
    })
    .from(comments)
    .leftJoin(profiles, eq(comments.userId, profiles.id))
    .where(and(eq(comments.projectId, projectId), eq(comments.entityId, entityId), isNull(comments.deletedAt)))
    .orderBy(asc(comments.createdAt));

  const commentCount = commentRows.length;
  let analysis = await summarizeDebateWithLLM(
    entityRow.title || "Untitled Entity",
    entityRow.content || "",
    commentRows
  );

  if (!analysis) {
    analysis = analyzeDebateHeuristically(
      entityRow.title || "Untitled Entity",
      entityRow.content || "",
      commentRows
    );
  }

  return {
    entityId,
    commentCount,
    mainPositions: analysis.mainPositions ?? [],
    keyArguments: analysis.keyArguments ?? [],
    pointsOfAgreement: analysis.pointsOfAgreement ?? [],
    pointsOfDisagreement: analysis.pointsOfDisagreement ?? [],
    unresolvedQuestions: analysis.unresolvedQuestions ?? [],
    generatedAt: new Date().toISOString(),
  };
}
