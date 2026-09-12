import { pgEnum } from "drizzle-orm/pg-core";

// Shared across `cases` (case_field_values.source_kind) and `provenance`
// (field_provenance.source_kind). Kept in a dependency-free module so the
// durable circular graph between cases <-> provenance <-> ai stays safe.
export const fieldSourceKindEnum = pgEnum("field_source_kind", [
  "user",
  "document",
  "ai",
  "import",
  "system",
]);
