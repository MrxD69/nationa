import { createHash } from "node:crypto";

// Stable, deterministic UUIDs derived from a human-readable seed key so that
// re-running the seed keeps foreign-key references intact.
export function seedId(key: string): string {
  const hash = createHash("sha256").update(`nationa:seed:${key}`).digest("hex");

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join("-");
}
