import { APII_STEP_GUIDANCE } from "./apii";
import { DGI_DECLARATION_STEP_GUIDANCE } from "./dgi-declarations";
import { DGI_CONTRIBUTION_STEP_GUIDANCE } from "./dgi-contributions";
import { RNE_STEP_GUIDANCE } from "./rne";

/**
 * Curated guidance for steps whose seeded description is empty. The seed data is
 * not rewritten, so this is merged in whenever a step would otherwise render
 * with no explanation of how to do it.
 */
const STEP_GUIDANCE: Record<string, string> = {
  ...RNE_STEP_GUIDANCE,
  ...APII_STEP_GUIDANCE,
  ...DGI_DECLARATION_STEP_GUIDANCE,
  ...DGI_CONTRIBUTION_STEP_GUIDANCE,
};

export function stepGuidance(
  templateCode: string,
  stepCode: string,
  description: string | null | undefined,
): string {
  const stored = typeof description === "string" ? description.trim() : "";
  if (stored.length > 0) {
    return stored;
  }
  return STEP_GUIDANCE[`${templateCode}:${stepCode}`] ?? "";
}
