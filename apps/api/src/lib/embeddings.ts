// Voyage AI embeddings (Anthropic-recommended). Used for semantic content search.
// input_type matters for retrieval quality: "query" for searches, "document" for stored text.
import { getDb } from "../db/index.js";
import { contentEmbeddings } from "../db/schema/index.js";
import { env } from "./env.js";
import { logger } from "./logger.js";
import { allow } from "./embed-throttle.js";
import { enqueuePending } from "./pending-embeddings.js";
import { embeddingDurationMs, embeddingsTotal } from "./telemetry.js";

export type SourceType = "entity" | "comment" | "message" | "event" | "profile" | "space";

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";

export function embeddingsEnabled(): boolean {
  return !!env.VOYAGE_API_KEY;
}

/** Embed a single string. Throws if the provider isn't configured. */
export async function embedText(text: string, inputType: "query" | "document"): Promise<number[]> {
  if (!env.VOYAGE_API_KEY) throw new Error("VOYAGE_API_KEY not configured");
  // Ops metric: latency + outcome of every Voyage call (search queries and document indexing alike),
  // labelled by input_type. No-op when telemetry is disabled.
  const start = performance.now();
  try {
    const res = await fetch(VOYAGE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.VOYAGE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        input: [text],
        model: env.VOYAGE_MODEL,
        input_type: inputType,
        output_dimension: env.EMBEDDING_DIMENSIONS,
      }),
    });
    if (!res.ok) throw new Error(`Voyage error ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { data: { embedding: number[] }[] };
    const vec = json.data?.[0]?.embedding;
    if (!vec) throw new Error("Voyage returned no embedding");
    embeddingsTotal.add(1, { input_type: inputType, status: "ok" });
    embeddingDurationMs.record(performance.now() - start, { input_type: inputType });
    return vec;
  } catch (err) {
    embeddingsTotal.add(1, { input_type: inputType, status: "error" });
    embeddingDurationMs.record(performance.now() - start, { input_type: inputType });
    throw err;
  }
}

/** Embed a piece of content and upsert into content_embeddings. No-op if embeddings are off / text empty. */
export async function indexContent(projectId: string, sourceType: SourceType, sourceId: string, text: string | null | undefined): Promise<void> {
  if (!embeddingsEnabled() || !text?.trim()) return;
  // Outbound abuse throttle: if this project's write breaker is tripped, persist a durable flag instead
  // of calling Voyage. The drain cron replays it once the rate returns to normal.
  if (!allow("write", projectId)) {
    await enqueuePending(projectId, sourceType, sourceId, text);
    return;
  }
  const embedding = await embedText(text, "document");
  await getDb().insert(contentEmbeddings)
    .values({ projectId, sourceType, sourceId, embedding })
    .onConflictDoUpdate({ target: [contentEmbeddings.sourceType, contentEmbeddings.sourceId], set: { embedding, updatedAt: new Date() } });
}

/** Fire-and-forget indexing for write paths — never let embedding failures break the request. */
export function indexContentAsync(projectId: string, sourceType: SourceType, sourceId: string, text: string | null | undefined): void {
  indexContent(projectId, sourceType, sourceId, text).catch((e) => {
    logger.error("indexContent failed");
    logger.debug({ err: e, sourceType }, "indexContent failed");
  });
}

/** Back-compat convenience for entity write paths. */
export function indexEntityAsync(projectId: string, entityId: string, text: string | null | undefined): void {
  indexContentAsync(projectId, "entity", entityId, text);
}

export function buildProfileEmbedText(user: Record<string, any>): string {
  const parts: string[] = [];
  if (user.name) parts.push(`Name: ${user.name}`);
  if (user.username) parts.push(`Username: ${user.username}`);
  if (user.bio) parts.push(`Bio: ${user.bio}`);
  
  const p = user.philosophyProfile;
  if (p) {
    if (p.worldviewSummary) parts.push(`Worldview: ${p.worldviewSummary}`);
    if (p.primarySchools?.length) parts.push(`Philosophical Schools: ${p.primarySchools.join(", ")}`);
    if (p.keyThinkers?.length) parts.push(`Key Thinkers: ${p.keyThinkers.join(", ")}`);
    if (p.coreQuestions?.length) parts.push(`Core Questions: ${p.coreQuestions.join("; ")}`);
    if (p.favoriteTexts?.length) parts.push(`Favorite Texts: ${p.favoriteTexts.join(", ")}`);
  }
  return parts.join("\n");
}

export function indexUserAsync(projectId: string, user: Record<string, any>): void {
  const text = buildProfileEmbedText(user);
  indexContentAsync(projectId, "profile", user.id, text);
}

export function buildSpaceEmbedText(space: Record<string, any>): string {
  const parts: string[] = [`Space: ${space.name}`];
  if (space.description) parts.push(`Description: ${space.description}`);
  const m = space.philosophyMetadata;
  if (m) {
    if (m.categoryType) parts.push(`Category: ${m.categoryType}`);
    if (m.canonicalName) parts.push(`Canonical Name: ${m.canonicalName}`);
    if (m.discourseRules?.length) parts.push(`Discourse Rules: ${m.discourseRules.join("; ")}`);
  }
  return parts.join("\n");
}

export function indexSpaceAsync(projectId: string, space: Record<string, any>): void {
  const text = buildSpaceEmbedText(space);
  indexContentAsync(projectId, "space", space.id, text);
}
