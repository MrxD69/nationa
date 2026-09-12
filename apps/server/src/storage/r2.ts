import { AwsClient } from "aws4fetch";

import type { StoragePort } from "@nationa/api/storage/port";

import { env as runtimeEnv, type ServerRuntimeEnv } from "../env.server";

export type R2StorageCredentials = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export type R2S3StorageOptions = R2StorageCredentials & {
  bucketName: string;
};

const DEFAULT_EXPIRES_IN_SECONDS = 60 * 60;
const MAX_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;

function clampExpiresIn(expiresIn: number | undefined): number {
  if (expiresIn === undefined || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    return DEFAULT_EXPIRES_IN_SECONDS;
  }
  return Math.min(Math.floor(expiresIn), MAX_EXPIRES_IN_SECONDS);
}

function encodeObjectPath(key: string): string {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function contentDisposition(downloadName: string): string {
  const safe = downloadName.replace(/[\r\n"\\]+/g, "_").trim() || "download";
  return `attachment; filename="${safe}"`;
}

function s3Client({ accessKeyId, secretAccessKey }: R2StorageCredentials): AwsClient {
  return new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

function objectUrl({ accountId }: R2StorageCredentials, bucketName: string, key: string): string {
  return `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${encodeObjectPath(key)}`;
}

async function signPresignGet(
  credentials: R2StorageCredentials,
  bucketName: string,
  key: string,
  opts?: { expiresIn?: number; downloadName?: string },
): Promise<string> {
  const expiresIn = clampExpiresIn(opts?.expiresIn);
  const url = new URL(objectUrl(credentials, bucketName, key));
  url.searchParams.set("X-Amz-Expires", String(expiresIn));
  if (opts?.downloadName) {
    url.searchParams.set("response-content-disposition", contentDisposition(opts.downloadName));
  }
  const signed = await s3Client(credentials).sign(url, { method: "GET", aws: { signQuery: true } });
  return signed.url;
}

export function credentialsFromRuntimeEnv(
  runtimeEnv: Pick<ServerRuntimeEnv, "R2_ACCOUNT_ID" | "R2_ACCESS_KEY_ID" | "R2_SECRET_ACCESS_KEY">,
): R2StorageCredentials | undefined {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = runtimeEnv;
  if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
    return {
      accountId: R2_ACCOUNT_ID,
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    };
  }
  return undefined;
}

export function createR2Storage(
  bucket: R2Bucket | undefined,
  bucketName: string,
  credentials?: R2StorageCredentials,
): StoragePort {
  function requireBucket(): R2Bucket {
    if (!bucket) {
      throw new Error("DOCUMENTS_BUCKET binding is not configured");
    }
    return bucket;
  }

  function requireCredentials(): R2StorageCredentials {
    const resolved = credentials ?? credentialsFromRuntimeEnv(runtimeEnv);
    if (!resolved) {
      throw new Error(
        "R2 S3 credentials are not configured (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)",
      );
    }
    return resolved;
  }

  return {
    bucket: bucketName,
    async put(key, body, opts) {
      await requireBucket().put(key, body, {
        httpMetadata: opts?.contentType ? { contentType: opts.contentType } : undefined,
      });
    },
    async get(key) {
      const object = await requireBucket().get(key);
      if (!object) {
        return null;
      }
      return {
        body: object.body,
        contentType: object.httpMetadata?.contentType,
        size: object.size,
      };
    },
    async delete(key) {
      await requireBucket().delete(key);
    },
    async presignGet(key, opts) {
      return signPresignGet(requireCredentials(), bucketName, key, opts);
    },
  };
}

export function createR2StorageFromS3(options: R2S3StorageOptions): StoragePort {
  const { bucketName } = options;
  const credentials: R2StorageCredentials = {
    accountId: options.accountId,
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey,
  };
  const client = s3Client(credentials);

  async function requireOk(response: Response, operation: string): Promise<Response> {
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `R2 ${operation} failed with status ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      );
    }
    return response;
  }

  return {
    bucket: bucketName,
    async put(key, body, opts) {
      const headers = new Headers();
      if (opts?.contentType) {
        headers.set("Content-Type", opts.contentType);
      }
      const response = await client.fetch(objectUrl(credentials, bucketName, key), {
        method: "PUT",
        body,
        headers,
      });
      await requireOk(response, "PUT");
    },
    async get(key) {
      const response = await client.fetch(objectUrl(credentials, bucketName, key), {
        method: "GET",
      });
      if (response.status === 404) {
        return null;
      }
      await requireOk(response, "GET");
      const contentType = response.headers.get("content-type") ?? undefined;
      const contentLength = response.headers.get("content-length");
      const size = contentLength === null ? undefined : Number(contentLength);
      return {
        body: response.body as ReadableStream,
        contentType,
        size: Number.isFinite(size) ? size : undefined,
      };
    },
    async delete(key) {
      const response = await client.fetch(objectUrl(credentials, bucketName, key), {
        method: "DELETE",
      });
      if (response.status === 404) {
        return;
      }
      await requireOk(response, "DELETE");
    },
    async presignGet(key, opts) {
      return signPresignGet(credentials, bucketName, key, opts);
    },
  };
}

function createUnconfiguredStorage(bucketName: string): StoragePort {
  function unconfigured(): never {
    throw new Error(
      "Object storage is not configured: provide the DOCUMENTS_BUCKET binding or R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY",
    );
  }
  return {
    bucket: bucketName,
    async put() {
      unconfigured();
    },
    async get() {
      unconfigured();
    },
    async delete() {
      unconfigured();
    },
    async presignGet() {
      unconfigured();
    },
  };
}

export function createStorageFromRuntimeEnv(runtimeEnv: ServerRuntimeEnv): StoragePort {
  const bucketName = runtimeEnv.R2_BUCKET_NAME ?? "documents";
  const credentials = credentialsFromRuntimeEnv(runtimeEnv);

  if (runtimeEnv.DOCUMENTS_BUCKET) {
    return createR2Storage(runtimeEnv.DOCUMENTS_BUCKET, bucketName, credentials);
  }
  if (credentials) {
    return createR2StorageFromS3({ ...credentials, bucketName });
  }
  return createUnconfiguredStorage(bucketName);
}
