import { documentObjectKey, type StoragePort } from "@nationa/api/storage/port";
import type { Context, Hono } from "hono";

import type { AppHonoEnv } from "../context";
import type { ServerRuntimeEnv } from "../env.server";
import { createStorageFromRuntimeEnv } from "../storage/r2";

const MAX_KEY_LENGTH = 1024;

function validateKey(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }
  const key = raw;
  if (key.length === 0 || key.length > MAX_KEY_LENGTH) {
    return null;
  }
  if (key.startsWith("/") || key.endsWith("/")) {
    return null;
  }
  if (key.includes("\\") || key.includes("\0")) {
    return null;
  }
  for (const segment of key.split("/")) {
    if (segment === "" || segment === "." || segment === "..") {
      return null;
    }
  }
  return key;
}

function storageFromEnv(runtimeEnv: ServerRuntimeEnv): StoragePort {
  return createStorageFromRuntimeEnv(runtimeEnv);
}

function resolveUploadKey(c: Context<AppHonoEnv>): string | null {
  const explicit = c.req.query("key") ?? c.req.header("x-file-key");
  if (explicit) {
    return validateKey(explicit);
  }

  const fileName = c.req.query("fileName") ?? c.req.header("x-file-name");
  const documentId = c.req.query("documentId") ?? c.req.header("x-document-id");
  const versionRaw = c.req.query("version") ?? c.req.header("x-document-version");
  if (!fileName || !documentId || !versionRaw) {
    return null;
  }

  if (!/^\d+$/.test(versionRaw)) {
    return null;
  }
  const version = Number.parseInt(versionRaw, 10);

  const companyId = c.req.query("companyId") ?? c.req.header("x-company-id");
  const caseId = c.req.query("caseId") ?? c.req.header("x-case-id");

  try {
    return validateKey(
      documentObjectKey({
        companyId: companyId || undefined,
        caseId: caseId || undefined,
        documentId,
        version,
        fileName,
      }),
    );
  } catch {
    return null;
  }
}

export function registerFileRoutes(app: Hono<AppHonoEnv>): void {
  app.post("/files/upload", async (c) => {
    if (!c.get("user")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const key = resolveUploadKey(c);
    if (!key) {
      return c.json({ error: "A valid file key is required" }, 400);
    }

    const body = await c.req.arrayBuffer();
    const contentType =
      c.req.query("contentType") ?? c.req.header("content-type") ?? "application/octet-stream";

    await storageFromEnv(c.env).put(key, body, { contentType, size: body.byteLength });

    return c.json({ key });
  });

  app.get("/files/object/:key{.+}", async (c) => {
    if (!c.get("user")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const key = validateKey(c.req.param("key"));
    if (!key) {
      return c.json({ error: "Invalid key" }, 400);
    }

    const object = await storageFromEnv(c.env).get(key);
    if (!object) {
      return c.json({ error: "Not found" }, 404);
    }

    const headers = new Headers();
    headers.set("Content-Type", object.contentType ?? "application/octet-stream");
    if (typeof object.size === "number") {
      headers.set("Content-Length", String(object.size));
    }

    return new Response(object.body, { headers });
  });

  app.post("/files/presign", async (c) => {
    if (!c.get("user")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    let payload: { key?: unknown; downloadName?: unknown };
    try {
      payload = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const key = validateKey(typeof payload.key === "string" ? payload.key : undefined);
    if (!key) {
      return c.json({ error: "A valid key is required" }, 400);
    }

    const downloadName =
      typeof payload.downloadName === "string" && payload.downloadName.length > 0
        ? payload.downloadName
        : undefined;

    const url = await storageFromEnv(c.env).presignGet(key, { downloadName });

    return c.json({ url });
  });
}
