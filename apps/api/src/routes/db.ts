// /v7/:projectId/db/* — Legacy schemaless table store (retired).
import { Hono } from "hono";
import type { Variables } from "../http/context.js";
import { Errors } from "../http/errors.js";

export const dbRoutes = new Hono<{ Variables: Variables }>()
  .all("*", (c) => {
    throw Errors.badRequest("db/disabled", "The generic table_rows store has been disabled in this clean database schema.");
  });
