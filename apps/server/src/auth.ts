import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { Context, Next } from "hono";

import type { AuthUser } from "@nationa/api/context";

import type { AppHonoEnv } from "./context";
import { env, type ServerRuntimeEnv } from "./env.server";

const SUPABASE_AUDIENCE = "authenticated";

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function resolveJwksUrl(runtimeEnv: ServerRuntimeEnv): URL | undefined {
  if (runtimeEnv.SUPABASE_JWKS_URL) {
    return new URL(runtimeEnv.SUPABASE_JWKS_URL);
  }
  if (runtimeEnv.SUPABASE_URL) {
    return new URL(`${runtimeEnv.SUPABASE_URL}/auth/v1/.well-known/jwks.json`);
  }
  return undefined;
}

function getJwks(runtimeEnv: ServerRuntimeEnv): ReturnType<typeof createRemoteJWKSet> {
  if (!jwks) {
    const url = resolveJwksUrl(runtimeEnv);
    if (!url) {
      throw new Error("SUPABASE_URL or SUPABASE_JWKS_URL must be configured");
    }
    jwks = createRemoteJWKSet(url);
  }
  return jwks;
}

function toAuthUser(payload: JWTPayload): AuthUser {
  const id = typeof payload.sub === "string" ? payload.sub : undefined;
  if (!id) {
    throw new Error("Token is missing the sub claim");
  }
  const email = typeof payload.email === "string" ? payload.email : undefined;
  const role = typeof payload.role === "string" ? payload.role : undefined;
  return { id, email, role };
}

/**
 * Optional Supabase auth middleware.
 *
 * Requests without an `Authorization` header continue anonymously (`user` is
 * `null`), which lets public routes (`/`, `/rpc/healthCheck`, OpenAPI
 * reference) through. Requests with a malformed or invalid bearer token are
 * rejected with 401. Protected oRPC procedures still enforce a user through
 * `authedProcedure`/`requireUser`.
 */
export function createAuthMiddleware() {
  return async (c: Context<AppHonoEnv>, next: Next): Promise<void | Response> => {
    const header = c.req.header("Authorization");
    if (!header) {
      c.set("user", null);
      await next();
      return;
    }

    const [scheme, token] = header.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const runtimeEnv = c.env ?? env;
    const issuer = runtimeEnv.SUPABASE_URL ? `${runtimeEnv.SUPABASE_URL}/auth/v1` : undefined;
    try {
      const { payload } = await jwtVerify(token, getJwks(runtimeEnv), {
        issuer,
        audience: SUPABASE_AUDIENCE,
      });
      c.set("user", toAuthUser(payload));
    } catch {
      const secret = runtimeEnv.SUPABASE_JWT_SECRET;
      if (!secret) {
        return c.json({ error: "Unauthorized" }, 401);
      }
      try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
          issuer,
          audience: SUPABASE_AUDIENCE,
          algorithms: ["HS256"],
        });
        c.set("user", toAuthUser(payload));
      } catch {
        return c.json({ error: "Unauthorized" }, 401);
      }
    }

    await next();
  };
}
