/**
 * Step descriptions in the catalogue are not always prose. Many of them are
 * checklists that were flattened into a single field with " · " between the
 * items — a few run past 900 characters — and rendering that as one paragraph
 * produces an unreadable wall of text.
 *
 * `parseChecklist` recovers the structure: an optional lead-in sentence (the
 * segment before the first separator, when it ends in a colon) followed by the
 * individual points. Anything that is genuine prose comes back with an empty
 * `items` list and must be rendered as a paragraph.
 */
export type Checklist = {
  lead: string | null;
  items: string[];
};

const SEPARATOR = "·";

/** Items arrive with the punctuation that joined them; drop it, keep the text. */
function tidy(value: string): string {
  return value
    .trim()
    .replace(/[;,.\s]+$/u, "")
    .trim();
}

export function parseChecklist(text: string | null | undefined): Checklist {
  const source = text?.trim() ?? "";
  if (!source || !source.includes(SEPARATOR)) {
    return { lead: source || null, items: [] };
  }

  const segments = source.split(SEPARATOR).map((segment) => segment.trim());
  const first = segments[0] ?? "";

  // "Avant le dépôt, vérifiez notamment : · l'exercice concerné ; · …"
  const hasLead = /[:：]$/u.test(first);
  const lead = hasLead ? first : null;
  const rest = hasLead ? segments.slice(1) : segments;

  const items = rest.map(tidy).filter((item) => item.length > 0);

  // A single point is a sentence, not a list.
  if (items.length < 2) {
    return { lead: source, items: [] };
  }

  return { lead, items };
}
