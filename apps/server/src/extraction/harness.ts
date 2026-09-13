import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

import type { DocumentKind } from "@nationa/api/domain/extraction";
import { extractStructuredDocument } from "@nationa/api/services/extraction";

const KINDS: DocumentKind[] = ["rne_extract", "cin", "invoice"];

function parseKind(value: string | undefined): DocumentKind {
  if (value && (KINDS as string[]).includes(value)) {
    return value as DocumentKind;
  }
  return "rne_extract";
}

function mimeTypeFor(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".pdf")) {
    return "application/pdf";
  }
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  return "application/octet-stream";
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("OPENROUTER_API_KEY is not set; cannot run the extraction harness.");
    process.exit(1);
  }

  const kind = parseKind(process.argv[2]);
  const filePath = resolve(process.argv[3] ?? "docs/rne.pdf");
  const bytes = new Uint8Array(await readFile(filePath));

  const openrouter = createOpenRouter({ apiKey });
  const model = openrouter(process.env.OPENROUTER_MODEL ?? "qwen/qwen3.7-flash");

  const result = await extractStructuredDocument({
    model,
    kind,
    bytes,
    mimeType: mimeTypeFor(filePath),
    fileName: basename(filePath),
  });

  console.log(JSON.stringify({ modelId: result.modelId, kind, object: result.object }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
