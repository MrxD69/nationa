import { streamAssistantResponse } from "@nationa/api/services/ai";
import type { Context as HonoContext, Hono } from "hono";

import { createContext, type AppHonoEnv } from "../context";

export function registerAssistantRoutes(app: Hono<AppHonoEnv>): void {
  const handler = async (c: HonoContext<AppHonoEnv>) => {
    if (!c.get("user")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const context = await createContext({ context: c });
    return streamAssistantResponse(context, body);
  };

  app.post("/assistant/chat", handler);
  app.post("/ai", handler);
}
