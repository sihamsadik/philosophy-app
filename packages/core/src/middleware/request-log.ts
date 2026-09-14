// Structured HTTP request logging (replaces hono/logger). Times each request and emits one line per
// response through the shared Pino logger: info for <400, warn for >=400. Mounted app-wide in app.ts.
import { createMiddleware } from "hono/factory";
import type { Variables } from "../http/context.js";
import { logger } from "../lib/logger.js";

export const requestLog = createMiddleware<{ Variables: Variables }>(async (c, next) => {
  const start = performance.now();
  try {
    await next();
  } finally {
    const durationMs = Math.round((performance.now() - start) * 10) / 10;
    const fields = { method: c.req.method, path: c.req.path, status: c.res.status, durationMs };
    const msg = `${c.req.method} ${c.req.path} ${c.res.status} (${durationMs}ms)`;
    if (c.res.status >= 500) logger.error(fields, msg);
    else if (c.res.status >= 400) logger.warn(fields, msg);
    else logger.info(fields, msg);
  }
});
