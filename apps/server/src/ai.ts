import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import type { ServerRuntimeEnv } from "./env.server";

export function getModel(env: Pick<ServerRuntimeEnv, "OPENROUTER_API_KEY" | "OPENROUTER_MODEL">) {
  const openrouter = createOpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
  });
  return openrouter(env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash");
}
