import type { DocLang, DocumentTemplateDef, LocalizedText, TemplateBlock } from "./types";

export type RenderFieldValue = {
  key: string;
  valueText?: string | null;
  valueJsonb?: unknown;
  sourceKind?: string;
  citingKeys?: string[];
};

export type RenderCitation = {
  source: string;
  article?: string | null;
  titleFr?: string | null;
  titleAr?: string | null;
  url?: string | null;
};

export type RenderInput = {
  template: DocumentTemplateDef;
  language: DocLang;
  fields: Record<string, RenderFieldValue>;
  repeats?: Record<string, Array<Record<string, RenderFieldValue>>>;
  additionalClauses?: Array<{ title: string; text: string; citingKeys?: string[] }>;
  /** Citations keyed by concrete rule citation id (AI) or logical key (template). */
  citations?: Record<string, RenderCitation>;
  /** ISO timestamp recorded in the generated artifact. */
  generatedAt?: string;
};

const BLANK = "________________";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function localized(text: LocalizedText, language: DocLang): string {
  return language === "ar" ? text.ar : text.fr;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatAddress(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value.raw === "string" && value.raw.trim().length > 0) {
    return value.raw;
  }
  const parts: string[] = [];
  for (const locale of ["fr", "ar"] as const) {
    const block = value[locale];
    if (!isRecord(block)) {
      continue;
    }
    const chunk = [
      block.street,
      block.building,
      block.office,
      block.locality,
      block.postalCode,
      block.city,
      block.governorate,
      block.country,
    ]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .join(", ");
    if (chunk.length > 0) {
      parts.push(chunk);
    }
  }
  return parts.length > 0 ? parts.join(" — ") : null;
}

export function formatFieldValue(value: RenderFieldValue | undefined): string | null {
  if (!value) {
    return null;
  }
  if (typeof value.valueText === "string" && value.valueText.trim().length > 0) {
    return value.valueText.trim();
  }
  const jsonb = value.valueJsonb;
  if (jsonb === null || jsonb === undefined) {
    return null;
  }
  if (typeof jsonb === "string") {
    return jsonb.trim().length > 0 ? jsonb.trim() : null;
  }
  if (typeof jsonb === "number" || typeof jsonb === "boolean") {
    return String(jsonb);
  }
  const address = formatAddress(jsonb);
  if (address) {
    return address;
  }
  if (Array.isArray(jsonb)) {
    return jsonb
      .map((entry) => (typeof entry === "string" ? entry : JSON.stringify(entry)))
      .join(", ");
  }
  if (isRecord(jsonb)) {
    return JSON.stringify(jsonb);
  }
  return String(jsonb);
}

function citationLabel(citation: RenderCitation, language: DocLang): string {
  const title = language === "ar" ? citation.titleAr : citation.titleFr;
  const article = citation.article ? `art. ${citation.article}` : null;
  return [citation.source, article, title].filter(Boolean).join(" — ");
}

function renderCitationsHtml(
  keys: string[] | undefined,
  citations: Record<string, RenderCitation> | undefined,
  language: DocLang,
): string {
  if (!keys || keys.length === 0 || !citations) {
    return "";
  }
  const badges: string[] = [];
  for (const key of keys) {
    const citation = citations[key];
    if (!citation) {
      continue;
    }
    const label = escapeHtml(citationLabel(citation, language));
    const url = citation.url ? escapeHtml(citation.url) : null;
    badges.push(
      url
        ? `<a class="docgen-citation" href="${url}" rel="noopener noreferrer" target="_blank">${label}</a>`
        : `<span class="docgen-citation">${label}</span>`,
    );
  }
  if (badges.length === 0) {
    return "";
  }
  return `<ul class="docgen-citations">${badges.map((badge) => `<li>${badge}</li>`).join("")}</ul>`;
}

function renderFieldHtml(
  field: { key: string; label: LocalizedText },
  value: RenderFieldValue | undefined,
  citations: Record<string, RenderCitation> | undefined,
  language: DocLang,
): string {
  const label = escapeHtml(localized(field.label, language));
  const text = formatFieldValue(value);
  const sourceKind = value?.sourceKind ?? "blank";
  if (!text) {
    return `<p class="docgen-field"><span class="docgen-label">${label}</span> : <span class="docgen-blank" data-blank="true" data-key="${escapeHtml(
      field.key,
    )}">${BLANK}</span></p>`;
  }
  const citeKeys = sourceKind === "ai" ? (value?.citingKeys ?? []) : [];
  return `<p class="docgen-field"><span class="docgen-label">${label}</span> : <span class="docgen-value" data-source="${escapeHtml(
    sourceKind,
  )}" data-key="${escapeHtml(field.key)}">${escapeHtml(text)}</span>${renderCitationsHtml(
    citeKeys,
    citations,
    language,
  )}</p>`;
}

function renderFieldMarkdown(
  field: { key: string; label: LocalizedText },
  value: RenderFieldValue | undefined,
  language: DocLang,
): string {
  const label = localized(field.label, language);
  const text = formatFieldValue(value);
  if (!text) {
    return `**${label}:** ${BLANK}`;
  }
  return `**${label}:** ${text}`;
}

function renderBlockHtml(block: TemplateBlock, input: RenderInput): string {
  switch (block.type) {
    case "paragraph":
      return `<p>${escapeHtml(localized(block.text, input.language))}</p>`;
    case "clause": {
      const title = escapeHtml(localized(block.title, input.language));
      const text = escapeHtml(localized(block.text, input.language));
      const citations = renderCitationsHtml(block.citationKeys, input.citations, input.language);
      return `<div class="docgen-clause"><h3>${title}</h3><p>${text}</p>${citations}</div>`;
    }
    case "field":
      return renderFieldHtml(block, input.fields[block.key], input.citations, input.language);
    case "repeat": {
      const items = input.repeats?.[block.key] ?? [];
      const heading = `<h3>${escapeHtml(localized(block.title, input.language))}</h3>`;
      if (items.length === 0) {
        return `<div class="docgen-repeat">${heading}<p class="docgen-blank" data-blank="true">${BLANK}</p></div>`;
      }
      const rendered = items
        .map((item, index) => {
          const fields = block.fields
            .map((field) =>
              renderFieldHtml(field, item[field.key], input.citations, input.language),
            )
            .join("");
          const label = escapeHtml(`${localized(block.itemLabel, input.language)} ${index + 1}`);
          return `<div class="docgen-repeat-item"><h4>${label}</h4>${fields}</div>`;
        })
        .join("");
      return `<div class="docgen-repeat">${heading}${rendered}</div>`;
    }
    case "signature": {
      const label = escapeHtml(localized(block.label, input.language));
      const role = block.role ? escapeHtml(localized(block.role, input.language)) : "";
      return `<div class="docgen-signature"><p>${label}</p>${
        role ? `<p class="docgen-signature-role">${role}</p>` : ""
      }<p class="docgen-signature-line">______________________</p></div>`;
    }
  }
}

function renderBlockMarkdown(block: TemplateBlock, input: RenderInput): string {
  switch (block.type) {
    case "paragraph":
      return localized(block.text, input.language);
    case "clause":
      return `### ${localized(block.title, input.language)}\n\n${localized(block.text, input.language)}`;
    case "field":
      return renderFieldMarkdown(block, input.fields[block.key], input.language);
    case "repeat": {
      const items = input.repeats?.[block.key] ?? [];
      const lines = [`### ${localized(block.title, input.language)}`];
      if (items.length === 0) {
        lines.push(BLANK);
        return lines.join("\n\n");
      }
      items.forEach((item, index) => {
        lines.push(`#### ${localized(block.itemLabel, input.language)} ${index + 1}`);
        for (const field of block.fields) {
          lines.push(renderFieldMarkdown(field, item[field.key], input.language));
        }
      });
      return lines.join("\n\n");
    }
    case "signature":
      return `${localized(block.label, input.language)}\n\n______________________`;
  }
}

export function renderDocument(input: RenderInput): { markdown: string; html: string } {
  const htmlParts: string[] = [];
  const mdParts: string[] = [`# ${localized(input.template.title, input.language)}`];

  for (const section of input.template.sections) {
    htmlParts.push(
      `<section class="docgen-section"><h2>${escapeHtml(
        localized(section.title, input.language),
      )}</h2>${section.blocks.map((block) => renderBlockHtml(block, input)).join("")}</section>`,
    );
    mdParts.push(`## ${localized(section.title, input.language)}`);
    mdParts.push(section.blocks.map((block) => renderBlockMarkdown(block, input)).join("\n\n"));
  }

  if (input.additionalClauses && input.additionalClauses.length > 0) {
    htmlParts.push(
      `<section class="docgen-section docgen-additional"><h2>${escapeHtml(
        input.language === "ar" ? "أحكام إضافية" : "Clauses complémentaires",
      )}</h2>${input.additionalClauses
        .map(
          (clause) =>
            `<div class="docgen-clause"><h3>${escapeHtml(clause.title)}</h3><p>${escapeHtml(
              clause.text,
            )}</p>${renderCitationsHtml(clause.citingKeys, input.citations, input.language)}</div>`,
        )
        .join("")}</section>`,
    );
    mdParts.push(`## ${input.language === "ar" ? "أحكام إضافية" : "Clauses complémentaires"}`);
    mdParts.push(
      input.additionalClauses.map((clause) => `### ${clause.title}\n\n${clause.text}`).join("\n\n"),
    );
  }

  if (input.generatedAt) {
    htmlParts.push(
      `<footer class="docgen-footer"><p>${escapeHtml(input.generatedAt)}</p></footer>`,
    );
  }

  return { markdown: mdParts.join("\n\n"), html: htmlParts.join("\n") };
}

export function wrapHtmlDocument(
  fragment: string,
  options: { language: DocLang; title: string },
): string {
  const dir = options.language === "ar" ? "rtl" : "ltr";
  return `<!doctype html>
<html lang="${options.language}" dir="${dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(options.title)}</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; padding: 2.5rem; font-family: "Inter", "Noto Naskh Arabic", "Segoe UI", system-ui, sans-serif; line-height: 1.7; color: #0f172a; }
  h1 { font-size: 1.5rem; text-align: center; margin-bottom: 2rem; }
  h2 { font-size: 1.15rem; margin-top: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.35rem; }
  h3 { font-size: 1rem; margin-top: 1.25rem; }
  .docgen-label { font-weight: 600; }
  .docgen-blank { color: #64748b; letter-spacing: 0.08em; }
  .docgen-value[data-source="ai"] { background: #eef2ff; border-bottom: 1px solid #6366f1; padding: 0 0.15rem; }
  .docgen-citations { list-style: none; margin: 0.35rem 0 0; padding: 0; font-size: 0.8rem; color: #475569; }
  .docgen-signature { margin-top: 3rem; }
  .docgen-signature-line { letter-spacing: 0.1em; }
  .docgen-footer { margin-top: 3rem; font-size: 0.75rem; color: #94a3b8; text-align: end; }
</style>
</head>
<body dir="${dir}">
${fragment}
</body>
</html>`;
}
