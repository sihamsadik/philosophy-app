import { Hono } from "hono";
import { and, eq, ne, or } from "drizzle-orm";
import type { Variables } from "../http/context.js";
import { Errors } from "../http/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { getDb } from "../db/index.js";
import { profiles, connections } from "../db/schema/index.js";
import { shapeUser } from "../lib/shape.js";
import { calculateIntellectualCompatibility } from "../lib/intellectual-matching.js";
import type { UserRecommendation, ConnectionIntent, User } from "@philosophy/contract";

export const recommendationRoutes = new Hono<{ Variables: Variables }>()
  .get("/people", requireAuth, async (c) => {
    const currentUserId = c.var.auth!.userId;
    const projectId = c.var.projectId;

    const intentQuery = c.req.query("intent") as ConnectionIntent | undefined;
    const schoolQuery = c.req.query("school")?.toLowerCase();
    const thinkerQuery = c.req.query("thinker")?.toLowerCase();
    const limitQuery = parseInt(c.req.query("limit") ?? "10", 10);
    const limit = isNaN(limitQuery) ? 10 : Math.min(Math.max(limitQuery, 1), 50);

    const [targetRow] = await getDb()
      .select()
      .from(profiles)
      .where(and(eq(profiles.projectId, projectId), eq(profiles.id, currentUserId)))
      .limit(1);

    if (!targetRow) {
      throw Errors.notFound("users/not-found", "Target user profile not found");
    }

    const targetUser = shapeUser(targetRow);
    if (!targetUser) {
      throw Errors.notFound("users/not-found", "Target user profile not found");
    }

    // Load all connections involving current user to determine relationship state & filter connected peers
    const connRows = await getDb()
      .select()
      .from(connections)
      .where(and(
        eq(connections.projectId, projectId),
        or(eq(connections.requesterId, currentUserId), eq(connections.addresseeId, currentUserId))
      ));

    const connMap = new Map<string, { status: string; connectionId: string; isRequester: boolean }>();
    for (const r of connRows) {
      const otherId = r.requesterId === currentUserId ? r.addresseeId : r.requesterId;
      connMap.set(otherId, {
        status: r.status,
        connectionId: r.id,
        isRequester: r.requesterId === currentUserId,
      });
    }

    const candidateRows = await getDb()
      .select()
      .from(profiles)
      .where(and(eq(profiles.projectId, projectId), ne(profiles.id, currentUserId)))
      .limit(200);

    let candidates = candidateRows.map(shapeUser).filter((u): u is User => u !== null);

    // Filter out already connected users
    candidates = candidates.filter((candidate) => {
      const conn = connMap.get(candidate.id);
      return !conn || conn.status !== "connected";
    });

    if (intentQuery) {
      candidates = candidates.filter((candidate) => {
        const intents = candidate.philosophyProfile?.connectionIntents;
        return Array.isArray(intents) && intents.includes(intentQuery);
      });
    }

    if (schoolQuery) {
      candidates = candidates.filter((candidate) => {
        const schools = candidate.philosophyProfile?.primarySchools;
        return Array.isArray(schools) && schools.some((s) => s.toLowerCase().includes(schoolQuery));
      });
    }

    if (thinkerQuery) {
      candidates = candidates.filter((candidate) => {
        const thinkers = candidate.philosophyProfile?.keyThinkers;
        return Array.isArray(thinkers) && thinkers.some((t) => t.toLowerCase().includes(thinkerQuery));
      });
    }

    const recommendations = candidates.map((candidate) => {
      const compatibility = calculateIntellectualCompatibility(targetUser, candidate);
      const conn = connMap.get(candidate.id);
      let relationshipState: "none" | "outgoing_pending" | "incoming_pending" | "connected" = "none";
      if (conn) {
        if (conn.status === "connected") relationshipState = "connected";
        else if (conn.status === "pending") {
          relationshipState = conn.isRequester ? "outgoing_pending" : "incoming_pending";
        }
      }
      return {
        user: candidate,
        compatibility,
        relationshipState,
        connectionId: conn?.connectionId,
      };
    });

    recommendations.sort((a, b) => {
      if (b.compatibility.overallScore !== a.compatibility.overallScore) {
        return b.compatibility.overallScore - a.compatibility.overallScore;
      }
      return (b.user.reputation ?? 0) - (a.user.reputation ?? 0);
    });

    return c.json({
      recommendations: recommendations.slice(0, limit),
    });
  });
