// /v7/:projectId/match/* — user matching with intellectual compatibility engine
import { Hono } from "hono";
import { and, eq, ne } from "drizzle-orm";
import type { Variables } from "../http/context.js";
import { requireAuth } from "../middleware/auth.js";
import { parseBody } from "../lib/validation.js";
import { matchUsersSchema } from "@agora-server/contract";
import { getDb } from "../db/index.js";
import { profiles } from "../db/schema/index.js";
import { shapeUser } from "../lib/shape.js";
import { calculateIntellectualCompatibility } from "../lib/intellectual-matching.js";

export const matchRoutes = new Hono<{ Variables: Variables }>()
  .post("/users", requireAuth, async (c) => {
    const body = parseBody(matchUsersSchema, await c.req.json().catch(() => ({})), "match");
    const currentUserId = c.var.auth!.userId;
    const projectId = c.var.projectId;

    const [targetRow] = await getDb()
      .select()
      .from(profiles)
      .where(and(eq(profiles.projectId, projectId), eq(profiles.id, currentUserId)))
      .limit(1);

    if (!targetRow) {
      return c.json({ results: [] });
    }

    const targetUser = shapeUser(targetRow);

    const candidateRows = await getDb()
      .select()
      .from(profiles)
      .where(and(eq(profiles.projectId, projectId), ne(profiles.id, currentUserId)))
      .limit(100);

    const candidates = candidateRows.map(shapeUser);

    const results = candidates.map((candidate) => {
      const compatibility = calculateIntellectualCompatibility(targetUser, candidate);
      return {
        user: candidate,
        score: compatibility.overallScore / 100,
        compatibility,
      };
    });

    results.sort((a, b) => b.score - a.score);

    return c.json({
      results: results.slice(0, 20),
    });
  });
