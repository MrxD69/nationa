/// <reference types="@cloudflare/workers-types" />
// For Cloudflare Workers, env is accessed via the `cloudflare:workers` module.
// Types are defined in cloudflare-env.d.ts based on your alchemy.run.ts bindings.
// The extra (optional) keys are declared here until the infra builder wires the
// corresponding bindings in packages/infra/alchemy.run.ts.
//
// Under Node/Bun the module is unavailable, so we resolve it at runtime and fall
// back to `process.env`. The dynamic import is kept external in the Workers
// bundle (see tsdown.config.ts) so the Worker path is unchanged.

type CloudflareRuntimeEnv = (typeof import("cloudflare:workers"))["env"];

export type ServerRuntimeEnv = CloudflareRuntimeEnv & {
  OPENROUTER_API_KEY?: string;
  OPENROUTER_MODEL?: string;
  SUPABASE_URL?: string;
  SUPABASE_JWKS_URL?: string;
  SUPABASE_JWT_SECRET?: string;
  R2_BUCKET_NAME?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  DOCUMENTS_BUCKET?: R2Bucket;
};

async function resolveServerEnv(): Promise<ServerRuntimeEnv> {
  try {
    const mod = await import("cloudflare:workers");
    return mod.env as ServerRuntimeEnv;
  } catch {
    return process.env as unknown as ServerRuntimeEnv;
  }
}

export const env: ServerRuntimeEnv = await resolveServerEnv();
